var hook = require('../../resources/hook');
var resource = require('resource');
//var events = require('../../resources/events');
var checkRoleAccess = require('./checkRoleAccess');
var config = require('../../../config');

module['exports'] = function handleHookSource (req, res) {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });
  return hook.find({owner: req.params.owner, name: req.params.hook }, function (err, result){
    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      return res.end('Not found');
    }
    var h = result[0];
    req.hook = h;
    checkRoleAccess({ req: req, res: res, role: "hook::source::read" }, function (err, hasPermission) {
      console.log(err, hasPermission);
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::source::read"));
      }

      resource.emit('hook::source::read', {
        ip: req.connection.remoteAddress,
        owner: req.params.owner,
        url: req.url
      });

      hook.fetchHookSourceCode({ gist: h.gist, req: req, res: res }, function(err, code){
        if (err) {
          return res.end(err.message);
        }
        return res.end(code);
      });
    });
  });
}
