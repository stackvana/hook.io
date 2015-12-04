var hook = require('../lib/resources/hook');
var keys = require('../lib/resources/keys');
var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');
var View = require('view').View;
var config = require('../config');


var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');


keys.persist(config.couch)

module['exports'] = function view (opts, callback) {

  var params = opts.request.resource.params;
  var req = opts.request,
      res = opts.response;
  var $ = this.$;
  var gist = opts.gist || params.gist;

  var run = params.run;

  //
  // check referral status
  //
  // if there is no referral set, assign one based on the owner of the current hook
  if (typeof req.session.referredBy === "undefined") {
    req.session.referredBy = req.hook.owner;
  }

  // TODO: make themes overridable through ?theme= param
  // if ?admin=true, redirect to admin page
  if (params.admin) {
    return res.redirect('/admin?owner=' + req.hook.owner + '&name=' + req.hook.name);
  }

  opts.req = req;
  opts.res = res;

  checkRoleAccess({ req: req, res: res }, function (err, hasPermission) {
    if (!hasPermission) {
      //runHook();
      return res.end(config.messages.unauthorizedRoleAccess(req));
    } else {
      runHook();
    }
  });

  function runHook () {
    return hook.runHook(opts, function (err, result){
      if (err) {
        if (Array.isArray(err)) {
          return res.end(JSON.stringify(err, true, 2));
        } else {
          return res.end(err.message);
        }
      }
      return res.end(result.output);
    });
  }

};