var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');

var Datastore = require('../../lib/resources/datastore').Datastore;

module['exports'] = function view (opts, callback) {

  var $ = this.$, 
      req = opts.request,
      res = opts.response,
      params = req.resource.params;

  if (req.session.user !== "anonymous") {
    $('.anonymousLogin').remove();
  }

  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    // TODO: move to resource.before hooks
    checkRoleAccess({ req: req, res: res, role: "datastore::recent" }, function (err, hasPermission) {
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "datastore::recent"));
      } else {
        finish();
      }
    });
  });

  function finish () {
    $('.root .owner').html(req.resource.owner);
    var datastore = new Datastore({ root: req.resource.owner });
    datastore.recent(function(err, keys){
      if (err) {
        return callback(err.message);
      }
      if (req.jsonResponse) {
        return callback(null, JSON.stringify(keys, true, 2))
      }
      if (keys.length === 0) {
        $('.lastKeys').html('No documents exists in datastore yet. Try <a href="{{appUrl}}/datastore/set">creating one</a>?');
        return callback(null, $.html());
      }
      var str = '';
      keys.forEach(function(k){
        str += '<li><a href="' + '/datastore/get?key=' + k + '">'
        str += k;
        str += '</a></li>'
      });
      $('.lastKeys').html(str);
      return callback(null, $.html());
    });
  }

};