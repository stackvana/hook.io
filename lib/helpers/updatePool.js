var config = require('../../config');
var r = require('request');

module.exports = function updatePool (opts, cb) {
  r({
    body: {
      super_private_key: "1234",
      nodes: opts.nodes,
      poolKey: opts.poolKey
    },
    method: "POST",
    json: true,
    url: config.app.url + '/_config'
  }, function (err, res, body){
    console.log(err)
    cb(err, res, body)
  });
}

