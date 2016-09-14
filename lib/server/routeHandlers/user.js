var hook = require('../../resources/hook');
var web = require('../../web');

module['exports'] = function (req, res, app) {
  if (req.params.owner === "anonymous") {
    return res.redirect('/login');
  }
  hook.find({owner: req.params.owner }, function (err, result){
    if (err) {
      return res.end(err.message);
    }
    app.view.services.present({
      hooks: result,
      req: req,
      res: res
    }, function(err, html){
      res.end(html);
    });
  });
};