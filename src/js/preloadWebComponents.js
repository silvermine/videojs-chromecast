'use strict';

var _ = require('underscore');

function doesUserAgentContainString(str) {
   return _.isString(window.navigator.userAgent) && window.navigator.userAgent.indexOf(str) >= 0;
}

// For information as to why this is needed, please see:
// https://github.com/silvermine/videojs-chromecast/issues/17

module.exports = function() {
   var needsWebComponents = !document.registerElement,
       iosChrome = doesUserAgentContainString('CriOS'),
       androidChrome;

   androidChrome = doesUserAgentContainString('Android')
      && doesUserAgentContainString('Chrome/')
      && window.navigator.presentation;

   // These checks are based on the checks found in `cast_sender.js` which
   // determine if `cast_framework.js` needs to be loaded
   if ((androidChrome || iosChrome) && needsWebComponents) {
      // This is requiring webcomponents.js@0.7.24 because that's what was used
      // by the Chromecast framework at the time this was added.
      require('webcomponents.js'); // eslint-disable-line global-require
   }
};
