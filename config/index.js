module.exports = require('./dev');
module.exports.env = "dev";
if (module.exports.usingDocker === false) {
  module.exports.web.host = '0.0.0.0';
  module.exports.worker.publicIP = '0.0.0.0';
}
if (process.env['NODE_ENV'] === 'production') {
  module.exports = require('./production');
  module.exports.env = "production";
}

// console.log('Info: Using env: '  + module.exports.env);