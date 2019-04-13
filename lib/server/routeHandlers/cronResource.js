var cron = require('../../resources/cron/cron');
var cache = require('../../resources/cache');
var checkRoleAccess = require('./checkRoleAccess');
var config = require('../../../config');
var resource = require('resource');

module['exports'] = function handleCronResource (req, res) {

  var key = '/cron/' + req.params.owner + '/' + req.params.name;
  cache.get(key, function(err, _cron){
    if (_cron === null) {
      findCron(function(err, c){
        cache.set(key, c, function(){
          finish(err, c);
        });
      });
    } else {
      finish(null, _cron);
    }
  });

  function findCron (cb) {
    cron.find({ owner: req.params.owner, name: req.params.name }, function (err, result) {
      if (err) {
        return res.end(err.message);
      }
      if (result.length === 0) {
        res.statusCode = 404;
        return res.end('Not found: ' + req.params.owner + '/' + req.params.name);
      }
      req.cron = result[0];
      cb(null, result[0]);
    });
  }
  function finish (err, c) {
    req.cron = c;
    checkRoleAccess({ req: req, res: res, role: 'cron::resource::read' }, function (err, hasPermission) {
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, 'cron::resource::read'));
      } else {
        resource.emit('cron::resource::read', {
          ip: req.connection.remoteAddress,
          owner: req.params.owner,
          url: req.url
        });
        res.end(JSON.stringify(c, true, 2));
      }
    });
  }
};
