module['exports'] = function loadPresenter (path, callback) {
  var _presenter, 
      err = null;
  try {
    _presenter = require(path);
  } catch (e) {
    err = e;
  }
  callback(err, _presenter);
};
