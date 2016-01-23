var hook = require('../../resources/hook');
var checkRoleAccess = require('./checkRoleAccess');
var config = require('../../../config');
var resource = require('resource');

module['exports'] = function handleHookPresenter (req, res) {
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

    checkRoleAccess({ req: req, res: res, role: "hook::presenter::read" }, function (err, hasPermission) {

      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, "hook::presenter::read6"));
      }

      // remove this?
      // update: should probably be in checkRoleAccess.js itself
      resource.emit('hook::presenter::read', {
        ip: req.connection.remoteAddress,
        owner: req.params.owner,
        url: req.url
      });

      hook.fetchHookPresenter({ req: req, res: res }, h.presenter, function(err, _presenter){
        if (err) {
          return res.end(err.message);
        }
        return res.end(_presenter.toString())
      });

    });
  });
};