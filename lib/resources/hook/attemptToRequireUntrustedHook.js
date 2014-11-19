var config = require('../../../config');

var fs = require("fs");

module['exports'] = function attemptToRequireUntrustedHook (opts, callback) {

  var username = opts.username,
      script = opts.script;

  var untrustedHook;
  var isStreamingHook;
  var untrustedTemplate;
  var err = null;
  // At this stage, the hook source code is untrusted ( and should be validated )
  try {
    var _script = require.resolve(__dirname + '/../../../temp/' +  username + "/" + script + '.js');
    delete require.cache[_script];
    untrustedHook = require(_script);
    opts.req.hook = opts.req.hook || {};
    untrustedHook.schema = untrustedHook.schema || {};
    untrustedHook.theme = opts.req.hook.theme || untrustedHook.theme || config.defaultTheme;
    untrustedHook.presenter = opts.req.hook.presenter || untrustedHook.presenter || config.defaultPresenter;
  } catch (e) {
    err = e;
  }

  if (err) {
    return fs.readFile(__dirname + '/../../../temp/' +  username + "/" + script + '.js', function(_err, _source){
      if (_err) {
        throw _err;
        return callback(_err);
      }
      // unable to require Hook as commonjs module,
      // the Hook is invalid
      return callback(err, _source);
    });
  }
  return callback(null, untrustedHook)
};
