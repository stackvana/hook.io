// TODO: part of microservice resource

var config = require('../../../config');

var fs = require("fs");

module['exports'] = function attemptToRequireUntrustedHook (opts, callback) {

  var username = opts.username || opts.req.hook.owner,
      userHome = __dirname + '/../../../temp/' +  username + "/" + opts.req.hook.name + "/",
      script = opts.script;

  var untrustedHook;
  var isStreamingHook;
  var untrustedTemplate;
  var err = null;
  // At this stage, the hook source code is untrusted ( and should be validated )
  try {
    var _script = require.resolve(userHome + script + '.js');
    delete require.cache[_script];
    untrustedHook = require(_script);
    opts.req.hook = opts.req.hook || {};
    untrustedHook.schema = untrustedHook.schema || {};
    console.log('using schema',  untrustedHook.schema);
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
        return callback(_err);
      }
      // unable to require Hook as commonjs module,
      // the Hook is invalid
      return callback(err, _source);
    });
  }

  // load string copy of module onto hook ( for eval loading later... )
  return fs.readFile(userHome + script + '.js', function (_err, _source){
    if (_err) {
      return callback(_err);
    }
    // unable to require Hook as commonjs module,
    // the Hook is invalid
    untrustedHook.evalSource = _source.toString();
    return callback(null, untrustedHook)
  });

};
