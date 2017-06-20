'use strict';

var ChromecastButton;

ChromecastButton = {
   constructor: function(player, options) {
      // TODO internationalization
      this._buttonText = options.buttonText || 'Chromecast';
      this.constructor.super_.apply(this, arguments);
   },

   createControlTextEl: function(el) {
      var textEl = document.createElement('span');

      textEl.innerHTML = this._buttonText;
      textEl.className = 'vjs-control-text';

      el.appendChild(textEl);
   },

   buildCSSClass: function() {
      return 'vjs-chromecast-button ' + this.constructor.super_.prototype.buildCSSClass();
   },

   handleClick: function() {
      this.player().trigger('chromecastRequested');
   },
};

module.exports = function(videojs) {
   var ChromecastButtonImpl;

   ChromecastButtonImpl = videojs.extend(videojs.getComponent('Button'), ChromecastButton);
   videojs.registerComponent('chromecastButton', ChromecastButtonImpl);
};
