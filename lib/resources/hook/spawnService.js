var npm = require('../npm');
var modules = require('../modules');
var config = require('../../../config');
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
    var message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      message = { "type": "error", "payload": { "error": data.toString() }};
    }
    // console.log(message)
    if (message !== "") {
      if (message.type === "writeHead") {
        output.writeHead(message.payload.code, message.payload.headers);
      }
      if (message.type === "end") {
        if (!ended) {
          output.end();
          ended = true;
        }
      }
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
          modules.install(missingModule, function (err, res){
            // output.write(err);
            console.log(err, res);
          });
        } else {
          output.write(message.payload.error);
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
          // output.write(message.payload.error);
          endService();
        }
      }
    } else {
      output.write(data);
    }
  });

  vm.on('close', function (code) {
    //console.log('child process exited with code ' + code);
    if (!ended && !erroring) {
      output.end();
      ended = true;
    }
  });

};
