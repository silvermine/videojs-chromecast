'use strict';

var Class = require('class.extend'),
    _ = require('underscore'),
    hasConnected = false, // See the `isChromecastConnected` function.
    ChromecastSessionManager;

function getCastContext() {
   return cast.framework.CastContext.getInstance();
}

ChromecastSessionManager = Class.extend({
   init: function(player, options) {
      this.player = player;
      this.options = options || {};
      this._configureCastContext();
   },

   _configureCastContext: function() {
      var stateChangedEvent = cast.framework.CastContextEventType.SESSION_STATE_CHANGED;

      this.getCastContext().addEventListener(stateChangedEvent, function(event) {
         if (event.sessionState === cast.framework.SessionState.SESSION_ENDED) {
            this._reloadTech();
         }
      }.bind(this));

      // We must create these objects here, after setting the options on the cast context
      // (see the `configureCastContext` function in enableChromecast.js) but before
      // requesting a session or loading media. For an undocumented (and thus unknown)
      // reason, RemotePlayer and RemotePlayerController instances created later (for
      // example, right after successfully creating and connecting to a session, in the
      // `openCastMenu` function) will not stay in sync with media items that are loaded
      // later.
      //
      // For example, the first item that you cast will work as expected: events on
      // RemotePlayerController will fire and the state (currentTime, duration, etc) of
      // the RemotePlayer instance will update as the media item plays. However, if a new
      // media item is loaded via a `loadMedia` request, the media item will play, but the
      // remotePlayer will be in a "media unloaded" state where the duration is 0, the
      // currentTime does not update, and no change events are fired (except, strangely,
      // displayStatus updates).
      this.remotePlayer = new cast.framework.RemotePlayer();
      this.remotePlayerController = new cast.framework.RemotePlayerController(this.remotePlayer);
   },

   openCastMenu: function() {
      var onSessionSuccess;

      if (!this.player.currentSource()) {
         // Do not cast if there is no media item loaded in the player
         return;
      }
      onSessionSuccess = function() {
         hasConnected = true;
         this._reloadTech();
      }.bind(this);

      // It is the `requestSession` function call that actually causes the cast menu to
      // open.
      // The second parameter to `.then` is an error handler. We use _.noop here
      // because we handle errors in the ChromecastTech class and we do not want an
      // error to bubble up to the console. This error handler is also triggered when
      // the user closes out of the chromecast selector pop-up without choosing a
      // casting destination.
      this.getCastContext().requestSession()
         .then(onSessionSuccess, _.noop);
   },

   _reloadTech: function() {
      var player = this.player,
          currentTime = player.currentTime(),
          wasPaused = player.paused(),
          sources = player.currentSources();

      // Reload the current source(s) to re-lookup and use the currently available Tech.
      // The chromecast Tech gets used if `ChromecastSessionManager.isChromecastConnected`
      // is true (effectively, if a chromecast session is currently in progress),
      // otherwise Video.js continues to search through the Tech list for other eligible
      // Tech to use, such as the HTML5 player.
      player.src(sources);

      player.ready(function() {
         if (wasPaused) {
            player.pause();
         } else {
            player.play();
         }
         player.currentTime(currentTime || 0);
      });
   },

   getCastContext: getCastContext,

   getRemotePlayer: function() {
      return this.remotePlayer;
   },

   getRemotePlayerController: function() {
      return this.remotePlayerController;
   },
});

ChromecastSessionManager.isChromecastAPIAvailable = function() {
   return window.chrome && window.chrome.cast && window.cast;
};

ChromecastSessionManager.isChromecastConnected = function() {
   // We must also check the `hasConnected` flag because
   // `getCastContext().getCastState()` returns `CONNECTED` even when the current casting
   // session was initiated by another tab in the browser or by another process.
   return ChromecastSessionManager.isChromecastAPIAvailable() &&
      (getCastContext().getCastState() === cast.framework.CastState.CONNECTED) &&
      hasConnected;
};

module.exports = ChromecastSessionManager;
