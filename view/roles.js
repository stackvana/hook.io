var user = require('../lib/resources/user');
var cache = require("../lib/resources/cache");
var role = require('../lib/resources/role');

var bodyParser = require('body-parser');
module['exports'] = function view (opts, callback) {
  var req = opts.request, res = opts.response;
  var $ = this.$;
  /*
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/env";
    return res.redirect('/login');
  }
  */
  
  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});

    var params = req.resource.params;
  
    Object.keys(role.roles).sort().forEach(function(r){
      $('.availableRoles').append('<div>' + r + '</div>');
    });
    
    callback(null, $.html())

  });
  
};



//
// Middleware for merging all querystring / request.body and route parameters,
// into a common scope bound to req.resource.params
//
function mergeParams (req, res, next) {

  req.resource = req.resource || {};
  req.resource.params = {};
  req.body = req.body || {};

  //
  // Iterate through all the querystring and request.body values and
  // merge them into a single "data" argument
  //
  if (typeof req.params === 'object') {
    Object.keys(req.params).forEach(function (p) {
      req.resource.params[p] = req.param(p);
    });
  }

  if (typeof req.query === 'object') {
    Object.keys(req.query).forEach(function (p) {
      req.resource.params[p] = req.query[p];
    });
  }

  Object.keys(req.body).forEach(function (p) {
    req.resource.params[p] = req.body[p];
  });

  next();
}