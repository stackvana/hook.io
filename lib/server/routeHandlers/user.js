var hook = require('../../resources/hook');
var web = require('../../web/web');

module['exports'] = function (req, res, app) {
  if (req.params.owner === "anonymous") {
    return res.redirect('/login');
  }
    app.view.services.present({
      req: req,
      res: res
    }, function(err, html){
      res.end(html);
    });
};