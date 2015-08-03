module['exports'] = function spawnService (input, output) {

  var __env = {
    params: req.resource.instance,
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
      ['/Users/chroot', 'run-service',
       '-c', userModule.evalSource,
       '-e', JSON.stringify(__env)
     ]);

  vm.stdout.on('data', function (data) {
    output.write(data);
    //console.log('stdout: ' + data);
  });

  // If stderr is received, wait a moment and end the request. don't wait for child process
  // TODO: better error handling
  var erroring = false;
  vm.stderr.on('data', function (data) {
    if (!erroring) {
      erroring = true;
      setTimeout(function(){
        output.end();
      }, 100);
    }
    output.write(data);
    //console.log('stderr: ' + data);
  });

  vm.on('close', function (code) {
    //console.log('child process exited with code ' + code);
    output.end();
  });

};