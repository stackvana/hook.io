var config = require('../../../config');
var hook = require('../../resources/hook');
var cache = require('../../resources/cache');
var resource = require('resource');

module['exports'] = function handleHookResource (req, res) {

  // if ?delete=true has been passed to the hook,
  // attempt to destroy the hook
  var user = req.session.id;
  if (typeof req.session.user !== 'undefined') {
    user = req.session.user.toLowerCase();
  }

  // check the owner of the hook versus the current session,
  // if the session does not match the owner, do not allow hook to be deleted
  if (req.params.owner.toLowerCase() === user || user === "marak") {
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
          
          resource.emit('hook::destroyed', {
            ip: req.connection.remoteAddress,
            owner: req.params.owner,
            name: req.params.hook
          });

          return res.redirect(config.baseUrl + "/" + h.owner);
        });
      });
    });
  } else {
    return res.end(user + ' does not have the permission to destroy ' + req.params.owner + "/" + req.params.hook);
  }

}
