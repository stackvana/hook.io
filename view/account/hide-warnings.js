var config = require('../../config');
var email = require('resource-email');
var psr = require('parse-service-request');

module['exports'] = function (opts, cb) {
  var $ = this.$,
  req = opts.req,
  res = opts.res;
  if (req.isAuthenticated()) {
    req.session.hideWarning = new Date();
  }
  res.end('ok')
};