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

  console.log('running untrusted hook', opts.req.resource.params)
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

    if (req.resource.params.format === "raw") {
      cb(null, {
        output: content, //hookOutput,
        debug: debugOutput,
        params: defaults.instance,
        headers: _headers,
        hook: {
          schema: untrustedSchema
        }
      })
    }

    var _view = new View({ template: strTheme, presenter: opts.presenter });

    // give the presenter 3 seconds to render, or else it has failed
    var completedTimer = setTimeout(function(){
      if (!completed) {
        return cb(new Error('Hook presenter took more than 3 seconds to load. Aborting request. \n\nA delay of this long usually means the presenter never fired it\'s callback. Check the presenter code for error. \n\nIf this is not the case and you require more than 3 seconds to present your view, please contact hookmaster@hook.io'));
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
   output.writeHead(500);
   output.write(JSON.stringify(defaults.errors, true, 2));
   output.end();
   return cb(defaults.errors, opts, untrustedHook)
   //return hook.postprocessHook(false, opts, untrustedHook);
   //return opts.res.end(JSON.stringify(defaults.errors, true, 2))
  }

  // async try / catch is required for async user errors
  trycatch(function() {
    var isStreaming = false;
    if (req._readableState.buffer && req._readableState.buffer.length) {
      isStreaming = true;
    }
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
    console.log(err.stack);
    return cb(err, opts, untrustedHook)
  });

}
