var hook = require('../../resources/hook');

module['exports'] = function handleHookResource (req, res) {

  /*

  // TODO: make configurable for private accounts
  if (!req.isAuthenticated()) {
    req.session.redirectTo = req.url;
    return res.redirect('/login');
  }

  if (req.session.user !== req.params.owner && req.session.user !== "Marak") {
    return res.end(req.session.user + ' does not have permission to view ' + req.params.owner + "/" + req.params.hook);
  }
  */

  // fetch the latest version of hook ( non-cached )
  hook.find({ owner: req.params.owner, name: req.params.hook }, function (err, result) {
    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      return server.handle404(req, res);
    }
    req.hook = result[0];
    result[0]['id'] = undefined;
    result[0]['_rev'] = undefined;
    res.end(JSON.stringify(result[0], true, 2));
  });
}
