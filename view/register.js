var user = require('../lib/resources/user');
var psr = require('parse-service-request');
var config = require('../config');
module.exports = function (opts, cb) {
  var $ = this.$,
  res = opts.res,
  req = opts.req;
  
  $ = req.white($);

  var params = req.resource.params;

  if (!req.isAuthenticated()) {
    if (req.jsonResponse) {
      res.status(401);
      return res.json({ error: true, message: 'session-required' });
    }
    return res.redirect(config.app.url + '/login');
  }
  if (req.session.user && req.session.user !== 'anonymous') {
    if (req.jsonResponse) {
      return res.json({ result: 'already-registered' });
    }
    return res.redirect(config.app.url + '/account');
  }

  function passwordRequired () {
    res.status(400);
    var r = {
      error: true,
      message: 'Password field is required.'
    }
    return res.json(r);
  }

  psr(req, res, function(){
    if (req.method === "POST") {
      if (typeof params.password !== 'undefined' && typeof params.confirmPassword !== 'undefined') {
        if (params.password.length > 0) {
          if (params.password !== params.confirmPassword) {
            res.status(500);
            var r = {
              error: true,
              message: 'Passwords do not match.'
            }
            return res.json(r);
          }
        } else {
          return passwordRequired();
        }
      } else {
        return passwordRequired();
      }

      if (typeof params.account_name !== 'string' || params.account_name.length === 0) {
        res.status(500);
        return r.json({ error: true, message: 'account_name parameter is required'});
      }
      // TODO: slug check for account name? i hope its already there in resource-user
      // TODO: if incoming account name is being registered, update it on the user document and session
      user.find({ name: params.account_name }, function (err, _users) {
        if (err) {
          return res.json({ error: true, message: err.message });
        }
        if (_users.length === 0) {
          // account name is available, register it with current logged in account!
        } else {
          // account name is take
          var r = {
            result: 'exists'
          }
          return res.json(r);
        }
        user.findOne({ email: req.session.email }, function (err, _user) {
          if (err) {
            res.status(500)
            return res.json({ error: true, message: err.message });
          }
          
          // TOOD: replace with user.signUp logic?
          //       user.register() logic?
          // needs to perform req.login?
          
          // needs to perform password check and upate

          //_user.name = params.account_name;
          // _user.password = params.password;

          var _update = {
            id: _user.id,
            name: params.account_name,
            password: params.password
          };
          // console.log('attemping to update user', _update)
          // Remark: Must use User.update instead of User.save for password before hooks to work ( salt + one-way hash )
          //         Would be nice if resource had .save() hooks working
          user.update(_update, function(err, re){
            if (err) {
              res.status(500)
              return res.json({ error: true, message: err.message });
            }
            req.session.user = params.account_name;
            user.login({ req: req, res: res, user: re }, function (err) {
              if (err) {
                return res.json(err.message);
              }
              var r = {
                result: 'success'
              }
              return res.json(r);
              // TODO: perform redirect ??
              return res.redirect(config.app.url + '/services');
            });
          });
        });
      });
    } else {
      // auto-suggest account name based on current email
      var suggest = req.session.email.split('@')[0];
      $('#account_name').val(suggest);
      $('.accountName').html('/' + suggest);
      cb(null, $.html())
    }
  });

}