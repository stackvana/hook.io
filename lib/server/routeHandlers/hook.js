var hook = require('../../resources/hook');
var metric = require('../../resources/metric');
var cache = require('../../resources/cache');
var config = require('../../../config');
var url = require('url');
var microcule = require('microcule');
var RateLimiter = microcule.plugins.RateLimiter;
var rateLimiter = new RateLimiter({
  provider: metric
});

// TODO: add plan limits on-top of default config for concurrency values
/*

var config.MAX_SERVICE_CONCURRENCY = 2,
    config.MAX_SERVICE_EXECUTIONS_PER_CYCLE = 1000;
*/

// keep track of types of errors which can happen if the rate limiter refuses to route the request
var errors = {
  'redis-cache-error': {
    statusCode: 410
  },
  'missing-user-cache': {
    statusCode: 410,
    message: 'Will not route service for unregistered user. If you are seeing this error please contact support.'
  }
};

module['exports'] = function (req, res) {

  cache.get('/user/' + req.params.owner , function (err, u) {
    if (err) {
      // use 410 ( for now for Telegram )
      res.statusCode = errors['redis-cache-error'].statusCode;
      return res.end(err.message);
    }
    if (u === null) {
      // use 410 ( for now for Telegram )
      res.statusCode = errors['missing-user-cache'].statusCode;
      return res.json({
        error: true,
        message: errors['missing-user-cache'].message
      });
    }

    u.servicePlanMeta = u.servicePlanMeta || {
      hits: 1000,
      concurrency: 2
    };
    rateLimiter.middle({
      maxLimit: u.servicePlanMeta.hits,
      maxConcurrency: u.servicePlanMeta.concurrency
    })(req, res, function (err) {
      if (err) {
        // TODO: better handling of specific error codes
        if (err.code === 'RATE_LIMIT_EXCEEDED') {
          res.statusCode = 410;
          return res.json({
            error: true,
            message: 'Rate limited: Max monthly limit hit: ' + err.monthlyLimit
          });
        }
        if (err.code === 'RATE_CONCURRENCY_EXCEEDED') {
          res.statusCode = 410;
          return res.json({
            error: true,
            message: 'Rate limited: Max concurrency limit hit: ' + err.maxConcurrency
          });
        }
        return res.end(err.message);
      }
      _runRemote();
    });
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

};

