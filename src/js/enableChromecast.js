'use strict';

var ChromecastSessionManager = require('./chromecast/ChromecastSessionManager'),
    CHECK_AVAILABILITY_INTERVAL = 1000, // milliseconds
    CHECK_AVAILABILITY_TIMEOUT = 30 * 1000; // milliseconds

function configureCastContext(options) {
   var context = cast.framework.CastContext.getInstance();

   context.setOptions({
      receiverApplicationId: options.receiverAppID || chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      // Setting autoJoinPolicy to ORIGIN_SCOPED prevents this plugin from automatically
      // trying to connect to a preexisting chromecast session, if one exists. The user
      // must end any existing session before trying to cast from this player instance.
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
   });
}

function onChromecastRequested(player, options) {
   if (!player.chromecastSessionManager) {
      player.chromecastSessionManager = new ChromecastSessionManager(player, options);
   }
   player.chromecastSessionManager.openCastMenu();
}

function setUpChromecastButton(player, options) {
   // Ensure chromecast button exists
   if (!player.controlBar.getChild('chromecastButton')) {
      player.controlBar.addChild('chromecastButton', options);
   }
   // Respond to requests for casting. The ChromecastButton component triggers this event
   // when the user clicks the chromecast button.
   player.on('chromecastRequested', onChromecastRequested.bind(null, player, options));
}

function waitUntilChromecastAPIsAreAvailable(player, options) {
   var maxTries = CHECK_AVAILABILITY_TIMEOUT / CHECK_AVAILABILITY_INTERVAL,
       tries = 1,
       intervalID;

   // The chromecast APIs are loaded asynchronously, so they may not be loaded and
   // initialized at this point. The chromecast APIs do provide a callback function that
   // is called after the framework has loaded, but it requires you to define the callback
   // function **before** loading the APIs. That would require us to expose some callback
   // function to `window` here, and would require users of this plugin to define a
   // chromecast API callback on `window` that calls our callback function in their HTML
   // file. To avoid all of this, we simply check check to see if the chromecast API is
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
         configureCastContext(options);
         setUpChromecastButton(player, options);
      }
      tries = tries + 1;
   }, CHECK_AVAILABILITY_INTERVAL);

}

function enableChromecast(options) {
   if (!this.controlBar) {
      return;
   }

   if (ChromecastSessionManager.isChromecastAPIAvailable()) {
      configureCastContext(options);
      setUpChromecastButton(this, options);
   } else {
      waitUntilChromecastAPIsAreAvailable(this, options);
   }
}

module.exports = function(videojs) {
   videojs.registerPlugin('chromecast', function(options) {
      // `this` is an instance of a Video.js Player.
      // Wait until the player is "ready" so that the player's control bar component has
      // been created.
      this.ready(enableChromecast.bind(this, options || {}));
   });
};
