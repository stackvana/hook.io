var hook = require('../../resources/hook');
var cache = require('../../resources/cache');

module['exports'] = function handleHookResource (req, res) {

  /*

  // TODO: make configurable for private accounts
  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect('/login');
  }

  if (req.session.user !== req.params.owner && req.session.user !== "marak") {
    return res.end(req.session.user + ' does not have permission to view ' + req.params.owner + "/" + req.params.hook);
  }
  */
  var key = '/hook/' + req.params.owner + "/" + req.params.hook;
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
    res.end(JSON.stringify(h, true, 2));
  }
}
