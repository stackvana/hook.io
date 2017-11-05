var psr = require('parse-service-request');
var user = require('../lib/resources/user');

module.exports = function (opts, cb) {
  var $ = this.$, res = opts.res, req = opts.req;
  if (!req.isAuthenticated()) {
    return res.redirect(302, '/login');
  }
  psr(req, res, function () {
    var params = req.resource.params;
    if (req.method === "POST") {
      // check to see if valid email was posted
      if (typeof params.email === 'string' && params.email.length > 0 && params.email.search('@') !== -1) {
        user.findOne({ name: req.session.user }, function(err, _user){
          if (err) {
            res.status(500)
            return res.json({ error: true, message: err.message });
          }
          _user.email = params.email;
          _user.save(function(err){
            if (err) {
              res.status(500)
              return res.json({ error: true, message: err.message });
            }
            req.session.email = params.email;
            return res.end('set-email')
          });
        })
      } else {
        res.status(500)
        return res.json({ error: true, message: 'Invalid email address'});
      }
      //return cb(null, $.html());
    } else {
      return cb(null, $.html());
    }
  })
}