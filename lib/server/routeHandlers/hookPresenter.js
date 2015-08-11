var hook = require('../../resources/hook');

module['exports'] = function handleHookPresenter (req, res) {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });
  return hook.find({owner: req.params.owner, name: req.params.hook }, function (err, result){
    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      return res.end('Not found');
    }
    var h = result[0];
    req.hook = h;
    hook.fetchHookPresenter({ req: req, res: res }, h.presenter, function(err, _presenter){
      if (err) {
        return res.end(err.message);
      }
      return res.end(_presenter.toString())
    });
  });
};