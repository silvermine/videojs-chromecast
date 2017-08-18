'use strict';

var Class = require('class.extend'),
    ChromecastTechUI;

ChromecastTechUI = Class.extend({
   init: function() {
      this._el = this._createDOMElement();
   },

   _createDOMElement: function() {
      var el = this._createElement('div', 'vjs-tech vjs-tech-chromecast'),
          posterContainerEl = this._createElement('div', 'vjs-tech-chromecast-poster'),
          posterImageEl = this._createElement('img', 'vjs-tech-chromecast-poster-img'),
          titleEl = this._createElement('div', 'vjs-tech-chromecast-title'),
          subtitleEl = this._createElement('div', 'vjs-tech-chromecast-subtitle'),
          titleContainer = this._createElement('div', 'vjs-tech-chromecast-title-container');

      posterContainerEl.appendChild(posterImageEl);
      titleContainer.appendChild(titleEl);
      titleContainer.appendChild(subtitleEl);

      el.appendChild(titleContainer);
      el.appendChild(posterContainerEl);

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

   _findPosterImageEl: function() {
      return this._el.querySelector('.vjs-tech-chromecast-poster-img');
   },

   _findTitleEl: function() {
      return this._el.querySelector('.vjs-tech-chromecast-title');
   },

   _findSubtitleEl: function() {
      return this._el.querySelector('.vjs-tech-chromecast-subtitle');
   },

   updatePoster: function(poster) {
      var posterImageEl = this._findPosterImageEl();

      this._poster = poster ? poster : null;
      if (poster) {
         posterImageEl.setAttribute('src', poster);
         posterImageEl.classList.remove('vjs-tech-chromecast-poster-img-empty');
      } else {
         posterImageEl.removeAttribute('src');
         posterImageEl.classList.add('vjs-tech-chromecast-poster-img-empty');
      }
   },

   getPoster: function() {
      return this._poster;
   },

   updateTitle: function(title) {
      var titleEl = this._findTitleEl();

      this._title = title;
      if (title) {
         titleEl.innerHTML = title;
         titleEl.classList.remove('vjs-tech-chromecast-title-empty');
      } else {
         titleEl.classList.add('vjs-tech-chromecast-title-empty');
      }
   },

   updateSubtitle: function(subtitle) {
      var subtitleEl = this._findSubtitleEl();

      this._subtitle = subtitle;
      if (subtitle) {
         subtitleEl.innerHTML = subtitle;
         subtitleEl.classList.remove('vjs-tech-chromecast-subtitle-empty');
      } else {
         subtitleEl.classList.add('vjs-tech-chromecast-subtitle-empty');
      }
   },
});

module.exports = ChromecastTechUI;
