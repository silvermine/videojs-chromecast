'use strict';

var expect = require('expect.js');

const chromecastButton = require('../src/js/components/ChromecastButton');

class ButtonComponentStub {}

describe('ChromecastButton', function() {
   it('should not call videojs.extend', function() {
      const videoJsSpy = {
         extend: function() {
            expect().fail('videojs.extend is deprecated');
         },
         getComponent: function() {
            return ButtonComponentStub;
         },
         registerComponent: function(_, component) {
            expect(component.prototype instanceof ButtonComponentStub).to.be(true);
         },
      };

      chromecastButton(videoJsSpy);
   });
});
