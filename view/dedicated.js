var request = require('hyperquest');

module['exports'] = function (opts, callback) {
  
  var $ = this.$;
    console.log(opts)
  var hook = request('http://dev.hook.io:9999/Marak/hook.io/dedicatedHostingSignup');
  hook.pipe(opts.response);
  
};