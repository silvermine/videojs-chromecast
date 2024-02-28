'use strict';

const videos = {
   'hls-mp4': {
      poster: 'https://peertube.cpy.re/lazy-static/previews/da2b08d4-a242-4170-b32a-4ec8cbdca701.jpg',
      source: 'https://peertube.cpy.re/static/streaming-playlists/hls/da2b08d4-a242-4170-b32a-4ec8cbdca701/96b8a08d-4c01-4be6-81f4-c115b8a7bd97-master.m3u8',
      modifyLoadRequestFn: function(loadRequest) {
         loadRequest.media.hlsSegmentFormat = 'fmp4';
         loadRequest.media.hlsVideoSegmentFormat = 'fmp4';
         return loadRequest;
      },
      type: 'application/x-mpegURL',
   },
   mp4: {
      source: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video/mp4',
      poster: 'https://media.w3.org/2010/05/sintel/poster.png',
   },
};

const videojsOptions = {
   fluid: true,
   techOrder: [ 'chromecast', 'html5' ],
   plugins: {
      chromecast: {},
   },
};

const loadScriptsAndStyles = async (videojsVersion) => {
   const scripts = [
      `https://unpkg.com/video.js@${videojsVersion}/dist/video.js`,
      '/dist/silvermine-videojs-chromecast.min.js',
      'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1',
   ];

   const styles = [
      `https://unpkg.com/video.js@${videojsVersion}/dist/video-js.css`,
      '/dist/silvermine-videojs-chromecast.css',
   ];

   styles.forEach((style) => {
      const elem = document.createElement('link');

      elem.rel = 'stylesheet';
      elem.href = style;

      document.body.append(elem);
   });

   for (let i = 0; i < scripts.length; i++) {
      const elem = document.createElement('script');

      await new Promise((resolve) => {
         elem.src = scripts[i];
         elem.type = 'text/javascript';
         elem.onload = resolve;

         document.body.append(elem);
      });
   }
};

const loadVideo = (video) => {
   const player = videojs('video_1');

   player.src({
      src: video.source,
      type: video.type,
   });

   player.poster(video.poster);

   player.options({
      ...videojsOptions,
      chromecast: {
         ...videojsOptions.chromecast,
         modifyLoadRequestFn: video.modifyLoadRequestFn,
      },
   });
};

const init = async () => {
   const videojsSelector = document.querySelector('#videojs-selector');

   const videoSelector = document.querySelector('#video-selector');

   const searchParams = new URLSearchParams(window.location.search);

   videojsSelector.value = searchParams.get('videojsVersion') || '8';
   videoSelector.value = searchParams.get('videoType') || 'mp4';

   await loadScriptsAndStyles(videojsSelector.value);
   videojs('video_1', videojsOptions, function() {
      this.chromecast();
      loadVideo(videos[videoSelector.value]);
   });

   videojsSelector.onchange = (event) => {
      const version = event.target.value;

      const params = new URLSearchParams(window.location.search);

      params.set('videojsVersion', version);
      window.location.search = params.toString();
   };

   videoSelector.onchange = (event) => {
      const videoType = event.target.value;

      const video = videos[videoType];

      const params = new URLSearchParams(window.location.search);

      params.set('videoType', videoType);
      window.history.pushState('', '', '?' + params.toString());

      loadVideo(video);
   };
};

init();
