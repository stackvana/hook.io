module['exports'] = function loadPresenter (code, callback) {
  var _presenter, 
      err = null;
  // try to compile the hot-code into a module
  var id = new Date().getTime();
  try {
    var Module = module.constructor;
    var m = new Module();
    var name = 'presenterCode-' + id;
    delete require.cache[name];
    m.paths = module.paths;
    m._compile(code, name);
  } catch (err) {
    // console.log('err', err)
    callback(err);
  }
  callback(null, m.exports);
};