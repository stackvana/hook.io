var hook = require('../../resources/hook');

module['exports'] = function handleHookView (req, res) {
  return hook.find({owner: req.params.username, name: req.params.hook }, function (err, result){
    if (err) {
      return res.end(err.message);
    }
    if (result.length === 0) {
      return res.end('Not found');
    }
    var h = result[0];
    req.hook = h;
    hook.fetchHookTheme({ req: req, res: res }, h.theme, function(err, _theme){
     if (err) {
        return res.end(err.message);
      }
      return res.end(_theme)
    });
  });
};