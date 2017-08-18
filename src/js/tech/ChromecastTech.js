'use strict';

var ChromecastSessionManager = require('../chromecast/ChromecastSessionManager'),
    ChromecastTechUI = require('./ChromecastTechUI'),
    _ = require('underscore'),
    SESSION_TIMEOUT = 10 * 1000, // milliseconds
    ChromecastTech;


ChromecastTech = {
   constructor: function(options) {
      var subclass;

      this._eventListeners = [];

      this.videojsPlayer = this.videojs(options.playerId);
      this._chromecastSessionManager = this.videojsPlayer.chromecastSessionManager;

      // We have to initialize the UI here, before calling super.constructor
      // because the constructor calls `createEl`, which references `this._ui`.
      this._ui = new ChromecastTechUI();
      this._ui.updatePoster(this.videojsPlayer.poster());

      // Call the super class' constructor function
      subclass = this.constructor.super_.apply(this, arguments);

      this._remotePlayer = this._chromecastSessionManager.getRemotePlayer();
      this._remotePlayerController = this._chromecastSessionManager.getRemotePlayerController();
      this._listenToPlayerControllerEvents();
      this.on('dispose', this._removeAllEventListeners.bind(this));

      this._hasPlayedAnyItem = false;
      this._requestTitle = options.requestTitleFn || _.noop;
      this._requestSubtitle = options.requestSubtitleFn || _.noop;
      // See `currentTime` function
      this._initialStartTime = options.startTime || 0;

      this._playSource(options.source, this._initialStartTime);
      this.ready(function() {
         this.setMuted(options.muted);
      }.bind(this));

      return subclass;
   },

   createEl: function() {
      return this._ui.getDOMElement();
   },

   play: function() {
      if (!this.paused()) {
         return;
      }
      if (this.ended() && !this._isMediaLoading) {
         // Restart the current item from the beginning
         this._playSource({ src: this.videojsPlayer.src() }, 0);
      } else {
         this._remotePlayerController.playOrPause();
      }
   },

   pause: function() {
      if (!this.paused() && this._remotePlayer.canPause) {
         this._remotePlayerController.playOrPause();
      }
   },

   paused: function() {
      return this._remotePlayer.isPaused || this.ended();
   },

   setSource: function(source) {
      if (this._currentSource && this._currentSource.src === source.src && this._currentSource.type === source.type) {
         // Skip setting the source if the `source` argument is the same as what's already
         // been set. This `setSource` function calls `this._playSource` which sends a
         // "load media" request to the Chromecast PlayerController. Because this function
         // may be called multiple times in rapid succession with the same `source`
         // argument, we need to de-duplicate calls with the same `source` argument to
         // prevent overwhelming the Chromecast PlayerController with expensive "load
         // media" requests, which it itself does not de-duplicate.
         return;
      }
      // We cannot use `this.videojsPlayer.currentSource()` because the value returned by
      // that function is not the same as what's returned by the Video.js Player's
      // middleware after they are run. Also, simply using `this.videojsPlayer.src()`
      // does not include mimetype information which we pass to the Chromecast player.
      this._currentSource = source;
      this._playSource(source, 0);
   },

   _playSource: function(source, startTime) {
      var castSession = this._getCastSession(),
          mediaInfo = new chrome.cast.media.MediaInfo(source.src, source.type),
          title = this._requestTitle(source),
          subtitle = this._requestSubtitle(source),
          request;

      this.trigger('waiting');
      this._clearSessionTimeout();

      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.metadataType = chrome.cast.media.MetadataType.GENERIC;
      mediaInfo.metadata.title = title;
      mediaInfo.metadata.subtitle = subtitle;

      this._ui.updateTitle(title);
      this._ui.updateSubtitle(subtitle);

      request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;
      request.currentTime = startTime;

      this._isMediaLoading = true;
      castSession.loadMedia(request)
         .then(function() {
            if (!this._hasPlayedAnyItem) {
               // `triggerReady` is required here to notify the Video.js player that the
               // Tech has been initialized and is ready.
               this.triggerReady();
            }
            this.trigger('loadstart');
            this.trigger('loadeddata');
            this.trigger('play');
            this.trigger('playing');
            this._hasPlayedAnyItem = true;
            this._isMediaLoading = false;
         }.bind(this), this._triggerErrorEvent.bind(this));
   },

   setCurrentTime: function(time) {
      var duration = this.duration();

      if (time > duration || !this._remotePlayer.canSeek) {
         return;
      }
      // Seeking to any place within (approximately) 1 second of the end of the item
      // causes the Video.js player to get stuck in a BUFFERING state. To work around
      // this, we only allow seeking to within 1 second of the end of an item.
      this._remotePlayer.currentTime = Math.min(duration - 1, time);
      this._remotePlayerController.seek();
      this._triggerTimeUpdateEvent();
   },

   currentTime: function() {
      // There is a brief period of time when Video.js has switched to the chromecast
      // Tech, but chromecast has not yet loaded its first media item. During that time,
      // Video.js calls this `currentTime` function to update its player UI. In that
      // period, `this._remotePlayer.currentTime` will be 0 because the media has not
      // loaded yet. To prevent the UI from using a 0 second currentTime, we use the
      // currentTime passed in to the first media item that was provided to the Tech until
      // chromecast plays its first item.
      if (!this._hasPlayedAnyItem) {
         return this._initialStartTime;
      }
      return this._remotePlayer.currentTime;
   },

   duration: function() {
      // There is a brief period of time when Video.js has switched to the chromecast
      // Tech, but chromecast has not yet loaded its first media item. During that time,
      // Video.js calls this `duration` function to update its player UI. In that period,
      // `this._remotePlayer.duration` will be 0 because the media has not loaded yet. To
      // prevent the UI from using a 0 second duration, we use the duration passed in to
      // the first media item that was provided to the Tech until chromecast plays its
      // first item.
      if (!this._hasPlayedAnyItem) {
         return this.videojsPlayer.duration();
      }
      return this._remotePlayer.duration;
   },

   ended: function() {
      var mediaSession = this._getMediaSession();

      return mediaSession ? (mediaSession.idleReason === chrome.cast.media.IdleReason.FINISHED) : false;
   },

   volume: function() {
      return this._remotePlayer.volumeLevel;
   },

   setVolume: function(volumeLevel) {
      this._remotePlayer.volumeLevel = volumeLevel;
      this._remotePlayerController.setVolumeLevel();
      // This event is triggered by the listener on
      // `RemotePlayerEventType.VOLUME_LEVEL_CHANGED`, but waiting for that event to fire
      // in response to calls to `setVolume` introduces noticeable lag in the updating of
      // the player UI's volume slider bar, which makes user interaction with the volume
      // slider choppy.
      this._triggerVolumeChangeEvent();
   },

   muted: function() {
      return this._remotePlayer.isMuted;
   },

   setMuted: function(isMuted) {
      if ((this._remotePlayer.isMuted && !isMuted) || (!this._remotePlayer.isMuted && isMuted)) {
         this._remotePlayerController.muteOrUnmute();
      }
   },

   poster: function() {
      return this._ui.getPoster();
   },

   setPoster: function(poster) {
      this._ui.updatePoster(poster);
   },

   buffered: function() {
      // A `buffered` function is required, but at this time we cannot implement it
      // because the chromecast APIs do not provide a way for us to determine how much the
      // media item has buffered. Returning `undefined` is safe: the player will simply
      // not display the buffer amount indicator in the scrubber UI.
      return undefined;
   },

   controls: function() {
      return false;
   },

   playsinline: function() {
      // Tells Video.js to keep the player UI inline while playing
      return true;
   },

   supportsFullscreen: function() {
      return true;
   },

   setAutoplay: function() {
      // Not supported
   },

   load: function() {
      // Not supported
   },

   _listenToPlayerControllerEvents: function() {
      var eventTypes = cast.framework.RemotePlayerEventType;

      this._addEventListener(this._remotePlayerController, eventTypes.PLAYER_STATE_CHANGED, this._onPlayerStateChanged, this);
      this._addEventListener(this._remotePlayerController, eventTypes.VOLUME_LEVEL_CHANGED, this._triggerVolumeChangeEvent, this);
      this._addEventListener(this._remotePlayerController, eventTypes.IS_MUTED_CHANGED, this._triggerVolumeChangeEvent, this);
      this._addEventListener(this._remotePlayerController, eventTypes.CURRENT_TIME_CHANGED, this._triggerTimeUpdateEvent, this);
      this._addEventListener(this._remotePlayerController, eventTypes.DURATION_CHANGED, this._triggerDurationChangeEvent, this);
   },

   _addEventListener: function(target, type, callback, context) {
      var listener;

      listener = {
         target: target,
         type: type,
         callback: callback,
         context: context,
         listener: callback.bind(context),
      };
      target.addEventListener(type, listener.listener);
      this._eventListeners.push(listener);
   },

   _removeAllEventListeners: function() {
      while (this._eventListeners.length > 0) {
         this._removeEventListener(this._eventListeners[0]);
      }
      this._eventListeners = [];
   },

   _removeEventListener: function(listener) {
      var index;

      listener.target.removeEventListener(listener.type, listener.listener);

      index = _.findIndex(this._eventListeners, function(registeredListener) {
         return registeredListener.target === listener.target &&
            registeredListener.type === listener.type &&
            registeredListener.callback === listener.callback &&
            registeredListener.context === listener.context;
      });

      if (index !== -1) {
         this._eventListeners.splice(index, 1);
      }
   },

   _onPlayerStateChanged: function() {
      var states = chrome.cast.media.PlayerState,
          playerState = this._remotePlayer.playerState;

      if (playerState === states.PLAYING) {
         this.trigger('play');
         this.trigger('playing');
      } else if (playerState === states.PAUSED) {
         this.trigger('pause');
      } else if (playerState === states.IDLE && this.ended()) {
         this._closeSessionOnTimeout();
         this.trigger('ended');
         this._triggerTimeUpdateEvent();
      } else if (playerState === states.BUFFERING) {
         this.trigger('waiting');
      }
   },

   _closeSessionOnTimeout: function() {
      // Ensure that there's never more than one session timeout active
      this._clearSessionTimeout();
      this._sessionTimeoutID = setTimeout(function() {
         var castSession = this._getCastSession();

         if (castSession) {
            castSession.endSession(true);
         }
         this._clearSessionTimeout();
      }.bind(this), SESSION_TIMEOUT);
   },

   _clearSessionTimeout: function() {
      if (this._sessionTimeoutID) {
         clearTimeout(this._sessionTimeoutID);
         this._sessionTimeoutID = false;
      }
   },

   _getCastContext: function() {
      return this._chromecastSessionManager.getCastContext();
   },

   _getCastSession: function() {
      return this._getCastContext().getCurrentSession();
   },

   _getMediaSession: function() {
      var castSession = this._getCastSession();

      return castSession ? castSession.getMediaSession() : null;
   },

   _triggerVolumeChangeEvent: function() {
      this.trigger('volumechange');
   },

   _triggerTimeUpdateEvent: function() {
      this.trigger('timeupdate');
   },

   _triggerDurationChangeEvent: function() {
      this.trigger('durationchange');
   },

   _triggerErrorEvent: function() {
      this.trigger('error');
   },
};

