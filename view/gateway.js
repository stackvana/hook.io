var hook = require('../lib/resources/hook');
var metric = require('../lib/resources/metric');
var config = require('../config');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess')
var stack = require('stackvana');

module['exports'] = function view (opts, callback) {
  var $ = this.$,
  res = opts.res,
  req = opts.req,
  params = req.resource.params;

  var pool = config.workers;
  var remoteHandler = hook.runRemote({ pool: pool });

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
    // TODO: Get total amount of hits the user has for this billing period
    // TODO: check total hits against plan limits,
    // TODO: reset limits on the start of every month, or at the start of the billing cycle?
    // TODO: pull value from config / paidPlans.js
    // TODO: add back specific gateway hits
      // metric.incr("/" + service.owner + "/" + "gateway" + '/hits');
    // WARNING: currently using default limit values ( see above note )
    stack.plugins.rateLimiter({
      provider: metric
    })(req, res, function () {
      _runRemote();
    });
  }

  // run hook on remote worker
  function _runRemote () {
    // console.log('calling remote handler', req.url); // TODO: not full url
    return remoteHandler(req, res, function (err, r) {
      //console.log('remote handler ended?'.green)
      //console.log(err, r);
      // TODO: check if callback makes it here everytime...
      // do nothing with the result
      // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
    });
  }

};