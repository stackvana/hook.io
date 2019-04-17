const isDocker = require('is-docker');

if (isDocker()) {
  module.exports = require('./docker');
  module.exports.env = "docker";
} else {
  module.exports = require('./dev');
  module.exports.env = "dev";
  if (process.env['NODE_ENV'] === 'production') {
    module.exports = require('./production');
    module.exports.env = "production";
  }
}

// console.log('Info: Using env: '  + module.exports.env);