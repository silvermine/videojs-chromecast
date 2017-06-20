/* eslint-disable global-require */
'use strict';

module.exports = function(videojs) {
   require('./components/ChromecastButton')(videojs);
   require('./tech/ChromecastTech')(videojs);
   require('./enableChromecast')(videojs);
};
