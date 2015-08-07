var npm = require('../npm');
var modules = require('../modules');
var config = require('../../../config');
var log = require('../log');
module['exports'] = function spawnService (service, input, output) {

  var isStreaming = false;
  if (input._readableState && input._readableState.buffer && input._readableState.buffer.length) {
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
     // console.log('not spawning in chroot');
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

  vm.stdout.on('data', function (data) {
    output.write(data);
  });

  // If stderr is received, wait a moment and end the request. don't wait for child process
  // TODO: better error handling
  // var erroring = false;
  var ended = false, erroring = false;

  // stderr is overloaded here to be used as a one-way messaging device from child process to request
  // this is used for doing such events as logging / setting http headers
  vm.stderr.on('data', function (data) {
    // console.log('err', data.toString())
    var message = {};
    // attempt to parse incoming stderr as JSON message
    try {
      message = JSON.parse(data.toString());
    } catch (err) {
      // don't do anything, ignore
      //message = { "type": "error", "payload": { "error": data.toString() }};
    }

    // if the incoming message is a writeHead event, replay that event
    if (message.type === "writeHead") {
      output.writeHead(message.payload.code, message.payload.headers);
    }

    // if the incoming message is end event, signal that is time to end the response
    if (message.type === "end") {
      if (!ended) {
        ended = true;
      }
    }

    // send logging messages to the debug function ( redis logs at this point )
    if (message.type === "log") {
      // TODO: logging = true;
      debug(message.payload.entry);
      return;
    }
    // if the incoming message is an error
    if (message.type === "error") {
      erroring = true
      // let's do some custom behavior for MODULE_NOT_FOUND errors,
      // i.e. require('colors') when colors is not installed
      if (message.payload.code === "MODULE_NOT_FOUND") {
        var missingModule = message.payload.error.replace("Cannot find module '", '');
        missingModule = missingModule.substr(0, missingModule.length - 1);
        message.payload.error = message.payload.error + "\n\n" + "If `" + missingModule + "` is an npm dependency, we are going to try to install it!";
        message.payload.error += '\n' +  missingModule + ' has been added to our installation queue. https://hook.io/modules/pending \n\n';
        message.payload.error += 'It should be ready in a few moments... \n\n';
        output.write(message.payload.error);
        erroring = false;
        modules.install(missingModule, function (err, res) {
          // output.write(err);
          console.log(err, res);
        });
      } else {
        if (!ended) {
          output.write(message.payload.error);
        }
      }
      function endService () {
        if (erroring) {
          erroring = false;
          setTimeout(endService, 200);
          return;
        }
        if (!ended) {
          ended = true;
          output.end();
        }
      }
      if (!ended) {
        endService();
      }
    }
  });

  vm.on('close', function (code) {
    ended = true;
    // console.log('child process exited with code ' + code);
    if (!erroring) {
      output.end();
    }
  });

};
