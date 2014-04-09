var os = require('os');
var path = require('path');
var fs = require('fs');


var HtmlReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.html');
  var reporterConfig = config.htmlReporter || {};
  var pkgName = reporterConfig.suite || '';
  var outputFile = helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile
      || 'test-results.html'));

  var xml;
  var suites;
  var pendingFileWritings = 0;
  var fileWritingFinished = function() {};
  var allMessages = [];

  baseReporterDecorator(this);

  this.adapters = [function(msg) {
    allMessages.push(msg);
  }];

  var initliazeHtmlForBrowser = function(browser) {
    var timestamp = (new Date()).toISOString().substr(0, 19);
    var suite = '';

    suite = '<div><h1>'+browser.name+'</h1><h1>'+pkgName+'</h1><h1>'+timestamp+'</h1><h1>'+os.hostname()+'</div>';
    suite += '<p>'+browser.fullName+'</p>';
    
    suites[browser.id] = suite;
  };

  this.onRunStart = function(browsers) {
    suites = Object.create(null);
    xml = '<html>';
    browsers.forEach(initliazeHtmlForBrowser);
  };

  this.onBrowserStart = function(browser) {
    initliazeHtmlForBrowser(browser);
  };

  this.onBrowserComplete = function(browser) {
    var suite = suites[browser.id];

    if (!suite) {
      // This browser did not signal `onBrowserStart`. That happens
      // if the browser timed out duging the start phase.
      return;
    }

    var result = browser.lastResult;

    suite += '<div>tests:'+result.total+'</div>';
    suite += '<div>errors:'+result.total+'</div>';
    suite += '<div>failures:'+(result.disconnected || result.error ? 1 : 0)+'</div>';
    suite += '<div>time:'+((result.netTime || 0) / 1000)+'</div>';
    suite += '<div>system-out:'+allMessages.join()+'</div>';
    suite += '<div>system-err</div>';

    suites[browser.id] = suite;
  };

  this.onRunComplete = function() {
    for(var k in suites){
      xml += suites[k];
    }
    xml += '</html>';
    var htmlOutput = xml;

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, htmlOutput, function(err) {
        if (err) {
          log.warn('Cannot write HTML\n\t' + err.message);
        } else {
          log.debug('HTML results written to "%s".', outputFile);
        }

        if (!--pendingFileWritings) {
          fileWritingFinished();
        }
      });
    });

    suites = xml = null;
    allMessages.length = 0;
  };

  this.specSuccess = this.specSkipped = this.specFailure = function(browser, result) {
    var spec = suites[browser.id];

    spec += '<div>';
    spec += '<p>name:'+result.description+'</p>';
    spec += '<p>time:'+((result.time || 0)/1000)+'</p>';
    spec += '<p>classname:'+(pkgName ? pkgName + ' ' : '') + browser.name + '.' + result.suite.join(' ').replace(/\./g, '_')+'</p>';
    spec += '</div>';

    if (result.skipped) {
      spec += '<p>skipped</p>';
    }

    if (!result.success) {
      result.log.forEach(function(err) {
        spec += '<p>failure';
        spec += '<span>type:</span>';
        spec += '<span>'+formatError(err)+'</span>';
        spec += '</p>';
      });
    }
    suites[browser.id] = spec;
  };

  // wait for writing all the xml files, before exiting
  this.onExit = function(done) {
    if (pendingFileWritings) {
      fileWritingFinished = done;
    } else {
      done();
    }
  };
};

HtmlReporter.$inject = ['baseReporterDecorator', 'config', 'logger', 'helper', 'formatError'];

// PUBLISH DI MODULE
module.exports = {
  'reporter:html': ['type', HtmlReporter]
};
