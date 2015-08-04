module['exports'] = function spawnService (service, input, output) {

  var __env = {
    params: input.resource.instance,
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
  var spawn = require('child_process').spawn,
      vm    = spawn('chroot',
      ['/Users/chroot', 'run-hook',
       '-c', service.evalSource,
       '-e', JSON.stringify(__env),
       '-s', JSON.stringify(service)
     ]);

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
        if (!ended) {
          output.write(message.payload.error);
          if (!erroring) {
            erroring = true;
            setTimeout(function(){
              output.end();
              ended = true;
            }, 100);
          }
        }
      }
    } else {
      output.write(data);
    }
  });

  vm.on('close', function (code) {
    //console.log('child process exited with code ' + code);
    if (!ended) {
      output.end();
      ended = true;
    }
  });

};