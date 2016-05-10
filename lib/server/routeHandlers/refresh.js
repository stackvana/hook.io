var config = require('../../../config');

module['exports'] = refreshHandler = function (req, res) {
  var hook = require("../../resources/hook");
  var _hook = "/admin?owner=" + req.params.owner + '&name=' + req.params.hook + "&status=refreshed";
  return hook.invalidateCache({
    owner: req.params.owner,
    name: req.params.hook
  }, function(err, r){
    if(err) {
      return res.end(err.message);
    }
    return res.redirect(config.app.url + _hook);
    //return res.end('Invalidated cache for ' + _hook);
  });
};