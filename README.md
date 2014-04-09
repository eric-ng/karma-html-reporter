# karma-html-reporter

> Reporter for Karma test runner, generates html.  Mainly for internal use.  


## Installation

Simply use npm install:
```bash
npm install git://github.com/eric-ng/karma-html-reporter.git --save-dev
```

## Configuration
```js
// karma.conf.js
module.exports = function(config) {
  config.set({
    reporters: ['progress', 'html'],

    // the default configuration
    htmlReporter: {
      outputFile: 'test-results.xml',
      suite: ''
    }
  });
};
```

