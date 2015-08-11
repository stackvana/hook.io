var config = require('../../../config');

module['exports'] = refreshHandler = function (req, res) {
  var hook = require("../../resources/hook");
  var _hook = "/" + req.params.owner + '/' + req.params.hook;
  return hook.invalidateCache({
    owner: req.params.owner,
    name: req.params.hook
  }, function(err, r){
    if(err) {
      return res.end(err.message);
    }
    return res.redirect(config.baseUrl + _hook);
    //return res.end('Invalidated cache for ' + _hook);
  });
};