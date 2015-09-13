var hook = require('../../resources/hook');
var metric = require('../../resources/metric');
var cache = require('../../resources/cache');
var mergeParams = require('merge-params');
var bodyParser = require('body-parser');
var config = require('../../../config');
var url = require('url');

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
              return res.redirect(config.baseUrl + "/" + h.owner);
            });
          });
        });
      } else {
        return res.end(user + ' does not have the permission to destroy ' + req.params.owner + "/" + req.params.hook);
      }
    }

    // normalize all incoming URLS to lowercase
    // this is done to ensure that hook.owner and hook.name will always work regardless of case
    // this may still cause some issues with overagressive toLowerCase()
    // if so, we can always pull out the exact strings that require toLowerCase() via req.params.owner and req.params.name
    var urlObj = url.parse(req.url);
    var newUrl = urlObj.pathname.toLowerCase() + urlObj.search;
    req.url = newUrl;

    // run hook on remote worker
    return remoteHandler(req, res, function(){
      // do nothing with the result
      // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
    });
  })
};

var remoteHandler = hook.runRemote({ pool: ["10000", "10001", "10002", "10003", "10004"] });
