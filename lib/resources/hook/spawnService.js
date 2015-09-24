var npm = require('../npm');
var modules = require('../modules');
var config = require('../../../config');
var log = require('../log');
var stderr = require('./stderr');
var psr = require('parse-service-request');
var kill = require('tree-kill');

var generateArguments = {
  bash: require('./generateCommandLineArguments/bash'),
  lua: require('./generateCommandLineArguments/lua'),
  perl: require('./generateCommandLineArguments/perl'),
  scheme: require('./generateCommandLineArguments/scheme'),
  smalltalk: require('./generateCommandLineArguments/smalltalk'),
  tcl: require('./generateCommandLineArguments/tcl')
};

module['exports'] = function spawnService (service, input, output) {

  /*
     Possible results of spawnService

       Remark: these are use as a reference for now and are possibly not complete / correct
               will most likely develop these into unit tests

       vm opens -> service calls res.end -> vm closes -> response
       vm opens -> service throws error -> vm closes -> response
       vm opens -> service throws module missing -> vm closes -> npm installs -> response
       vm opens -> service throws timeout error -> vm closes -> response
       vm opens -> vm error -> vm closes -> response

    Child process spawn lifecycle

      Important: Mapping the lifecycle of spawning the child process is essential in
                 understanding which events fire in what order on various spawn conditions.
                 In many cases if we do not correctly track all STDIO and HTTP stream events,
                 we will lose the error stack from the spawned binary ( or return 500 ).
                 Errror stacks from spawned services should *always* be returned to the client.
                 The client should *never* see 500 errors or stream disconnect errors.

      Child process Spawn Error lifecycle ( such as missing binary or bad options to chroot )
        vm.stdin.error
        vm.exit
        vm.stdout.end
        vm.stderr

  */

  // keep track of the various statuses that can result from service spawning
  // it's important to understand what the vm is currently doing in order to,
  // respond correctly to the client request
  var status = {
    ended: false,
    erroring: false,
    checkingRegistry: false,
    stdoutEnded: false,
    serviceEnded: false,
    vmClosed: false,
    vmError: false
  };

  var isStreaming = false;
  if (input._readableState && input._readableState.buffer && (input._readableState.buffer.length || !input._readableState.ended)) {
    isStreaming = true;
  }

  var __env = {
    params: input.resource.instance,
    isStreaming: isStreaming,
    env: input.env,
    input: {
      method: input.method,
      headers: input.headers,
      host: input.host,
      path: input.path,
      params: input.params,
      url: input.url,
      connection: {
        remoteAddress: input.connection.remoteAddress
      }
    }
  };

 var debugOutput = [];
  // A simple debug utility for inspecting data from inside a running hook
  var debug = function debug () {
    var args = [];
    for (var a in arguments) {
      args.push(arguments[a]);
    }
    if (args.length === 1) {
      args = args[0];
    }
    // create log entry
    var entry = {
      time: new Date(),
      data: JSON.stringify(args),
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

  // default target spawning binary to `run-hook`,
  // this is the default node.js / javascript binary
  var targetBinary = "run-hook";

  var targetLanguage = service.language;

  // put some guards up for legacy data ( prior to Hook.langauge )
  // this is used to ensure previous data without default values still work
  // we could also run a migration script
  if (typeof targetLanguage === "undefined" || targetLanguage === "javascript" || targetLanguage === "") {
    targetLanguage = "javascript";
  }
  var vm;

  var binaries = {
    "bash": "run-hook-bash",
    "coffee-script": "run-hook",
    "coffee": "run-hook",
    "lua": "run-hook-lua",
    "javascript": "run-hook",
    "perl": "run-hook-perl",
    "php": "run-hook-php",
    "python": "run-hook-python",
    "ruby": "run-hook-ruby",
    "scheme": "run-hook-scheme",
    "smalltalk": "run-hook-smalltalk",
    "tcl": "run-hook-tcl"
  };
  targetBinary = binaries[targetLanguage];

  var binaryArgs = [];

  /*
      Generate specific command line arguments per target binary

      Remark: certain target binaries have arguments which may conflict
      Note the default case, as this is generally used

  */

  function preprocessCommandLineArguments (cb) {

    if (typeof generateArguments[targetLanguage] === "function") {
      binaryArgs = generateArguments[targetLanguage](service, __env);
    } else {
      binaryArgs = [
        '-c', service.evalSource,
        '-e', JSON.stringify(__env),
        '-s', JSON.stringify(service)
      ];
    }

  }

  if (targetLanguage !== "javascript") {
    // currently, only JavaScript is able to handle parsing incoming requests
    // we have req.resource.params available, but not form fields,
    // as the request is still streaming ( we have not buffered the form fields )
    // for the not fully supported languages, we will parse the request here using node ( for now )
    psr(input, output, function (req, res, fields){
      for (var p in fields) {
        __env.params[p] = fields[p];
      }
       preprocessCommandLineArguments();
       //console.log(targetBinary, binaryArgs);
        vm = spawn(targetBinary, binaryArgs);
        finish();
    });
  } else {
    preprocessCommandLineArguments();
    vm = spawn(targetBinary, binaryArgs);
    finish();
  }

  /*
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
  */

  function finish () {

    var UNTRUSTED_HOOK_TIMEOUT = config.UNTRUSTED_HOOK_TIMEOUT,
        inSeconds = UNTRUSTED_HOOK_TIMEOUT / 1000;

    var serviceCompleted = false;
    var serviceCompletedTimer = setTimeout(function(){
      if (!serviceCompleted && !status.ended && !status.checkingRegistry) {
        status.ended = true;
        output.write(config.messages.serviceExecutionTimeout(inSeconds));
        //
        // at this stage, we don't know if the child process is going to exit
        // it might exit, but it's taken too long at this point
        // we need to gracefully kill the child process
        //
        // uses tree-kill.kill() method
        // this is a multi-level kill command which is suppose to kill,
        // all child processes and any subprocesses spawned by their subprocess chain
        // this should ensure we don't get zombie processes
        kill(vm.pid, 'SIGKILL', function(err) {
          if (err) {
            // when exactly can an error happen here?
            console.log("SIGKILL ERROR", err.message);
          }
          // do we need to do anything with this event?
          // Note: kill() is also a sync command
        });
        endResponse();
      }
    }, UNTRUSTED_HOOK_TIMEOUT);

    function endResponse () {
      serviceCompletedTimer = clearTimeout(serviceCompletedTimer);
      serviceCompleted = true;
      output.end();
    };

    vm.stdout.on('data', function (data) {
      // TODO: seems to be an issue where with view-presenter?
      // we shouldn't have an out of band output.finished,
      // as we should have the entire lifecycle mapped in status object
      console.log('vm.stdout.data', status, data.toString(), output.finished);
      if (!status.ended && output.finished !== true) {
        output.write(data);
      }
    });

    var stdoutEnded = false;
    vm.stdout.on('end', function (data) {
      status.stdoutEnded = true;
      console.log('vm.stdout.end', status);
      if (!status.checkingRegistry && !status.ended && !status.erroring) {
        status.ended = true;
        endResponse();
      }
    });

    vm.stdin.on('error', function (data) {
      status.stdinError = true;
      console.log('vm.stdin.error', status, data);
      // do nothing with this error?
      // without this error handler, `run-remote-service` will experience an uncaught stream error,
      // this is bad, because we lose the error stack with the uncaught stream error
    });

    // stderr is overloaded here to be used as a one-way messaging device from child process to request
    // this is used for doing such events as logging / setting http headers
    vm.stderr.on('data', function (data) {
      console.log('vm.stderr.data', data.toString())
      stderr.onData(data, status, debug, output);
    });

    vm.on('error', function (err) {
      console.log('vm.error' + err.message);
      status.vmError = true;
      if (!status.ended) {
        status.ended = true;
        output.write(err.message);
        //console.log('vm error called endResponse()');
        endResponse();
      }
    });

    vm.on('exit', function (code, signal) {
      console.log('vm.exit', code, signal, status);
      status.vmClosed = true;
      if(!status.checkingRegistry && !status.ended && !status.stdoutEnded) {
        //status.ended = true;
        if (code === 1) {
          status.erroring = true;
          status.vmError = true;
          //output.write(config.messages.childProcessSpawnError(binaryArgs));
        }
        if (code > 1) {
          status.erroring = true;
          status.vmError = true;
          //output.write('Unknown spawn error code: ' + code.toString() + " please contact support.");
        }
        if (signal !== null && typeof signal !== "undefined") {
          status.erroring = true;
          status.vmError = true;
        }
        // Remark: we could end the response here, but the child spawn lifecycle dictates we must,
        //         wait for vm.stdout.end and vm.stderr
        //endResponse();
      }
    });
    input.pipe(vm.stdin);
  }

};