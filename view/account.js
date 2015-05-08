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

  // if not logged in, kick out
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/account";
    return res.redirect('/login');
  }

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});

    var params = req.resource.params;
    //$('.addPaymentOption').html(addPaymentOption());

    user.find({ name: req.user.username }, function(err, results) {

      if (err) {
        return callback(null, err.message);
      }
      if (results.length === 0) {
        return callback(null, 'No user found');
      }

      var _user = results[0];

      $('.myHooks').attr('href', '/' + _user.name);

      // display user info in account form
      // TODO: if form post data, attempt to update user account information
      showUserForm(_user, function(err, result){
        $('.userForm').html(result);
        callback(null, $.html());
      });

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
  formSchema.email.disabled = true;

  formSchema.run = {
    "type": "string",
    "default": "true",
    "format": "hidden"
  };

  forms.generate({
    type: "read-only",
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