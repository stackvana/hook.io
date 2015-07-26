var hook = require('../../resources/hook');
var server = require('../');

module['exports'] = function (req, res, app) {
  // get all hooks for this user
  hook.find({owner: req.params.owner }, function (err, result){
    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      return server.handle404(req, res);
    }
    app.view.hooks.present({
      hooks: result,
      request: req,
      response: res
    }, function(err, html){
      res.end(html);
    });
  });
};