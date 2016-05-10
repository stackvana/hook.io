var config = require('../../../config');
var hook = require('../../resources/hook');
var cache = require('../../resources/cache');
var resource = require('resource');
var psr = require('parse-service-request');

var checkRoleAccess = require('../../server/routeHandlers/checkRoleAccess');

module['exports'] = function handleHookResource (req, res) {
  // if ?delete=true has been passed to the hook,
  // attempt to destroy the hook
  var user = req.session.id;
  var params = {};
  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    req.resource.owner = req.params.owner;
    req.resource.params = params;

    // TODO: move to resource.before hook
    checkRoleAccess({ req: req, res: res, role: "hook::destroy" }, function (err, hasPermission) {
      /*
      console.log('session', req.session.user);
      console.log('owner', req.resource.owner);
      console.log('checked get', err, hasPermission);
      */
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::destroy"));
      } else {
        deleteHook();
      }
    });
  });

  function deleteHook () {

    return hook.find({ owner: req.resource.owner, name: req.params.hook }, function (err, result){
      if (err) {
        return res.end(err.message);
      }
      if (result.length === 0) {
        return res.end('Not found');
      }
      var h = result[0];
      return h.destroy(function(err){
        if (err) {
          return res.end(err.message);
        }
        // also remove from cache
        cache.del('/hook/' + req.params.owner + '/' + req.params.hook, function (){

          resource.emit('hook::destroyed', {
            ip: req.connection.remoteAddress,
            owner: req.params.owner,
            name: req.params.hook
          });

          if (req.jsonResponse === true) {
            var msg = {
              status: 'deleted',
              message: 'Hook "' + req.params.hook + '" has been deleted!',
              owner: req.params.owner,
              name: req.params.hook
            };
            return res.json(msg);
          } else {
            return res.redirect(config.app.url + "/" + h.owner);
          }
        });
      });
    });

  }

}
