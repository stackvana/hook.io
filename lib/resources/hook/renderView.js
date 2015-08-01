var View = require('view').View;
var through = require('through2');
var streamBuffers = require('stream-buffers');
var Mustache = require("mustache");
var formatError = require('./formatError');

module['exports'] = function renderView (req, res, cb) {

  // create a new buffer and output stream for capturing the hook.res.write and hook.res.end calls from inside the hook
  // this is used as an intermediary to pipe hook output to other streams ( such as another hook )
  var hookOutput = new streamBuffers.WritableStreamBuffer({
      initialSize: (100 * 1024),        // start as 100 kilobytes.
      incrementAmount: (10 * 1024)    // grow by 10 kilobytes each time buffer overflows.
  });

  var debugOutput = [];

  var _headers = {
    code: null,
    headers: {}
  };
  var output = through(function (chunk, enc, callback) {
    console.log('writing chunk');
    hookOutput.write(chunk);
    callback()
  }, function(){
    console.log('complete')
    var content = hookOutput.getContents();
    // Apply basic mustache replacements
    var strTheme = req.view;
    strTheme = Mustache.render(strTheme, {
      hook: {
        output: content.toString(),
        debug: JSON.stringify(debugOutput, true, 2),
        params: req.resource.instance,
        headers: _headers,
        schema: req.untrustedService.schema
      }
    });
    console.log('strtheme', strTheme)
    var _view = new View({ template: strTheme, presenter: req.presenter });

    // give the presenter 3 seconds to render, or else it has failed
    var completedTimer = setTimeout(function(){
      if (!completed) {
        return cb(new Error('Hook presenter took more than 3 seconds to load. Aborting request. \n\nA delay of this long usually indicates the presenter never fired it\'s callback. Check the presenter code for error. \n\nIf this is not the case and you require more than 3 seconds to present your view, please contact hookmaster@hook.io'));
      }
    }, 3000);
    var completed = false;
    console.log('cc', content.toString())
    try { // this will catch user run-time errors in the presenter
      _view.present({
        request: req,
        response: res,
        output: content,
        debug: debugOutput,
        instance: req.resource.instance,
        params: req.resource.params,
        headers: _headers
      }, function(err, rendered){
        completed = true;
        completedTimer = clearTimeout(completed);
        console.log('complete present', err, rendered.toString());
//        res.writeHead('C')
        res.end(rendered.toString());
        /*
        cb(null, {
          output: rendered,
          debug: debugOutput,
          params: defaults.instance,
          headers: _headers,
          hook: {
            schema: untrustedSchema
          }
        });
        */
      });
    } catch (err) {
      /*
      cb(err);
      */
      return res.end(formatError(err).message);
    }


  });

  output.writeHead = function (code, headers) {
    _headers.code = code;
    for(var h in headers) {
      _headers.headers[h] = headers[h];
    }
  };

  cb(null, req, output);
  
};