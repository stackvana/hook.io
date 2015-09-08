var user = require('../lib/resources/user');
var passport = require('passport');

// TODO: make parseRequest into separate module
// maybe put into https://github.com/bigcompany/parse-service-request/ ?
var parseRequest = function parse (req, res, cb) {
  var mergeParams = require('merge-params'),
      bodyParser = require('body-parser');
  bodyParser()(req, res, function bodyParsed () {
    mergeParams(req, res, function(){});
    params = req.resource.params;
    cb(null, params);
  });
};

module['exports'] = function view (opts, callback) {

  var $ = this.$;

  var req = opts.request,
      res = opts.response;

  parseRequest(req, res, function(err, params){
    if (params.name && params.password) {
      user.find({ name: params.name }, function (err, results) {
        if (err) {
          return res.end(err.message);
        }
        if (results.length === 0) {
          req.session.user = params.name;
          return res.end('available');
        }
        var u = results[0];
        var crypto = require('crypto');
        var hash = crypto.createHmac("sha512", u.salt).update(params.password).digest("hex");
        if (hash !== u.password) {
          return res.end('invalid');
        }
        req.login(u, function(err){
          if (err) {
            return res.end(err.message);
          }
          req.session.user = u.name;
          return res.end('valid');
        });
      });
    } else {
      callback(null, $.html());
    }
  });

};