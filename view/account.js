var hook = require('../lib/resources/hook')
var user = require('../lib/resources/user')
var billing = require('../lib/resources/billing')
var bodyParser = require('body-parser');
var mergeParams = require('./mergeParams');

// user schema used for form
var userSchema = {
  name: { type: 'string', required: true },
  email: { type: 'string', format: 'email', required: false },
};

var addPaymentOption = require("./addPaymentOption");

module['exports'] = function view (opts, callback) {

  var $ = this.$;
  var req = opts.request, res = opts.response;

  req.user = {
    username: req.session.username
  };

  // if not logged in, kick out
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/account";
    return res.redirect('/login');
  }

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});

    var params = req.resource.params;

    //$('.addPaymentOption').html(addPaymentOption());

    user.find({ name: req.session.user }, function(err, results) {

      if (err) {
        return callback(null, err.message);
      }
      if (results.length === 0) {
        return callback(null, 'No user found');
      }

      var _user = results[0];
      $('.myHooks').attr('href', '/' + _user.name);

      if (req.method === "POST") {
        // attempt to save
        if (typeof params.email !== "undefined" && params.email.length > 3) {
          _user.email = params.email;
          if (typeof params.password !== 'undefined' && typeof params.confirmPassword !== 'undefined') {
            if (params.password.length > 0) {
              if (params.password !== params.confirmPassword) {
                return res.end('passwords do not match!');
              }
              _user.password = params.password;
            }
          }
          return user.update(_user, function(err, result){
            if (err) {
              return res.end(err.message);
            }
            // display user info in account form
            // TODO: if form post data, attempt to update user account information
            showUserForm(_user, function(err, result){
              $('.userForm').html(result);
              $('.status').html('Account Information Updated!');
              callback(null, $.html());
            });
          });
        } else {
          return res.end('email parameter cannot be empty');
        }
      } else {
        // display user info in account form
        // TODO: if form post data, attempt to update user account information
        showUserForm(_user, function(err, result){
          $('.userForm').html(result);
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

  formSchema.name.default = user.name;
  formSchema.name.disabled = true;

  formSchema.email.default = user.email || "";
  // formSchema.email.disabled = true;

  formSchema.run = {
    "type": "string",
    "default": "true",
    "format": "hidden"
  };

  formSchema.password = {
    "type": "string",
    "format": "password"
  };
  formSchema.confirmPassword = {
    "type": "string",
    "format": "password"
  };

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