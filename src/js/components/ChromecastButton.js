'use strict';

var ChromecastButton;

ChromecastButton = {
   constructor: function(player, options) {
      // TODO internationalization
      this._buttonText = options.buttonText || 'Chromecast';
      this.constructor.super_.apply(this, arguments);

      player.on('chromecastConnected', this._onChromecastConnected.bind(this));
      player.on('chromecastDisconnected', this._onChromecastDisconnected.bind(this));
   },

   createControlTextEl: function(el) {
      var textEl = document.createElement('span');

      textEl.innerHTML = this._buttonText;
      textEl.className = 'vjs-control-text';

      el.appendChild(textEl);
   },

   buildCSSClass: function() {
      return 'vjs-chromecast-button ' + (this._isChromecastConnected ? 'vjs-chromecast-casting-state ' : '') +
         this.constructor.super_.prototype.buildCSSClass();
   },

   handleClick: function() {
      this.player().trigger('chromecastRequested');
   },

   _onChromecastConnected: function() {
      this._isChromecastConnected = true;
      this._reloadCSSClasses();
   },

   _onChromecastDisconnected: function() {
      this._isChromecastConnected = false;
      this._reloadCSSClasses();
   },

   _reloadCSSClasses: function() {
      if (!this.el_) {
         return;
      }
      this.el_.className = this.buildCSSClass();
   },
};

module.exports = function(videojs) {
   var ChromecastButtonImpl;

   ChromecastButtonImpl = videojs.extend(videojs.getComponent('Button'), ChromecastButton);
   videojs.registerComponent('chromecastButton', ChromecastButtonImpl);
};
