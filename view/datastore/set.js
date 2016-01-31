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
      res = opts.response,
      params = req.resource.params;

  // if not logged in, simply show documentation page
  if (!req.isAuthenticated()) {

  }
  
  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    finish();
  });

  function finish () {
    console.log(req.resource.params);
    
    // TODO: datastore root should be based on hook_private_key or req.session.user or anonymous
    var datastore = new Datastore({ root: req.session.user });

    if (typeof params.key === 'string' && params.key.length > 0) {

      checkRoleAccess({ req: req, res: res, role: "datastore::set" }, function (err, hasPermission) {
        console.log(err, hasPermission);
        if (!hasPermission) {
          return res.end(config.messages.unauthorizedRoleAccess(req, "datastore::set"));
        } else {

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

      /* TODO: 
      datastore.recent(function(err, keys){
        if (err) {
          return callback(err.message);
        }
        var str = '';
        keys.forEach(function(k){
          str += '<li><a href="' + '/datastore?key=' + k + '">'
          str += k;
          str += '</a></li>'
        });
        $('.lastKeys').html(str);
        return callback(null, $.html());
      });
      */
    }    
  }


};