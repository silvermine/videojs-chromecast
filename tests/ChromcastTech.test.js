'use strict';

var expect = require('expect.js');

const chromecastTech = require('../src/js/tech/ChromecastTech');

class TechComponentStub {
}

describe('ChromecastTech', function() {
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
});
