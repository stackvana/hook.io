var hook = require('../../resources/hook');
var cache = require('../../resources/cache');
var checkRoleAccess = require('./checkRoleAccess');
var config = require('../../../config');
var resource = require('resource');

module['exports'] = function handleHookResource (req, res) {

  /*
  // TODO: make configurable for private accounts
  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect('/login');
  }
  */

  var key = '/hook/' + req.params.owner + "/" + req.params.hook;
  // TODO: move cache requests inside of resource.before('get')
  cache.get(key, function(err, _hook){
    if (_hook === null) {
      findHook(function(err, h){
        cache.set(key, h, function(){
          finish(err, h);
        });
      });
    } else {
      finish(null, _hook);
    }
  });

  function findHook(cb) {
    hook.find({ owner: req.params.owner, name: req.params.hook }, function (err, result) {
      if (err) {
        return res.end(err.message);
      }
      if (result.length === 0) {
        return res.end('Not found: ' + req.params.owner + "/" + req.params.hook);
      }
      req.hook = result[0];
      result[0]['id'] = undefined;
      result[0]['_rev'] = undefined;
      cb(null, result[0]);
    });
  }
  function finish (err, h) {
    req.hook = h;
    checkRoleAccess({ req: req, res: res, role: "hook::resource::read" }, function (err, hasPermission) {
      console.log(err, hasPermission);
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::resource::read"));
      } else {

        resource.emit('hook::resource::read', {
          ip: req.connection.remoteAddress,
          owner: req.params.owner,
          url: req.url
        });

        res.end(JSON.stringify(h, true, 2));
      }
    });
  }
}
