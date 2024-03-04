module.exports = class Throttler {
    timerId = null;
    latestArgs;

    constructor(mainFunction) {
       this.mainFunction = mainFunction;
    }

    throttle(...args) {
       this.latestArgs = args;

       if (this.timerId === null) {
          this.mainFunction(...this.latestArgs);
          this.timerId = setTimeout(() => {
             this.timerId = null;
          }, 300);
       }
    }

    executeRemaining() {
       if (this.timerId) {
          this.mainFunction(...this.latestArgs);
          clearTimeout(this.timerId);
       }
    }
};
