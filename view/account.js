var hook = require('../lib/resources/hook');
var user = require('../lib/resources/user');
var cache = require('../lib/resources/cache');
var billing = require('../lib/resources/billing');
var bodyParser = require('body-parser');
var mergeParams = require('./mergeParams');
var async = require('async');
var colors = require('colors');
// user schema used for form
var userSchema = {
  name: { type: 'string', required: true },
  email: { type: 'string', format: 'email', required: false },
};

var addPaymentOption = require("./addPaymentOption");

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

    // first check if new account name is available ( this should probably be a .before() hook on User.update )
    user.find({ name: params.name }, function (err, results) {

      if (err) {
        return res.end(err.message);
      }

      if (results.length > 0) {
        return res.end('new account name ' + params.name + ' is unavailable.');
      }

      _user.name = params.name;

      user.update(_user, function(err, result){
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

      // TODO: re-key all datastore entries
      // TODO: clear out all previous logs
    });

  };

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});

    var params = req.resource.params;

    if (params.reset) {
      $('.status').html('Please set your new password immediately!');
    }
    if (params.paid) {
      $('.status').html('Thank you so much for supporting us! <br/> <span class="success">Your Hosting Credits have been issued!</span> <br/> We will periodically email you with updates.');
    }

    //$('.addPaymentOption').html(addPaymentOption());

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
              req.session.email = result.email;
              // display user info in account form
              // TODO: if form post data, attempt to update user account information
              showUserForm(_user, function(err, result){
                $('.userForm').html(result);
                $('.status').html('Account Information Updated!');
                callback(null, $.html());
              });
            });
          }
        } else {
          return res.end('email parameter cannot be empty');
        }
      } else {
        // display user info in account form
        // TODO: if form post data, attempt to update user account information
        showUserForm(r, function(err, result){
          $('.userForm').html(result);
          var i18n = require('./helpers/i18n');
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
var mustache = require('mustache');

var billingForm = require('./billingForm');

function showUserForm (user, cb) {
  var formSchema = userSchema || {};

  formSchema.name = {
    default: user.name,
    disabled: true
  };

  formSchema.email.default = user.email || "";
  // formSchema.email.disabled = true;

  /*
  formSchema.run = {
    "type": "string",
    "default": "true",
    "format": "hidden"
  };
  */
  formSchema.paidStatus = {
    "type": "string",
    "label": "account paid status",
    "disabled": true,
    "default": user.paidStatus
  };

  formSchema.password = {
    "type": "string",
    "format": "password"
  };
  formSchema.confirmPassword = {
    "type": "string",
    "format": "password"
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
