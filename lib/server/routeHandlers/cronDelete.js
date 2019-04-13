var config = require('../../../config');
var cron = require('../../resources/cron/cron');
var cache = require('../../resources/cache');
var resource = require('resource');
var psr = require('parse-service-request');

var checkRoleAccess = require('../../server/routeHandlers/checkRoleAccess');

module['exports'] = function handleCronDelete (req, res) {
  var params = {};
  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    req.resource.owner = req.params.owner;
    req.resource.params = params;
    checkRoleAccess({ req: req, res: res, role: 'cron::destroy' }, function (err, hasPermission) {
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, 'cron::destroy'));
      } else {
        deleteCron();
      }
    });
  });

  function deleteCron () {

    return cron.find({ owner: req.resource.owner, name: req.params.name }, function (err, result){
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
        cache.del('/cron/' + req.params.owner + '/' + req.params.name, function (){

          resource.emit('cron::destroyed', {
            ip: req.connection.remoteAddress,
            owner: req.params.owner,
            name: req.params.name
          });

          if (req.jsonResponse === true) {
            var msg = {
              status: 'deleted',
              message: 'Cron "' + req.params.name + '" has been deleted!',
              owner: req.params.owner,
              name: req.params.name
            };
            return res.json(msg);
          } else {
            return res.redirect(config.app.url + '/cron/all');
          }
        });
      });
    });

  }

};
