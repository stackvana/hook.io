var request = require("hyperquest");
var through = require('through2');
var user = require("../user");
var mschema = require("mschema");
var streamBuffers = require('stream-buffers');
var through = require('through2');
var Mustache = require("mustache");
var View = require('view').View;
var trycatch = require('trycatch');

module['exports'] = function runUntrustedHook (opts, untrustedHook, cb) {

  var hook = require('./');

  var req = opts.req,
      res = opts.res;

  //
  // TODO: add timestamps to console.log output
  //
  console.log('running untrusted hook', opts.req.resource.params);

  var untrustedSchema = untrustedHook.schema || {};
  var defaults = mschema.validate(opts.req.resource.params, untrustedHook.schema || {}, { strict: false });
  var debugOutput = [];
   var open = function open (url) {
     return request(url, {
       "headers": {
         "accept": "*/*"
       }
     });
   };

   var post = function post (url) {
     return request.post(url, {
       "headers": {
         "accept": "*/*"
       }
     });
   };

   // A simple debug utility for inspecting data from inside a running hook
   var debug = function debug (arg) {
     debugOutput.push({
       time: new Date(),
       data: arg,
       ip : opts.req.connection.remoteAddress
     })
   };

   // create a new buffer and output stream for capturing the hook.res.write and hook.res.end calls from inside the hook
   // this is used as an intermediary to pipe hook output to other streams ( such as another hook )
   var hookOutput = new streamBuffers.WritableStreamBuffer({
       initialSize: (100 * 1024),        // start as 100 kilobytes.
       incrementAmount: (10 * 1024)    // grow by 10 kilobytes each time buffer overflows.
   });

   var _headers = {
     code: null,
     headers: {}
   };

  var output = through(function (chunk, enc, callback) {
    hookOutput.write(chunk);
    callback()
  }, function(){
    var content = hookOutput.getContents();
    // Apply basic mustache replacements
    var strTheme = opts.theme;
    strTheme = Mustache.render(strTheme, {
      hook: {
        output: content.toString(),
        debug: JSON.stringify(debugOutput, true, 2),
        params: defaults.instance,
        headers: _headers,
        schema: untrustedSchema
      }
    });

    var _view = new View({ template: strTheme, presenter: opts.presenter });

    // give the presenter 3 seconds to render, or else it has failed
    var completedTimer = setTimeout(function(){
      if (!completed) {
        return cb(new Error('Hook presenter took more than 3 seconds to load. Aborting request. \n\nA delay of this long usually indicates the presenter never fired it\'s callback. Check the presenter code for error. \n\nIf this is not the case and you require more than 3 seconds to present your view, please contact hookmaster@hook.io'));
      }
    }, 3000);
    var completed = false;

    try { // this will catch user run-time errors in the presenter
      _view.present({
        request: req,
        response: res,
        output: content,
        debug: debugOutput,
        instance: defaults.instance,
        params: opts.req.resource.params,
        headers: _headers
      }, function(err, rendered){
        completed = true;
        completedTimer = clearTimeout(completed);
        cb(null, {
          output: rendered,
          debug: debugOutput,
          params: defaults.instance,
          headers: _headers,
          hook: {
            schema: untrustedSchema
          }
        });
      });
    } catch (err) {
      cb(err);
    }


  });
  var _res = res;
  output.writeHead = function (code, headers) {
    _headers.code = code;
    for(var h in headers) {
      _headers.headers[h] = headers[h];
    }
  };

  if (opts.params.format === "friendly") {
    _res = output;
  }

  if (defaults.valid === false) {

   // Remark: Let's reserve 500 errors for actual hook.io server errors,
   // Do not use 500 code for hook input validation errors.

   // Remark: Let's not write to the response for validation errors here,
   // better to continue forward with the error and let whoever called Hook.run handle the output

   //_res.writeHead(500);
   //_res.write(JSON.stringify(defaults.errors, true, 2));
   //_res.end();
   //return;

   // An input validation error occurred, continue forward without trying to run the untrustedHook
   return cb(defaults.errors, opts, untrustedHook);
  }

  // Do not let the Hook wait more than UNTRUSTED_HOOK_TIMEOUT until it assumes hook.res.end() will never be called...
  // This could cause issues with streaming hooks. We can increase this timeout...or perform static code analysis.
  // The reason we have this timeout is to prevent users from running hooks that never call hook.res.end() and hang forever
  var UNTRUSTED_HOOK_TIMEOUT = 10000,
      inSeconds = UNTRUSTED_HOOK_TIMEOUT / 1000;

  var untrustedHookCompleted = false;
  var untrustedHookCompletedTimer = setTimeout(function(){
    if (!untrustedHookCompleted) {
      return cb(new Error('Request Aborted! Hook source code took more than ' + inSeconds + ' seconds to call hook.res.end()\n\nA delay of this long usually indicates there is an error in the source code for the Hook. \nCheck ' + req.hook.gist + ' to ensure hook.res.end() is being called. \n\nIf there are no errors and the Hook actually requires more than ' + inSeconds + ' seconds to execute, please contact hookmaster@hook.io and we can increase your timeout limits.'));
    }
  }, UNTRUSTED_HOOK_TIMEOUT);

  // async try / catch is required for async user errors
  trycatch(function() {
    var isStreaming = false;
    if (req._readableState.buffer && req._readableState.buffer.length) {
      isStreaming = true;
    }
    _res.on('finish', function(){
      untrustedHookCompleted = true
    });
    untrustedHook({
      env: req.env,
      debug: debug,
      get: open,
      open: open,
      post: post,
      params: defaults.instance,
      req: opts.req,
      res: _res,
      streaming: isStreaming
    });
  }, function(err) {
    console.log('Error', opts.req.url, err.stack);
    return cb(err, opts, untrustedHook);
  });

  if (req.resource.params.format === "raw") {
    return cb(null, opts, untrustedHook);
  }

}
