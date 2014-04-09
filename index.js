var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('DOMBuilder');


var HtmlReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.html');
  var reporterConfig = config.junitReporter || {};
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
    var suite = suites[browser.id] = [];
    suite.push('div');
    suite.push(['h1',browser.name]);
    suite.push(['h1',pkgName]);
    suite.push(['h1',timestamp]);
    suite.push(['h1',os.hostname()]);
    suite.push('p');
    suite.push(browser.fullName);
    
    xml.push(suite);
  };

  this.onRunStart = function(browsers) {
    suites = Object.create(null);
    xml = [];
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

    suite.push('div');suite.push('tests:'+result.total);
    suite.push('div');suite.push('errors:'+result.disconnected || result.error ? 1 : 0);
    suite.push('DIV');suite.push('failures:'+result.failed);
    suite.push('DIV');suite.push('time:'+(result.netTime || 0) / 1000);

    suite.push('DIV');suite.push('system-out:'+allMessages.join());
    suite.push('DIV');suite.push('system-err');
  };

  this.onRunComplete = function() {
    var htmlToOutput = xml;

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, htmlToOutput.toString(), function(err) {
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
    spec.push('DIV');
    spec.push(['P','name:'+result.description]);
    spec.push(['p','time:'+ ((result.time || 0) / 1000)]);
    spec.push(['p','classname:'+ (pkgName ? pkgName + ' ' : '') + browser.name + '.' + result.suite.join(' ').replace(/\./g, '_')]);

    if (result.skipped) {
      spec.push('P');spec.push('skipped');
    }

    if (!result.success) {
      result.log.forEach(function(err) {
        spec.push('P');spec.push('failure');
        spec.push(['SPAN','type:'+ '']);
        spec.push(['SPAN',formatError(err)]);
      });
    }
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
