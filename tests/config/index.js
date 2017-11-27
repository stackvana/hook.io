module.exports = require('./dev');
module.exports.env = "dev";
if (process.env['NODE_ENV'] === 'production') {
  module.exports = require('./production');
  module.exports.env = "production";
}

// if we switch to production mode, it will be testing production instance remotely
// note: will still start local dev cluster per test, but will perform remote tests
/*
*/

//module.exports = require('./production');
//module.exports.env = "production";

console.log('Info: Using env: '  + module.exports.env);
