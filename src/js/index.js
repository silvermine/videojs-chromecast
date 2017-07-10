/* eslint-disable global-require */
'use strict';

var createChromecastButton = require('./components/ChromecastButton'),
    createChromecastTech = require('./tech/ChromecastTech'),
    enableChromecast = require('./enableChromecast');

module.exports = function(videojs) {
   videojs = videojs || window.videojs;
   createChromecastButton(videojs);
   createChromecastTech(videojs);
   enableChromecast(videojs);
};
