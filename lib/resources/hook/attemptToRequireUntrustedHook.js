// TODO: refactor out / remove this entire file

var config = require('../../../config');

var fs = require("fs");

module['exports'] = function attemptToRequireUntrustedHook (opts, cb) {

  var username = opts.owner || opts.req.hook.owner,
      userHome = __dirname + '/../../../temp/' +  username + "/" + opts.req.hook.name + "/",
      script = opts.script;

  var req = opts.req, res = opts.res;

  var untrustedHook;
  var untrustedTemplate;
  var err = null;
  // At this stage, the hook source code is untrusted ( and should be validated )
  try {
    var _script = require.resolve(userHome + script + '.js');
    delete require.cache[_script];
    untrustedHook = require(_script);
    opts.req.hook = opts.req.hook || {};
    untrustedHook.schema = untrustedHook.schema || {};
    req.untrustedService = untrustedHook;
    // console.log('using schema',  untrustedHook.schema);
    // opts.req.hook.schema = untrustedHook.schema;
    if (opts.req._themeOverride === true) {
      untrustedHook.theme = opts.req._theme || opts.req.hook.view || config.defaultTheme;
      untrustedHook.presenter =  opts.req._presenter || config.defaultPresenter;
    } else {
      untrustedHook.theme = untrustedHook.theme || untrustedHook.view || opts.req.hook.theme;
      untrustedHook.presenter =  untrustedHook.presenter || opts.req.hook.presenter;
    }
  } catch (e) {
    err = e;
  }

  if (err) {
    return fs.readFile(userHome + script + '.js', function (_err, _source){
      if (_err) {
        return cb(_err);
      }
      // If we are unable to require the Hook, it's probably not a valid CommonJS module
      // We could stop here and throw, but it's possible that it's an npm module missing at this point.
      // Since we have slowly been migrating away from executing core service logic inside *this* project,
      // we now have better error handling at the spawn level. This entire file will eventually be refactored out
      // Since services can now come in as strings attempting to always require from fs is not needed
      // Because of all these reasons, we will continue with the failing service ( for now ),
      // and let spawn logic handle the fail
      var failingService = {
        evalSource: _source.toString(),
        theme: config.defaultTheme,
        presenter: config.defaultPresenter,
        schema: {}
      };
      req.untrustedService = failingService;
      return cb(null, failingService);
    });
  }

  // load string copy of module onto hook ( for eval loading later... )
  return fs.readFile(userHome + script + '.js', function (_err, _source){
    if (_err) {
      return cb(_err);
    }
    untrustedHook.evalSource = _source.toString();
    return cb(null, untrustedHook);
  });

};
