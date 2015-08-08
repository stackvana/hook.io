var npm = require('../npm');
var modules = require('../modules');
var config = require('../../../config');
var log = require('../log');
module['exports'] = function spawnService (service, input, output) {

  var isStreaming = false;
  if (input._readableState && input._readableState.buffer && (input._readableState.buffer.length || !input._readableState.ended)) {
    isStreaming = true;
  }

  var __env = {
    params: input.resource.instance,
    isStreaming: isStreaming,
    input: {
      headers: input.headers,
      host: input.host,
      url: input.url,
      connection: {
        remoteAddress: input.connection.remoteAddress
      }
    }
  };

 var debugOutput = [];
  // A simple debug utility for inspecting data from inside a running hook
  var debug = function debug (arg) {
    // create log entry
    var entry = {
      time: new Date(),
      data: JSON.stringify(arg),
      ip : input.connection.remoteAddress
    };
    // push entry to log datasource
    log.push("/" + service.owner + "/" + service.name, entry, function(err, res) {
      if (err) {
        console.log('Error pushing log entry to datasource! ', err.message);
      }
    });
    // push entry into temporary buffer for use in immediate request response
    debugOutput.push(entry);
  };

  // Warning: will contruct a long arguments string
  // Average system limit appears to be about 2mb ( should be well within that limit... )
  // Very large views could eventually hit this limit
  // TODO: return error if size is argv size is hit
  // To detect system limit in bytes run: getconf ARG_MAX
  var spawn = require('child_process').spawn;

  var vm;
  if (config.useChroot) {
     // console.log('spawning in chroot');
     vm = spawn('chroot',
     [config.chrootDirectory, 'run-hook',
      '-c', service.evalSource,
      '-e', JSON.stringify(__env),
      '-s', JSON.stringify(service)
    ]);
  } else {
     // console.log('not spawning in chroot', service, __env);
     vm = spawn('run-hook',
     [
      '-c', service.evalSource,
      '-e', JSON.stringify(__env),
      '-s', JSON.stringify(service)
    ]);
  }

  if (isStreaming) {
    // If the request is still streaming, we are expecting more data to arrive,
    // this data must be piped to the child process
    input.on('data', function(chunk){
      vm.stdin.write(chunk);
    });
    input.on('end', function(){
      vm.stdin.end();
    });
  }


  // If stderr is received, wait a moment and end the request. don't wait for child process
  // TODO: better error handling
  // var erroring = false;
  var ended = false, erroring = false, checkingRegistry = false, vmClosed = false, vmError = false;
  vm.stdout.on('data', function (data) {
    output.write(data);
  });


  // stderr is overloaded here to be used as a one-way messaging device from child process to request
  // this is used for doing such events as logging / setting http headers
  vm.stderr.on('data', function (data) {

    function handleMessage(message) {
      // if the incoming message is a writeHead event, replay that event
      if (message.type === "writeHead") {
        output.writeHead(message.payload.code, message.payload.headers);
      }

      // if the incoming message is end event, signal that is time to end the response
      if (message.type === "end") {
        if (!ended && !checkingRegistry && !erroring) {
          ended = true;
          // output.end();
        }
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
        erroring = true;
        if (message.payload.code === "MODULE_NOT_FOUND") {
          var missingModule = message.payload.error.replace("Cannot find module '", '');
          missingModule = missingModule.substr(0, missingModule.length - 1);

          // if a module is missing, check to see if it is a valid module,
          // ( exists on npm / doesn't attempt to require other files outside root )
          checkingRegistry = true;
          modules.checkRegistry(missingModule, function (err, res){
            if (err) {
              console.log('error communicating with npmjs.org \n\n    ' + err.message)
              output.write(err.message);
              ended = true;
              checkingRegistry = false;
              output.end();
              return;
            }

            message.payload.error = message.payload.error + "\n\n" + "If `" + missingModule + "` is an npm dependency, we are going to try to install it!";
            message.payload.error += '\n' + 'It should be ready in a few moments... \n\n';
            message.payload.error += 'Check https://hook.io/modules/installed for updates.\n';
            message.payload.error += 'Pending installations https://hook.io/modules/pending.\n\n';
            output.write(message.payload.error);
            modules.install(missingModule, function (err, res) {
              // not a typo, modules.install is fire and forget here
              console.log(err, res);
            });
            erroring = false;
            checkingRegistry = false;
            ended = true;
            output.end();
          });
        } else {
          console.log('writing error', message.payload.error);
          // the process is erroring and its not MODULE_NOT_FOUND.
          // we don't know what happened at this point, or how much more error information is coming
          // let's just set a timer to end the request after a few moments
          // this ensures that most ( if not the entire ) error stack gets sent to the client
          if(!ended) {
            //output.write(message.payload.error);
            setTimeout(function(){
              ended = true;
              //output.end();
            }, 200);
          }
        }
      }
    }

    var messages = data.toString();
    // ignore anything coming from stderr that is not a JSON object.
    // This should only happen if the user writes to stderr directly,
    // or if a throw has happened
    // in the case of throw, the stack is incoming and will be sent to the user
    if (messages.substr(0, 1) !== "{") {
      // console.log('ignoring error from stderr', messages);
      return;
    }
    messages = messages.split('\n');
    messages.forEach(function(message){
      if (message.length === 0) {
        return;
      }
      // attempt to parse incoming stderr as JSON message
      try {
        //console.log('dddd', data.toString());
        message = JSON.parse(message.toString());
      } catch (err) {
        //console.log('fff', data.toString(), err)
        // don't do anything, ignore
        message = { "type": "error", "payload": { "error": message.toString() }};
        //console.log('encoded mess', message);
      }
      handleMessage(message);
    });
  });

  vm.on('error', function (err) {
    console.log('writing vm error? ' + err.message);
    vmError = true;
    // ended = true;
    if (!ended) {
      //output.write(err.message)
    }
  });

  vm.on('close', function (code) {
    // console.log(' vm closed? ' + code);
    vmClosed = true;
    if(!checkingRegistry) {
      ended = true;
      output.end();
    }
  });

};