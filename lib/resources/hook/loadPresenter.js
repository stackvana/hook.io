module['exports'] = function loadPresenter (path, callback) {
  var _presenter, 
      err = null;
  // It's possible the hook presenter has changed, but has already been loaded into memory from previous execution
  // Attempt to remove any old versions from node's module cache
  // This might create a performance hit. We could consider mitigating this by performing a checksum of two versions
  try {
    var name = require.resolve(path);
    delete require.cache[name];
  } catch (e) {
    // err = e;
    // don't do anything if we can't unrequire previous presenter
  }
  try {
    _presenter = require(path);
  } catch (e) {
    err = e;
  }
  callback(err, _presenter);
};