module.exports = function(videojs) {
   var Tech = videojs.getComponent('Tech'),
       ChromecastTechImpl;

   ChromecastTechImpl = videojs.extend(Tech, ChromecastTech);

   // Required for Video.js Tech implementations.
   // TODO Consider a more comprehensive check based on mimetype.
   ChromecastTechImpl.canPlaySource = ChromecastSessionManager.isChromecastConnected.bind(ChromecastSessionManager);
   ChromecastTechImpl.isSupported = ChromecastSessionManager.isChromecastConnected.bind(ChromecastSessionManager);

   ChromecastTechImpl.prototype.featuresVolumeControl = true;
   ChromecastTechImpl.prototype.featuresPlaybackRate = false;
   ChromecastTechImpl.prototype.movingMediaElementInDOM = false;
   ChromecastTechImpl.prototype.featuresFullscreenResize = true;
   ChromecastTechImpl.prototype.featuresTimeupdateEvents = true;
   ChromecastTechImpl.prototype.featuresProgressEvents = false;
   // Text tracks are not supported in this version
   ChromecastTechImpl.prototype.featuresNativeTextTracks = false;
   ChromecastTechImpl.prototype.featuresNativeAudioTracks = false;
   ChromecastTechImpl.prototype.featuresNativeVideoTracks = false;

   // Give ChromecastTech class instances a reference to videojs
   ChromecastTechImpl.prototype.videojs = videojs;

   videojs.registerTech('chromecast', ChromecastTechImpl);
};
