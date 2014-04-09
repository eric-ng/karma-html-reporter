var os = require('os');
var path = require('path');
var fs = require('fs');
var builder = require('DOMBuilder');


var HtmlReporter = function(baseReporterDecorator, config, logger, helper, formatError) {
  var log = logger.create('reporter.junit');
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
    var suite = suites[browser.id] = xml;
    suite.DIV(H1(browser.name),H1(pkgName),H1(timestamp),H1(os.hostname()));
    
    suite.P(browser.fullName));
  };

  this.onRunStart = function(browsers) {
    suites = Object.create(null);
    xml = builder.html;
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

    suite.DIV('tests:'+result.total);
    suite.DIV('errors:'+result.disconnected || result.error ? 1 : 0);
    suite.DIV('failures:'+result.failed);
    suite.DIV('time:'+(result.netTime || 0) / 1000);

    suite.DIV('system-out:'+allMessages.join());
    suite.DIV('system-err');
  };

  this.onRunComplete = function() {
    var htmlToOutput = xml;

    pendingFileWritings++;
    helper.mkdirIfNotExists(path.dirname(outputFile), function() {
      fs.writeFile(outputFile, htmlToOutput.toString(), function(err) {
        if (err) {
          log.warn('Cannot write JUnit xml\n\t' + err.message);
        } else {
          log.debug('JUnit results written to "%s".', outputFile);
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
    var spec = suites[browser.id].DIV(
      P('name:'+result.description), 
      P('time:'+ ((result.time || 0) / 1000)),
      P('classname:'+ (pkgName ? pkgName + ' ' : '') + browser.name + '.' + result.suite.join(' ').replace(/\./g, '_'))
    );

    if (result.skipped) {
      spec.P('skipped');
    }

    if (!result.success) {
      result.log.forEach(function(err) {
        spec.P('failure', SPAN('type:'+ ''), SPAN(formatError(err)));
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
