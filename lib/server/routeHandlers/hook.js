var hook = require('../../resources/hook');
var metric = require('../../resources/metric');
var cache = require('../../resources/cache');
var mergeParams = require('merge-params');
var bodyParser = require('body-parser');
var config = require('../../../config');
var url = require('url');
var microcule = require('microcule');
var RateLimiter = microcule.plugins.RateLimiter;
var rateLimiter = new RateLimiter({
  provider: metric
});

rateLimiter.registerService({
  owner: 'anonymous',
  name: 'gateway'
});

// TODO: add plan limits on-top of default config for concurrency values
/*

var config.MAX_SERVICE_CONCURRENCY = 2,
    config.MAX_SERVICE_EXECUTIONS_PER_CYCLE = 1000;
*/

module['exports'] = function (req, res) {

  mergeParams(req, res, function() {

    // TODO: make this configurable
    var maxConcurrency = config.MAX_SERVICE_CONCURRENCY;

    // TODO: make this configurable by user plans or limit
    if (req.params.owner === "examples") {
      maxConcurrency = 100;
    }

    // TODO: check total hits against plan limits,
    rateLimiter.middle({
      maxLimit: 1000000,
      maxConcurrency: maxConcurrency
    })(req, res, function () {
      _runRemote();
    });

    function _runRemote () {

      var pool = config.pools.worker;
      var remoteHandler = hook.runRemote({
        pool: pool,
        errorHandler: function (err, req, res) {
          // error happened, adjust running metric
          metric.zincrby(['running', -1, req.params.owner]);
          metric.zincrby(['totalRunning', -1, 'tallies']);
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
      // req.connection.remoteAddress
      //console.log('worker', new Date(), req.method, req.url, req.params);
      return remoteHandler(req, res, function () {
        // TODO: check if callback makes it here everytime...
        // do nothing with the result
        // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
      });
    }
  });
};

