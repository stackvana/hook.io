var hook = require('../../resources/hook');
var metric = require('../../resources/metric');
var cache = require('../../resources/cache');
var mergeParams = require('merge-params');
var bodyParser = require('body-parser');
var config = require('../../../config');
var url = require('url');
var paidPlans = require('../../resources/paidPlans');
var stack = require('stackvana');

// TODO: add plan limits on-top of default config for concurrency values
/*

var config.MAX_SERVICE_CONCURRENCY = 2,
    config.MAX_SERVICE_EXECUTIONS_PER_CYCLE = 1000;
*/

module['exports'] = function (req, res) {

  mergeParams(req, res, function() {

    // TODO: check total hits against plan limits,
    stack.plugins.rateLimiter({
      maxLimit: 1000,
      maxConcurrency: 2,
      provider: metric
    })(req, res, function () {
      _runRemote();
    });

    function _runRemote () {

      var pool = config.workers;
      var remoteHandler = hook.runRemote({
        pool: pool,
        errorHandler: function (err, req, res) {
          // error happened, adjust running metric
          metric.zincrby(['running', -1, req.params.owner]);
          // console.log('error:',  req.url, err.message);
          res.write('Error communicating with ' + req.url + '\n\n');
          res.write('The streaming connection errored in recieving data.\n\n');
          res.write('Please copy and paste this entire error message to: ' + config.app.adminEmail + '.\n\n');
          // TODO: unified error log event schema
          res.write(JSON.stringify({ time: new Date(), ip: req.connection.remoteAddress })+ '.\n\n');
          res.end(err.stack)
        }
      });

      // normalize all incoming URLS to lowercase
      // this is done to ensure that hook.owner and hook.name will always work regardless of case
      // this may still cause some issues with overagressive toLowerCase()
      // if so, we can always pull out the exact strings that require toLowerCase() via req.params.owner and req.params.name
      var urlObj = url.parse(req.url);
      var newUrl = urlObj.pathname;
      if (urlObj.search !== null) {
        newUrl += urlObj.search;
      }
      req.url = newUrl;
      // run hook on remote worker
      // console.log('calling remote handler', req.url);
      return remoteHandler(req, res, function () {
        // TODO: check if callback makes it here everytime...
        // do nothing with the result
        // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
      });
    }
  });
};

