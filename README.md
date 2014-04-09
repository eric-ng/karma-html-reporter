# karma-html-reporter

> Reporter for Karma test runner, generates html.


## Installation

Simply use npm install:
```bash
npm install karma-junit-reporter --save-dev
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

