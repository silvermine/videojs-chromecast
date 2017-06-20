'use strict';

var Class = require('class.extend'),
    ChromecastTechUI;

ChromecastTechUI = Class.extend({
   init: function() {
      this._el = this._createDOMElement();
   },

   _createDOMElement: function() {
      var el = this._createElement('div', 'vjs-tech vjs-tech-chromecast'),
          posterEl = this._createElement('img', 'vjs-tech-chromecast-poster'),
          titleEl = this._createElement('div', 'vjs-tech-chromecast-title'),
          subtitleEl = this._createElement('div', 'vjs-tech-chromecast-subtitle'),
          titleContainer = this._createElement('div', 'vjs-tech-chromecast-title-container');

      titleContainer.appendChild(titleEl);
      titleContainer.appendChild(subtitleEl);
      el.appendChild(posterEl);
      el.appendChild(titleContainer);

      return el;
   },

   _createElement: function(type, className) {
      var el = document.createElement(type);

      el.className = className;
      return el;
   },

   getDOMElement: function() {
      return this._el;
   },

   _findPosterEl: function() {
      return this._el.querySelector('.vjs-tech-chromecast-poster');
   },

   _findTitleEl: function() {
      return this._el.querySelector('.vjs-tech-chromecast-title');
   },

   _findSubtitleEl: function() {
      return this._el.querySelector('.vjs-tech-chromecast-subtitle');
   },

   updatePoster: function(poster) {
      this._poster = poster ? poster : null;
      if (poster) {
         this._findPosterEl().setAttribute('src', poster);
      } else {
         this._findPosterEl().removeAttribute('src');
      }
   },

   getPoster: function() {
      return this._poster;
   },

   updateTitle: function(title) {
      this._title = title;
      if (title) {
         this._findTitleEl().innerHTML = title;
      }
   },

   updateSubtitle: function(subtitle) {
      this._subtitle = subtitle;
      if (subtitle) {
         this._findSubtitleEl().innerHTML = subtitle;
      }
   },
});

module.exports = ChromecastTechUI;
