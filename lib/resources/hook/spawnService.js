var npm = require('../npm');
var modules = require('../modules');
var config = require('../../../config');
var log = require('../log');
var stderr = require('./stderr');

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

  var binaries = {
    "bash": "run-hook-bash",
    "coffee-script": "run-hook",
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

  // TODO: move all this code to separate modules
  switch (targetLanguage) {

    case 'bash':
      // parsing JSON in bash is not so great
      // instead, just iterate through all our properties,
      // and generate a bunch of unique keys
      var bashInject = "";
      bashInject += 'Hook="The Hook object isnt a bash object.";\n'
      bashInject += 'Hook_params="The Hook.params object isnt a bash object.";\n'
      for (var p in __env) {
        if (typeof __env[p] === "object") {
          for (var s in __env[p]) {
            bashInject += 'Hook_' + p + '_' + s + '="' + __env[p][s] + '";\n'
          }
        } else {
          bashInject += 'Hook_' + p + '="' + __env[p] + '";\n'
        }
      }
      binaryArgs = [
        '-code', service.evalSource,
        '-service', JSON.stringify(service),
        '-payload', bashInject
      ];
    break;

    case 'lua':
      // TODO: replace naive _ style variable assignment with lua table
      // see: http://www.lua.org/pil/19.html

      var luaInject = "";

      //luaInject += 'Hook = "The Hook object isnt a lua array."\n';
      //luaInject += 'Hook_params = "The Hook.params object isnt a lua array."\n';

      for (var p in __env) {
        if (typeof __env[p] === "object") {
          for (var s in __env[p]) {
            luaInject += 'Hook_' + p + '_' + s + ' = \'' + __env[p][s] + '\'\n'
          }
        } else {
          luaInject += 'Hook_' + p + ' = \'' + __env[p] + '\'\n'
        }
      }
      //luaInject = 'Hook_params_source = "The Hook object isnt a lua array."\n';
      binaryArgs = [
        '-code', service.evalSource,
        '-service', JSON.stringify(service),
        '-payload', luaInject
      ];

    break;

    case 'perl':

      var perlInject = "";

      perlInject += '$Hook = "The Hook object isnt an object.";\n';
      perlInject += '$Hook_params = "The Hook.params object isnt an object.";\n';

      for (var p in __env) {
        if (typeof __env[p] === "object") {
          for (var s in __env[p]) {
            perlInject += '$Hook_' + p + '_' + s + ' = \'' + __env[p][s] + '\';\n'
          }
        } else {
          perlInject += '$Hook_' + p + ' = \'' + __env[p] + '\';\n'
        }
      }
      binaryArgs = [
        '-code', service.evalSource,
        '-service', JSON.stringify(service),
        '-payload', perlInject
      ];

    break;

    case 'scheme':

      var schemeInject = "";

      //schemeInject += '$Hook = "The Hook object isnt an object.";\n';
      //schemeInject += '$Hook_params = "The Hook.params object isnt an object.";\n';

      for (var p in __env) {
        if (typeof __env[p] === "object") {
          for (var s in __env[p]) {
            schemeInject += "(define Hook_" + p + "_" + s + " '(" + __env[p][s] + "))\n";
          }
        } else {
          schemeInject += "(define Hook_" + p + " '(" + __env[p] + "))\n";
        }
      }
      binaryArgs = [
        '-c', schemeInject + '\n' + service.evalSource
      ];

    break;

    case 'smalltalk':

      var smalltalkInject = "";

      //schemeInject += '$Hook = "The Hook object isnt an object.";\n';
      //schemeInject += '$Hook_params = "The Hook.params object isnt an object.";\n';

      for (var p in __env) {
        if (typeof __env[p] === "object") {
          for (var s in __env[p]) {
            var val = __env[p][s];
            if (typeof val === "object") {
              // TODO: serialize value
              val = "unavailable";
            }
            //schemeInject += '$Hook_' + p + '_' + s + ' = \'' + __env[p][s] + '\';\n'
            smalltalkInject += "Hook_" + p + "_" + s + " := \'" + val + "\'.\n";
          }
        } else {
          smalltalkInject += "Hook_" + p + " := \'" + __env[p] + "\'.\n";
        }
      }

      binaryArgs = [
        '-a', '',
        '-code', smalltalkInject  + service.evalSource,
        '-env', JSON.stringify(__env),
        '-service', JSON.stringify(service)
      ];
    break;

    case 'tcl':

      var tclInject = "";

      // TODO: fix issues with escaping " and ' in property values

      for (var p in __env) {
        if (typeof __env[p] === "object") {
          for (var s in __env[p]) {
            var val = __env[p][s];
            if (typeof val === "object") {
              // TODO: serialize value
              val = "unavailable";
            }
            //schemeInject += '$Hook_' + p + '_' + s + ' = \'' + __env[p][s] + '\';\n'
            tclInject += "set Hook_" + p + "_" + s + " \"" + val + "\"\n";
          }
        } else {
            tclInject += "set Hook_" + p + " \"" + __env[p] + "\"\n";
          // schemeInject ++ "(define " + p + " '())";
          //schemeInject += '$Hook_' + p + ' = \'' + __env[p] + '\';\n'
        }
      }
      //luaInject = 'Hook_params_source = "The Hook object isnt a lua array."\n';
      binaryArgs = [
        '-c', service.evalSource,
        '-s', JSON.stringify(service),
        '-p', tclInject
      ];

    break;

    default:
      binaryArgs = [
        '-c', service.evalSource,
        '-e', JSON.stringify(__env),
        '-s', JSON.stringify(service)
      ];
    break;
  }

  var vm;
  if (config.useChroot) {
    // TODO: double check before deploy
    // console.log('spawning in chroot');
    binaryArgs.unshift(targetBinary);
    binaryArgs.unshift(config.chrootDirectory);
     vm = spawn('chroot',
     binaryArgs);
  } else {
     // console.log('not spawning in chroot', service, __env);
     vm = spawn(targetBinary,
     binaryArgs);
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

  vm.stdout.on('data', function (data) {
    //console.log(data.toString());
    output.write(data);
  });

  var stdoutEnded = false;
  vm.stdout.on('end', function (data) {
    status.stdoutEnded = true;
    //console.log('stdout end', status.checkingRegistry, status.ended)
    if (!status.checkingRegistry && !status.ended) {
      status.ended = true;
      //console.log('stdout close called output.end()');
      output.end();
    }
  });

  // stderr is overloaded here to be used as a one-way messaging device from child process to request
  // this is used for doing such events as logging / setting http headers
  vm.stderr.on('data', function (data) {
    //console.log('err', data.toString())
    stderr.onData(data, status, debug, output);
  });

  vm.on('error', function (err) {
    //console.log('writing vm error? ' + err.message);
    status.vmError = true;
    if (!status.ended) {
      status.ended = true;
      output.write(err.message);
      //console.log('vm error called output.end()');
      output.end();
    }
  });

  vm.on('exit', function (code) {
    //console.log(' vm exit? ' + code, status.checkingRegistry, status.ended);
    status.vmClosed = true;
    if(!status.checkingRegistry && !status.ended && !status.stdoutEnded) {
      status.ended = true;
      //console.log('vm exit called output.end()');
      output.end();
    }
  });

  input.pipe(vm.stdin);

};