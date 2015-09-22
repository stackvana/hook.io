// TODO: refactor out / remove this entire file

var config = require('../../../config');

module['exports'] = function attemptToRequireUntrustedHook (opts, cb) {

  var username = opts.owner || opts.req.hook.owner,
      userHome = config.tempDirectory +  username + "/" + opts.req.hook.name + "/",
      script = opts.script;

  var req = opts.req, res = opts.res;

  var h = req.hook;
  var service = {};
  service.name = h.name;
  service.owner = h.owner;
  service.schema = {};

  var code = opts.req.hook.source;
  // As per https://github.com/bigcompany/hook.io/issues/136, as FS access is removed from worker
  // Instead of loading the code from an additional async source, we now assume that the
  // source has already been loaded on the couchdb document

  // TODO: for cached hook, see if the hook exists in the module cache already,
  // we might be able to shave a millisecond or two off here.
  var id = new Date().getTime();
  var m;
  try {
    var Module = module.constructor;
    m = new Module();
    m.id = id;
    var name = h.owner + "-" + h.name + id;
    delete require.cache[name];
    m.paths = module.paths;
    m._compile(code, name);
  } catch (err) {
    // console.log('err', err)
    return cb(err);
  }
  return cb(null, m);

};