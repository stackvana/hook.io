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
      params.name = params.name.toLowerCase();
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
          var r = {
            res: "invalid",
          };
          if (u.githubOauth === true) {
            r.res = "redirect";
            r.url = "/login/github";
            // if the user has already oauthed with github before,
            // and is attempting to sign in with a bad password,
            // lets just redirect them to the github auth! easy.
          }
          return res.end(JSON.stringify(r));
        }
        req.login(u, function(err){
          if (err) {
            return res.end(err.message);
          }
          req.session.user = u.name.toLowerCase();
          return res.end('valid');
        });
      });
    } else {
      res.redirect('/');
      // callback(null, $.html());
    }
  });

};