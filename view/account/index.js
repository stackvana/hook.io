var hook = require('../../lib/resources/hook');
var user = require('../../lib/resources/user');
var cache = require('../../lib/resources/cache');
var billing = require('../../lib/resources/billing');
var bodyParser = require('body-parser');
// TODO: replace with psr
var mergeParams = require('merge-params');
var async = require('async');
var i18n = require('../helpers/i18n');

// user schema used for form
var userSchema = {
  name: { type: 'string', required: true },
  email: { type: 'string', format: 'email', required: false },
};

module['exports'] = function view (opts, callback) {

  var $ = this.$;
  var req = opts.request, res = opts.response;
  $ = req.white($);

  // if not logged in, kick out
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/account";
    // TODO: actual login screen, not just homepage login
    //return callback(null, $.html());
    return res.redirect('/login');
  }

  // TODO: refactor out most of this block using Resource.User.before() hooks
  function renameAccount (_user, params, cb) {

    // TODO: re-key all datastore entries
    // TODO: clear out all previous logs

    // first check if new account name is available ( this should probably be a .before() hook on User.update )
    user.find({ name: params.name }, function (err, results) {

      if (err) {
        return res.end(err.message);
      }

      if (results.length > 0) {
        return res.end('new account name ' + params.name + ' is unavailable.');
      }

      _user.name = params.name;

      user.update(_user, function (err, result) {
        if (err) {
          return res.end(err.message);
        }

        // update user cache
        cache.set('/user/' + params.name, result, function(){

          // reset user name in session
          // req.session.user = params.name;

          // rename all existing hooks to new name
          hook.find({ owner: params.previousName }, function (err, results) {
            if (err) {
              return res.end(err.message);
            }
            if (results.length === 0) {
              return cb(null);
            }
            function updateHookName (item, cb) {
              item.owner = params.name;
              item.save(cb);
            };
            async.each(results, updateHookName, function(err){
              if (err) {
                return res.end(err.message);
              }
              return cb(null);
            });
          });
        });

      });

    });

  };

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});

    var params = req.resource.params;
    $('.noticeMessage').html("This account has exceeded it's 60 day free trial limit.");
    $('.upgradeWarning').remove();
    if (req.session.paidStatus === 'paid') {
      // do not show deletion url for paid accounts, they must cancel subscription first
      $('.accountDelete').remove();
    }
    if (params.reset) {
      $('.status').addClass('visible');
      $('.status').html('Please set your new password immediately!');
    }
    if (params.paid) {
      $('.status').addClass('visible');
      $('.status').html(' <p><span>Your Account has been upgraded.</span> Thank you for your purchase.</p>  ');
      // You now have access to additional features and higher usage limits.
    }

    user.find({ name: req.session.user }, function(err, results) {

      if (err) {
        return callback(null, err.message);
      }
      if (results.length === 0) {
        return callback(null, 'No user found');
      }

      var _user = {}, r = results[0];
      _user.name = r.name;
      _user.id = r.id;

      $('.myHooks').attr('href', '/' + _user.name);

      if (req.method === "POST") {

        // attempt to save
        // validate email and password updates

        if (typeof params.email !== "undefined" && params.email.length > 3) {
          _user.email = params.email;
          if (typeof params.password !== 'undefined' && typeof params.confirmPassword !== 'undefined') {
            if (params.password.length > 0) {
              if (params.password !== params.confirmPassword) {
                return res.end('Passwords do not match. Please go back and try again.');
              }
              _user.password = params.password;
            }
          }
          
          // TODO: perform lookup of existing accounts by email
          // do not allow users to override email address already in use
          user.find({ email: params.email }, function (err, _users){
            if (err) {
              return res.end(err.message);
            }
            if (_users.length > 0) {
              var ok = false;
              _users.forEach(function(_u){
                if (_u.name === req.session.user) {
                  ok = true;
                }
              });
              if (ok) {
                // email matches current account session, allow update ( not really updating the email value though )
              } else {
                // we found other accounts with the same email address, cannot save current email address
                res.status(500);
                return res.json({ error: true, message: 'An account is already registed to: ' + params.email });
              }
            }
            // allow for account renames
            if (typeof params.name === "undefined" || params.name.length < 3) {
              params.name = req.session.user;
              // return res.end('name is a required parameter!');
            }

            if (params.name && params.previousName && params.name !== params.previousName) {
              renameAccount(_user, params, function (err, result){
                // display user info in account form
                // TODO: if form post data, attempt to update user account information
                req.session.destroy();
                req.logout();
                res.redirect("/");
                return;
              })
            } else {
              return user.update(_user, function(err, result){
                if (err) {
                  return res.end(err.message);
                }
                cache.set('/user/' + result.name, result, function (err, re){
                  if (err) {
                    return res.end(err.message);
                  }
                  req.session.email = result.email;
                  req.session.user_ctime = result.ctime;

                  // display user info in account form
                  // TODO: if form post data, attempt to update user account information ??? done ???
                  if (req.jsonResponse) {
                    var r = {
                      status: 'updated',
                      result: 'account information updated'
                    }
                    return res.json(r);
                  } else {
                    showUserForm(result, function(err, result){
                      $('.userForm').html(result);
                      $('.status').addClass('visible');
                      $('.status').html('Account Information Updated!');
                      $('.status').addClass('success');
                      callback(null, $.html());
                    });
                  }
                });
              });
            }
          });
        } else {
          var r = {
            error: true,
            message: 'email parameter cannot be empty'
          }
          return res.json(r);
        }
      } else {
        if (req.jsonResponse) {
          return res.json(user.filter(r));
        }
        // display user info in account form
        showUserForm(r, function (err, result) {
          $('.userForm').html(result);
          i18n(req.i18n, $);
          callback(null, $.html());
        });
      }
    });
  });

};

var request = require('hyperquest');
var dateFormat = require('dateformat');
var forms = require('mschema-forms');

function showUserForm (user, cb) {

  var formSchema = userSchema || {};

  formSchema.name = {
    default: user.name,
    disabled: true
  };

  formSchema.email.default = user.email || "";

  formSchema.servicePlan = {
    "type": "string",
    "label": "service plan",
    "disabled": true,
    "default": user.servicePlan
  };

  formSchema.password = {
    "type": "string",
    "format": "password"
  };
  formSchema.confirmPassword = {
    "type": "string",
    "format": "password",
    "label": "confirm password"
  };

  formSchema.previousName = {
    default: user.name,
    format: "hidden"
  };

  /*
  formSchema.githubOAuth = {
    "type": "string",
    "disabled": true,
    "enum": ["true", "false"],
    "default": "false",
    "label": "Account Linked To Github"
  };
  */
  if (typeof user.hostingCredits !== "number") {
    user.hostingCredits = 0;
  }

  if (user.hostingCredits > 0) {
    formSchema.hostingCredits = {
      "type": "number",
      "label": "hosting credits",
      "disabled": true,
      "default": user.hostingCredits
    }
  }

  forms.generate({
    type: "generic",
    form: {
      legend: "Account Information",
      submit: "Save",
      action: ""
    },
    schema: formSchema,
    }, function (err, result){
      cb(null, result);
  });

}
