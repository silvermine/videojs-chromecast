'use strict';

/**
 * @module enableChromecast
 */

var ChromecastSessionManager = require('./chromecast/ChromecastSessionManager'),
    CHECK_AVAILABILITY_INTERVAL = 1000, // milliseconds
    CHECK_AVAILABILITY_TIMEOUT = 30 * 1000; // milliseconds


/**
 * Configures the Chromecast
 * [casting context](https://developers.google.com/cast/docs/reference/chrome/cast.framework.CastContext),
 * which is required before casting.
 *
 * @private
 * @param options {object} the plugin options
 */
function configureCastContext(options) {
   var context = cast.framework.CastContext.getInstance();

   context.setOptions({
      receiverApplicationId: options.receiverAppID || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      // Setting autoJoinPolicy to ORIGIN_SCOPED prevents this plugin from automatically
      // trying to connect to a preexisting Chromecast session, if one exists. The user
      // must end any existing session before trying to cast from this player instance.
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
   });
}

/**
 * Handles the `chromecastRequested` event. Delegates to a `chromecastSessionManager`
 * instance.
 *
 * @private
 * @param player {object} a Video.js player instance
 */
function onChromecastRequested(player) {
   player.chromecastSessionManager.openCastMenu();
}

/**
 * Adds the Chromecast button to the player's control bar, if one does not already exist,
 * then starts listening for the `chromecastRequested` event.
 *
 * @private
 * @param player {object} a Video.js player instance
 * @param options {object} the plugin options
 */
function setUpChromecastButton(player, options) {
   // Ensure Chromecast button exists
   if (!player.controlBar.getChild('chromecastButton')) {
      player.controlBar.addChild('chromecastButton', options);
   }
   // Respond to requests for casting. The ChromecastButton component triggers this event
   // when the user clicks the Chromecast button.
   player.on('chromecastRequested', onChromecastRequested.bind(null, player));
}

/**
 * Creates a {@link ChromecastSessionManager} and assigns it to the player.
 *
 * @private
 * @param player {object} a Video.js player instance
 */
function createSessionManager(player) {
   if (!player.chromecastSessionManager) {
      player.chromecastSessionManager = new ChromecastSessionManager(player);
   }
}

/**
 * Sets up and configures the casting context and Chromecast button.
 *
 * @private
 * @param options {object} the plugin options
 */
function enableChromecast(player, options) {
   configureCastContext(options);
   createSessionManager(player);
   setUpChromecastButton(player, options);
}

/**
 * Waits for the Chromecast APIs to become available, then configures the casting context
 * and configures the Chromecast button. The Chromecast APIs are loaded asynchronously,
 * so we must wait until they are available before initializing the casting context and
 * Chromecast button.
 *
 * @private
 * @param player {object} a Video.js player instance
 * @param options {object} the plugin options
 */
function waitUntilChromecastAPIsAreAvailable(player, options) {
   var maxTries = CHECK_AVAILABILITY_TIMEOUT / CHECK_AVAILABILITY_INTERVAL,
       tries = 1,
       intervalID;

   // The Chromecast APIs are loaded asynchronously, so they may not be loaded and
   // initialized at this point. The Chromecast APIs do provide a callback function that
   // is called after the framework has loaded, but it requires you to define the callback
   // function **before** loading the APIs. That would require us to expose some callback
   // function to `window` here, and would require users of this plugin to define a
   // Chromecast API callback on `window` that calls our callback function in their HTML
   // file. To avoid all of this, we simply check to see if the Chromecast API is
   // available periodically, and stop after a timeout threshold has passed.
   //
   // See https://developers.google.com/cast/docs/chrome_sender_integrate#initialization
   intervalID = setInterval(function() {
      if (tries > maxTries) {
         clearInterval(intervalID);
         return;
      }
      if (ChromecastSessionManager.isChromecastAPIAvailable()) {
         clearInterval(intervalID);
         enableChromecast(player, options);
      }
      tries = tries + 1;
   }, CHECK_AVAILABILITY_INTERVAL);

}

/**
 * Registers the Chromecast plugin with Video.js. Calls
 * [videojs#registerPlugin](http://docs.videojs.com/module-videojs.html#~registerPlugin),
 * which will add a plugin function called `chromecast` to any instance of a Video.js
 * player that is created after calling this function. Call `player.chromecast(options)`,
 * passing in configuration options, to enable the Chromecast plugin on your Player
 * instance.
 *
 * Currently, there are only two configuration options:
 *
 *    * **`buttonText`** - the text to display inside of the button component. By default,
 *      this text is hidden and is used for accessibility purposes. Defaults to
 *      "Chromecast".
 *    * **`receiverAppID`** - the string ID of a [Chromecast receiver
 *      app](https://developers.google.com/cast/docs/receiver_apps) to use. Defaults to
 *      the [default Media Receiver
 *      ID](https://developers.google.com/cast/docs/receiver_apps#default).
 *
 * Other configuration options are set through the player's Chromecast Tech configuration:
 *
 * ```
 * var playerOptions, player, pluginOptions;
 *
 * playerOptions = {
 *    chromecast: {
 *       requestTitleFn: function(source) {
 *          return titles[source.url];
 *       },
 *       requestSubtitleFn: function(source) {
 *          return subtitles[source.url];
 *       }
 *    }
 * };
 *
 * pluginOptions = {
 *    buttonText: 'Chromecast',
 *    receiverAppID: '1234'
 * };
 *
 * player = videojs(document.getElementById('myVideoElement'), playerOptions);
 * player.chromecast(pluginOptions); // initializes the Chromecast plugin
 * ```
 *
 * @param {object} videojs
 * @see http://docs.videojs.com/module-videojs.html#~registerPlugin
 */
module.exports = function(videojs) {
   videojs.registerPlugin('chromecast', function(options) {
      options = options || {};

      // `this` is an instance of a Video.js Player.
      // Wait until the player is "ready" so that the player's control bar component has
      // been created.
      this.ready(function() {
         if (!this.controlBar) {
            return;
         }
         if (ChromecastSessionManager.isChromecastAPIAvailable()) {
            enableChromecast(this, options);
         } else {
            waitUntilChromecastAPIsAreAvailable(this, options);
         }
      }.bind(this));
   });
};
