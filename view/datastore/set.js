/*

module['exports'] = function set (opts, cb) {
  var $ = this.$,
  req = opts.request,
  res = opts.response;

  var types = [];

  if (req.headers && req.headers.accept) {
    types = req.headers.accept.split(',');
  }

  if (types.indexOf('application/json') !== -1) {
    return cb(null, JSON.stringify({ foo: "bar"}, true, 2))
  }
  console.log(req.headers)
  cb(null, $.html());
};
*/

var psr = require('parse-service-request');

var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');

var Datastore = require('../../lib/resources/datastore').Datastore;

module['exports'] = function set (opts, callback) {

  var $ = this.$, 
      req = opts.request,
      res = opts.response;

  // if not logged in, simply show documentation page
  if (!req.isAuthenticated()) {

  }

  var params;
  psr(req, res, function(req, res, fields){
    params = req.resource.params;
    for (var p in fields) {
      params[p] = fields[p];
    }
    finish();
  });

  function finish () {

    if (typeof params.key === 'string' && params.key.length > 0) {
      // TODO: move to resource.before hooks
      checkRoleAccess({ req: req, res: res, role: "datastore::set" }, function (err, hasPermission) {
        if (!hasPermission) {
          return res.end(config.messages.unauthorizedRoleAccess(req, "datastore::set"));
        } else {
          var datastore = new Datastore({ root: req.resource.owner });
          datastore.set(params.key, params.value, function(err, result){
            if (err) {
              return callback(err);
            }
            return callback(null, JSON.stringify(result, true, 2));
          });
        }
      });
    } else {
      return callback(null, $.html());
    }
  }

};

module['exports'].schema = {
  "key": {
    "type": "string",
    "required": true
  },
  "value": {
    "type": "any",
    "required": true
  }
};