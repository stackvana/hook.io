var through = require('through2');
var trycatch = require('trycatch');
var vm = require("vm");

module['exports'] = function runUntrustedHook (config) {

  config = config || {};

  return function _runUntrustedHook (req, res, cb) {

    config.errorHandler = config.errorHandler || function defaultServiceErrorHandler (error) {
      return res.end(err.message);
    };

    var errorHandler = config.errorHandler;
    var hook = require('./');

    var untrustedHook = req.untrustedHook;

    // overwite schema as it might be pulling previous version from database or cache
    // if a schema is specified on the Hook module exports itself, it always should take precedence
    req.hook.mschema = untrustedHook.schema;

    // Do not let the Hook wait more than UNTRUSTED_HOOK_TIMEOUT until it assumes hook.res.end() will never be called...
    // This could cause issues with streaming hooks. We can increase this timeout...or perform static code analysis.
    // The reason we have this timeout is to prevent users from running hooks that never call hook.res.end() and hang forever
    var UNTRUSTED_HOOK_TIMEOUT = 15000,
        inSeconds = UNTRUSTED_HOOK_TIMEOUT / 1000;

    var untrustedHookCompleted = false;
    var untrustedHookCompletedTimer = setTimeout(function(){
      if (!untrustedHookCompleted) {
        return errorHandler(new Error('Request Aborted! Hook source code took more than ' + inSeconds + ' seconds to call hook.res.end()\n\nA delay of this long usually indicates there is an error in the source code for the Hook. \nCheck ' + req.hook.gist + ' to ensure hook.res.end() is being called. \n\nIf there are no errors and the Hook actually requires more than ' + inSeconds + ' seconds to execute, please contact hookmaster@hook.io and we can increase your timeout limits.'));
      }
    }, UNTRUSTED_HOOK_TIMEOUT);

    // this double try / catch should probably not be needed now that we are using vm module...
    // async try / catch is required for async user errors
    trycatch(function() {
      var isStreaming = false;
      if (req._readableState.buffer && req._readableState.buffer.length) {
        isStreaming = true;
      }

      res.on('finish', function(){
        untrustedHookCompleted = true
      });

      // prepare function to be immediately called
      var str = untrustedHook.evalSource.toString() + "\n module['exports'](hook)";
      // run script in new-context so we can timeout from things like: "while(true) {}"

      var _serviceEnv = {
          env: req.env,
          params: req.resource.instance,
          req: req,
          res: res,
          streaming: isStreaming,
          __dirname: __dirname
        };

      // If any addition env variables have been passed in that require a context inside the vm fn
      if (typeof config.env === "object") {
        for (var e in config.env) {
          _serviceEnv[e] = config.env[e];
        }
      }

      var _vmEnv = {
        module: module,
        require: require,
        hook: _serviceEnv, 
        rconsole: console       // add a new scope `rconsole` which acts as a real console ( for internal development purpose )
      };

      // If any addition vm variables have been passed in that require a top-level context in the VM
      if (typeof config.vm === "object") {
        for (var e in config.vm) {
          _vmEnv[e] = config.vm[e];
        }
      }

      try {
        vm.runInNewContext(str, _vmEnv, { timeout: UNTRUSTED_HOOK_TIMEOUT });
      } catch (err) {
        // TODO: better error reporting with line number and user fault
        return errorHandler(err);
      }
    }, function(err) {
      return errorHandler(err);
    });
  }
}