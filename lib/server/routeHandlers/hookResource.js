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
  var key = '/user/' + req.params.owner;
  cache.get(key, function(err, _user){
    if (_user === null) {
      findUser(function(err, u){
        cache.set(key, u, function(){
          finish(err, u);
        });
      });
    } else {
      finish(null, _user);
    }
  });
  function findUser(cb) {
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
  function finish (err, u) {
    res.end(JSON.stringify(u, true, 2));
  }
}
