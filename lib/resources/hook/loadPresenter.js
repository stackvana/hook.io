module['exports'] = function loadPresenter (hook, code, callback) {
  var _presenter, 
      err = null;
  // try to compile the hot-code into a module
  try {
    var Module = module.constructor;
    var m = new Module();
    var name = 'presenterCode-' + hook.owner + "-" + hook.name;
    delete require.cache[name];
    m.paths = module.paths;
    m._compile(code, name);
  } catch (err) {
    return callback(err);
  }
  callback(null, m.exports);
};