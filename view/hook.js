var hook = require('../lib/resources/hook');
var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');
var mustache = require('mustache');
var View = require('view').View;
var config = require('../config');

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
  return hook.runHook(opts, function (err, result){
    if (err) {
      return res.end(err.message);
    }
    return res.end(result.output);
  });

};