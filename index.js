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
    var timestamp = (new Date()).toISOString().substr(0, 19).split('T').join(' ');
    var suite = '';

    suite += '<div><div><h1>Test Suite '+pkgName+' Results</div>';
    suite += '<div><b>Browser:  </b>'+browser.name+'</div>';
    suite += '<div><b>Timestamp:  </b>'+timestamp+'</div>';
    suite += '<div><b>Hostname:  </b>'+os.hostname()+'</div>';
    suite += '<div><b>Browser Spec:  </b>'+browser.fullName+'</div></div>';
    suite += '<hr>';
    
    suites[browser.id] = suite;
  };

  this.onRunStart = function(browsers) {
    suites = Object.create(null);
    xml = '<html><head>';
    xml += '<style>';
    xml += 'body{font-family:arial;color:#333;}';
    xml += '.suc{background:#DFD;}';
    xml += '.fail{background:#FDD;}';
    xml += '.skip{background:#FFD;}';
    xml += '.summary span, .testcase span {display:table-cell;}'
    xml += '.summary{padding:15px;font-size:20px;background:#DDF;margin-top:20px;}';
    xml += '.testcase{padding:15px;border-bottom:1px solid #AAA;}';
    xml += '.testattr{width:180px;font-weight:bold;padding:5px 10px 5px 0px;display:inline-block;text-align:right;';
    xml += '</style></head><body>';
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

    suite += '<div class="summary"><div><span class="testattr">Tests</span><span>'+result.total+'</span></div>';
    suite += '<div><span class="testattr">Successes</span><span>'+result.success+'</span></div>';
    suite += '<div><span class="testattr">Failures</span><span>'+result.failed+'</span></div>';
    suite += '<div><span class="testattr">Skips</span><span>'+result.skipped+'</span></div>';
    suite += '<div><span class="testattr">Errors</span><span>'+(result.disconnected || result.error ? 'YES' : 'NONE')+'</span></div>';
    suite += '<div><span class="testattr">Time</span><span>'+((result.netTime || 0) / 1000)+'</span></div>';
    suite += '<div><span class="testattr">System Output</span><span>'+allMessages.join()+'</span></div></div>';

    suites[browser.id] = suite;
  };

  this.onRunComplete = function() {
    for(var k in suites){
      xml += suites[k];
    }
    xml += '</body></html>';
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

    spec += '<div class="testcase '+(result.skipped?'skip':(result.success?'suc':'fail'))+'">';
    spec += '<div><span class="testattr">Test Suite</span><span>'+pkgName +'</span></div>';
    spec += '<div><span class="testattr">File</span><span>'+result.suite.join('.')+'</span></div>';
    spec += '<div><span class="testattr">Description</span><span>'+result.description+'</span></div>';
    spec += '<div><span class="testattr">Time</span><span>'+((result.time || 0)/1000)+'</span></div>';
    if (!result.success) {
      result.log.forEach(function(err) {
        spec += '<div><span class="testattr">Failure</span>';
        spec += '<span>'+formatError(err)+'</span></div>';
      });
    }
    spec += '</div>';

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
