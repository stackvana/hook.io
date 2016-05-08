var user = require('../lib/resources/user');
var cache = require("../lib/resources/cache");
var role = require('../lib/resources/role');

module['exports'] = function view (opts, callback) {
  var req = opts.request, res = opts.response;
  var $ = this.$;

  var appName = req.hostname;

  /*
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/env";
    return res.redirect('/login');
  }
  */

  var params = req.resource.params;

  Object.keys(role.roles).sort().forEach(function(r){
    $('.availableRoles').append('<div>' + r + '</div>');
  });

  $ = req.white($);
  callback(null, $.html());
  
};