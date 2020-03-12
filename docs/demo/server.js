'use strict';

var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    root = path.join(__dirname, '..', '..'),
    port = 8080;

http
   .createServer(function(request, response) {
      var requestPath = path.join.apply(path, [ root ].concat(request.url.split('/')));

      fs.readFile(requestPath, function(err, data) {
         if (err) {
            // eslint-disable-next-line no-console
            console.log(err);
            response.writeHead(404);
            response.end();
            return;
         }

         response.writeHead(200);
         response.end(data);
      });
   })
   .listen(port);

// eslint-disable-next-line no-console
console.log('View demo at http://localhost:' + port + '/docs/demo/index.html');
