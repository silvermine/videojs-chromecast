/* eslint-disable global-require */
'use strict';

var createChromecastButton = require('./components/ChromecastButton'),
    createChromecastTech = require('./tech/ChromecastTech'),
    enableChromecast = require('./enableChromecast');

/**
 * @module index
 */

/**
 * Registers the Chromecast plugin and ChromecastButton Component with Video.js. See
 * {@link module:ChromecastButton} and {@link module:enableChromecast} for more details
 * about how the plugin and button are registered and configured.
 *
 * @param {object} videojs
 * @see module:enableChromecast
 * @see module:ChromecastButton
 */
module.exports = function(videojs) {
   videojs = videojs || window.videojs;
   createChromecastButton(videojs);
   createChromecastTech(videojs);
   enableChromecast(videojs);
};
