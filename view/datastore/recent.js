/*

module['exports'] = function get (opts, cb) {
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

module['exports'] = function view (opts, callback) {

  var $ = this.$, 
      req = opts.request,
      res = opts.response,
      params = req.resource.params;

  // if not logged in, simply show documentation page
  if (!req.isAuthenticated()) {
    
  }

  if (req.session.user !== "anonymous") {
    $('.anonymousLogin').remove();
  }

  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    checkRoleAccess({ req: req, res: res, role: "datastore::recent" }, function (err, hasPermission) {
      console.log(err, hasPermission);
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "datastore::recent"));
      } else {
        finish();
      }
    });
    
  });

  
  function finish () {
    
    console.log('rrr', req.resource.owner)
    $('.root .owner').html(req.resource.owner);
    
    var datastore = new Datastore({ root: req.resource.owner });

      datastore.recent(function(err, keys){
        if (err) {
          return callback(err.message);
        }
        if (keys.length === 0) {
          $('.lastKeys').html('No documents exists in datastore yet. Try <a href="/datastore/set">creating one</a>?');
          return callback(null, $.html());
        }
        console.log(err, keys);
        var str = '';
        keys.forEach(function(k){
          str += '<li><a href="' + '/datastore/get?key=' + k + '">'
          str += k;
          str += '</a></li>'
        });
        $('.lastKeys').html(str);

        /* accept header routing for json api responses */
        // TODO: move to separate module
        var types = [];
        if (req.headers && req.headers.accept) {
          types = req.headers.accept.split(',');
        }
        if (types.indexOf('text/html') === -1) {
          return callback(null, JSON.stringify(keys, true, 2))
        }
        /* end accept header routing */
        
        return callback(null, $.html());
      });

  }


};