var request = require("hyperquest");
var through = require('through2');
var user = require("../user");
var log = require("../log");
var Datastore = require("../datastore").Datastore;
var mschema = require("mschema");
var streamBuffers = require('stream-buffers');
var through = require('through2');
var Mustache = require("mustache");
var View = require('view').View;
var trycatch = require('trycatch');
var vm = require("vm");
var formatError = require("./formatError");

module['exports'] = function runUntrustedHook (opts, untrustedHook, cb) {

  var hook = require('./');

  var req = opts.req,
      res = opts.res;

  //
  // TODO: add timestamps to console.log output
  //
  //
  // TODO: map console.log to hook.debug
  //

  // Remark: Let's put a special rule for the gateway hook,
  // since the gateway allows arbitrary code and that can call the datastore...
  // and the gateway owner is "Marak"...then all anonymous data would be keyed to Hook owner "Marak"
  // since that would probably mess up Marak's account, we create a special key for anonymous
  // datastore requests coming from gateway.hook.io
  var _root = req.hook.owner;
  if (req.hook.owner === "Marak" && req.hook.name === "gateway") {
   _root = "anonymous";
  }

  // Wrap datastore so that all entries are keyed to owner of hook
  var datastore = new Datastore({ root: _root });

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
     // create log entry
     var entry = {
       time: new Date(),
       data: JSON.stringify(arg),
       ip : opts.req.connection.remoteAddress
     };
     // push entry to log datasource
     log.push("/" + req.hook.owner + "/" + req.hook.name, entry, function(err, res) {
       if (err) {
         console.log('Error pushing log entry to datasource! ', err.message);
       }
     });
     // push entry into temporary buffer for use in immediate request response
     debugOutput.push(entry);
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

  // overwite schema as it might be pulling previous version from database or cache
  // if a schema is specified on the Hook module exports itself, it always should take precedence
  opts.req.hook.mschema = untrustedSchema;

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
  var UNTRUSTED_HOOK_TIMEOUT = 15000,
      inSeconds = UNTRUSTED_HOOK_TIMEOUT / 1000;

  var untrustedHookCompleted = false;
  var untrustedHookCompletedTimer = setTimeout(function(){
    if (!untrustedHookCompleted) {
      return cb(new Error('Request Aborted! Hook source code took more than ' + inSeconds + ' seconds to call hook.res.end()\n\nA delay of this long usually indicates there is an error in the source code for the Hook. \nCheck ' + req.hook.gist + ' to ensure hook.res.end() is being called. \n\nIf there are no errors and the Hook actually requires more than ' + inSeconds + ' seconds to execute, please contact hookmaster@hook.io and we can increase your timeout limits.'));
    }
  }, UNTRUSTED_HOOK_TIMEOUT);
    // this double try / catch should probably not be needed now that we are using vm module...
    // async try / catch is required for async user errors
    trycatch(function() {
      var isStreaming = false;
      if (req._readableState.buffer && req._readableState.buffer.length) {
        isStreaming = true;
      }

      _res.on('finish', function(){
        untrustedHookCompleted = true
      });

      // prepare function to be immediately called
      var str = untrustedHook.evalSource.toString() + "\n module['exports'](hook)";
      // run script in new-context so we can timeout from things like: "while(true) {}"
      try {
        vm.runInNewContext(str, {
          module: module,
          require: require,
          hook: {
            env: req.env,
            debug: debug,
            get: open,
            open: open,
            post: post,
            params: defaults.instance,
            req: opts.req,
            res: _res,
            streaming: isStreaming,
            datastore: datastore,
            __dirname: __dirname
          },
          console: { log: debug }, // map Hook's console.log to our debug method
          rconsole: console        // add a new scope `rconsole` which acts as a real console ( for internal development purpose )
        }, { timeout: UNTRUSTED_HOOK_TIMEOUT });
    } catch (err) {
      // TODO: better error reporting with line number and user fault
      err = formatError(err);
      return opts.res.end(err.message);
    }

    }, function(err) {
      throw err;
      err = formatError(err);
      return opts.res.end(err.message);
      // return cb(err, opts, untrustedHook);
    });

  if (req.resource.params.format === "raw") {
    return cb(null, opts, untrustedHook);
  }

}
