module['exports'] = function (req, res, app) {
  if (req.params.owner === "anonymous") {
    return res.redirect('/login');
  }
  app.view.cron.get.present({
    req: req,
    res: res
  }, function (err, html){
    res.end(html);
  });
};