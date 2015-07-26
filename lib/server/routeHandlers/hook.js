var hook = require('../../resources/hook');
var metric = require('../../resources/metric');
var cache = require('../../resources/cache');
var mergeParams = require('../../../view/mergeParams');
var bodyParser = require('body-parser');

module['exports'] = function (req, res) {
  
  mergeParams(req, res, function(){
    if (req.resource.params.fork) {
      return hook.fork(req, res);
    }
    // if ?delete=true has been passed to the hook,
    // attempt to destroy the hook
    if (req.resource.params.delete) {
      var user = req.session.id;
      if (typeof req.session.user !== 'undefined') {
        user = req.session.user.toLowerCase();
      }

      // check the owner of the hook versus the current session,
      // if the session does not match the owner, do not allow hook to be deleted
      if (req.params.owner.toLowerCase() === user) {
        return hook.find({owner: req.params.owner, name: req.params.hook }, function (err, result){
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
            cache.set('/hook/' + req.params.owner + '/' + req.params.hook, null, function (){
              return res.end('deleted ' + h.owner + "/" + h.name);
            });
          });
        });
      } else {
        return res.end(user + ' does not have the permission to destroy ' + req.params.owner + "/" + req.params.hook);
      }
    }
    // run hook on remote worker
    return hook.runRemote(req, res, function(){
      // do nothing with the result
      // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
    });
  })
};