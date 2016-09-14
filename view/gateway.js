var hook = require('../lib/resources/hook');
var metric = require('../lib/resources/metric');
var config = require('../config');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess')

module['exports'] = function view (opts, callback) {
  var $ = this.$,
  res = opts.res,
  req = opts.req,
  params = req.resource.params;

  var pool = config.workers;
  var remoteHandler = hook.runRemote({ pool: pool });

  // TODO: pull value from config / paidPlans.js
  /*
  var config.MAX_SERVICE_CONCURRENCY = 2;
  var config.MAX_SERVICE_EXECUTIONS_PER_CYCLE = 1000;
  */
  // TODO: determine owner by API key or session

  // Remark: is all session code already being handled?
  /*
  // TODO: replace hook::run with gateway::run role
  checkRoleAccess({ req: req, res: res, role: "hook::run" }, function (err, hasPermission) {
    // console.log('check for role access', err, hasPermission)
    if (!hasPermission || req.resource.owner === "anonymous") { // don't allow anonymous hook update
      if (req.jsonResponse !== true && typeof params.hook_private_key === "undefined") {
        req.params.owner = "anonymous";
        return runService();
      }
      // return res.end(config.messages.unauthorizedRoleAccess(req, "hook::run"));
    } else {
      req.para1ms.owner = req.resource.owner;
      runService();
    }
  });
  */
  runService();
  function runService () {
    // line will be removed when role checks are working
    req.params.owner = req.params.owner || "anonymous";
    // Get total amount of hits the user has for this billing period
    metric.get("/" + req.params.owner + "/hits", function(err, total){

      // if total hits for user account is exceeded, rate-limit
      console.log('metric.' + req.params.owner + '.hits'.green, err, total);
      if (Number(total) >= config.MAX_SERVICE_EXECUTIONS_PER_CYCLE) {
        // TODO: better error message
        return res.end('max executions per cycle hit, upgrade plan, wait, or request more');
      }

      // TODO: get req.user.plan to determine actual limits ( versus paid / non-paid limits )
      // TODO: reset limits on the start of every month, or at the start of the billing cycle?
      // Get total amount of running hooks for current user
      metric.get("/" + req.params.owner + "/running", function (err, total) {
        // if total running is greater than account concurrency limit, rate-limit the request
        if (err) {
          return res.end(err.message);
        }
        console.log('total'.green, total, config.MAX_SERVICE_CONCURRENCY)
        if (Number(total) >= config.MAX_SERVICE_CONCURRENCY) {
          // TODO: better error message
          return res.end('max concurrency hit, try again shortly.');
        }
        console.log('metric.' + req.params.owner + '.running'.green, err, total);
        _runRemote();
      });
    });
  }

  function _runRemote () {
    // run hook on remote worker
    // console.log('calling remote handler', req.url);
    return remoteHandler(req, res, function (err, r) {
      console.log('remote handler ended?'.green)
      console.log(err, r);
      // TODO: check if callback makes it here everytime...
      // do nothing with the result
      // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
    });
  }

};