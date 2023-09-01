'use strict';

const expect = require('expect.js');

const sinon = require('sinon');

const chromecastTech = require('../src/js/tech/ChromecastTech');

class TechComponentStub {
   constructor() {
      this._ui = {
         getPoster: () => {},
         updatePoster: () => {},
         updateSubtitle: () => {},
         updateTitle: () => {},
      };
      this.trigger = () => {};
   }
   on() {}
   ready() {}
}

describe('ChromecastTech', function() {
   let originalCast,
       originalChrome;

   this.beforeEach(() => {
      originalCast = global.cast;
      global.cast = {
         framework: {
            RemotePlayerEventType: {},
         },
      };

      originalChrome = global.chrome;
      global.chrome = {
         cast: {
            media: {
               GenericMediaMetadata: function() {},
               LoadRequest: function() {},
               MediaInfo: function() {},
               MetadataType: {},
               StreamType: {},
            },
         },
      };
   });

   this.afterEach(() => {
      global.cast = originalCast;
      global.chrome = originalChrome;
   });

   it('should not call videojs.extend', function() {
      const videoJsSpy = {
         extend: function() {
            expect().fail('videojs.extend is deprecated');
         },
         getComponent: function() {
            return TechComponentStub;
         },
         registerTech: function(_, component) {
            expect(component.prototype instanceof TechComponentStub).to.be(true);
         },
      };

      chromecastTech(videoJsSpy);
   });

   it('should call castSession.loadMedia with accurate req from chrome.cast.media.LoadRequest', function() {
      let ChromecastTech;

      const loadMediaSpy = sinon.stub().returns(Promise.resolve());

      const videoJsSpy = () => {
         return {
            chromecastSessionManager: {
               getCastContext: () => {
                  return {
                     getCurrentSession: () => {
                        return {
                           loadMedia: loadMediaSpy,
                        };
                     },
                  };
               },
               getRemotePlayer: () => {},
               getRemotePlayerController: () => {
                  return {
                     addEventListener: () => {},
                  };
               },
            },
            poster: () => {},
         };
      };

      videoJsSpy.getComponent = () => {
         return TechComponentStub;
      };
      videoJsSpy.registerTech = (_, component) => {
         ChromecastTech = component;
      };

      const fakeRequest = {};

      sinon.stub(global.chrome.cast.media, 'LoadRequest').returns(fakeRequest);

      chromecastTech(videoJsSpy);

      // eslint-disable-next-line no-new
      new ChromecastTech({
         source: 'source.url',
      });

      expect(loadMediaSpy.calledWith(fakeRequest)).to.be(true);
   });
});
