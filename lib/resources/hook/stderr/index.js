var modules = require('../../modules');
var responseMethods = require('./responseMethods');

var stderr = {};
module['exports'] = stderr;

// processes incoming stderr buffer
stderr.onData = function onStderrData (data, status, debug, output) {
  var messages = data.toString();


  // Remark: Ignore special case"\nmodule.js:333", which is module require error
  //         This is a bit brittle, but is okay for now
  if (messages.substr(0, 1) !== "{" && messages.substr(0, 14) !== "\nmodule.js:333") {
    // Remark: Encode any non JSON messages as a JSON error message
    var message = { "type": "error", "payload": { "error": messages }};
    return handleMessage(message, status, debug, output);
  } 
  messages = messages.split('\n');
  messages.forEach(function(message){
    if (message.length === 0) {
      return;
    }
    // attempt to parse incoming stderr as JSON message
    try {
      message = JSON.parse(message.toString());
    } catch (err) {
      // don't do anything, ignore
      // message = { "type": "error", "payload": { "error": message.toString() }};
    }
    handleMessage(message, status, debug, output);
  });
};

var handleMessage = stderr.handleMessage = function (message, status, debug, output) {

  /*
    stderr message types:

    error: error event from vm, send error stack as plaintext to client.
    log: console.log logging event, send log entry to logging system
    end: hook.res.end was called inside the vm, call output.end()
    untyped: any untyped messages are considered type `error` and will be wrapped as error types

  */

  // check to see if incoming message is a response method ( like res.writeHead )
  if(typeof responseMethods[message.type] === "function") {
    responseMethods[message.type](message, output);
    return;
  }

  // if the incoming message is end event, signal that is time to end the response
  if (message.type === "end") {
    status.serviceEnded = true;
  }

  // send logging messages to the debug function ( redis logs at this point )
  if (message.type === "log") {
    debug(message.payload.entry);
    return;
  }
  // if the incoming message is an error
  if (message.type === "error") {
    // let's do some custom behavior for MODULE_NOT_FOUND errors,
    // i.e. require('colors') when colors is not installed
    status.erroring = true;
    if (message.payload.code === "MODULE_NOT_FOUND") {
      var missingModule = message.payload.error.replace("Cannot find module '", '');
      missingModule = missingModule.substr(0, missingModule.length - 1);
      // fetch the root module of a require call eg:
      // var a = require('a/b')
      missingModule = missingModule.split('/')[0];

      // if a module is missing, check to see if it is a valid module,
      // ( exists on npm / doesn't attempt to require other files outside root )
      status.checkingRegistry = true;
      modules.checkRegistry(missingModule, function (err, res){
        if (err) {
          // console.log('error communicating with npmjs.org \n\n    ' + err.message)
          output.write(err.message);
          status.ended = true;
          status.checkingRegistry = false;
          // console.log('npm error called output.end()');
          output.end();
          return;
        }

        modules.checkAlready(missingModule, function(err, exists, status){
          if (err) {
            return cb(err);
          }
          // TODO: allow re-installs
          if (exists === "pending") {
            output.write(missingModule + ' already exists and is ' + status);
            status.ended = true;
            status.checkingRegistry = false;
            output.end();
            return
          }

          message.payload.error = message.payload.error + "\n\n" + "If `" + missingModule + "` is an npm dependency, we are going to try to install it!";
          message.payload.error += '\n' + 'It should be ready in a few moments... \n\n';
          message.payload.error += 'Check https://hook.io/modules/installed for updates.\n';
          message.payload.error += 'Pending installations https://hook.io/modules/pending.\n\n';
          output.write(message.payload.error);
          modules.install(missingModule, function (err, res) {
            // not a typo, modules.install is fire and forget here
            // console.log(err, res);
          });
          status.erroring = false;
          status.checkingRegistry = false;
          if(!status.ended) {
            //console.log('npm found module called output.end()');
            output.end();
          }
        });


      });
    } else {
      status.erroring = true;
      // the process is erroring and its not MODULE_NOT_FOUND.
      // we don't know what happened at this point, or how much more error information is coming
      // let's just set a timer to end the request after a few moments
      // this ensures that most ( if not the entire ) error stack gets sent to the client
      if(!status.ended && output) {
        output.write(message.payload.error);
        setTimeout(function(){
          status.ended = true;
          console.log('erroring timeout called output.end()');
          output.end();
        }, 200);
      }
    }
  }
}