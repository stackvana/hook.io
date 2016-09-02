var hook = require('../../resources/hook');
var metric = require('../../resources/metric');
var cache = require('../../resources/cache');
var mergeParams = require('merge-params');
var bodyParser = require('body-parser');
var config = require('../../../config');
var url = require('url');
var paidPlans = require('../../resources/paidPlans');

module['exports'] = function (req, res) {

  mergeParams(req, res, function() {

    // Get total amount of hits the user has for this billing period
    metric.get("/" + req.params.owner + "/hits", function(err, total){
      // TODO: check total hits against plan limits,
      // if total hits for user account is exceeded, rate-limit
      console.log('metric.' + req.params.owner + '.hits'.green, err, total);

      // TODO: reset limits on the start of every month, or at the start of the billing cycle?
      // Get total amount of running hooks for current user
      metric.get("/" + req.params.owner + "/running", function (err, total) {
        // TODO: check concurrency of service
        // if total running is greater than account concurrency limit, rate-limit the request
        console.log('metric.' + req.params.owner + '.running'.green, err, total);
        metric.incr("/" + req.params.owner + "/running");
        _runRemote();
      });
    });


    function _runRemote () {

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

var pool = config.workers;

var remoteHandler = hook.runRemote({ pool: pool });