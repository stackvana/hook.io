var hook = require('../lib/resources/hook')
var user = require('../lib/resources/user')
var billing = require('../lib/resources/billing')
var bodyParser = require('body-parser');
var mergeParams = require('./mergeParams');

module['exports'] = function view (opts, callback) {

  var $ = this.$;
  var req = opts.request, res = opts.response;
 

  // if not logged in, kick out
  if (!req.isAuthenticated()) { 
    req.session.redirectTo = "/account";
    return res.redirect('/login');
  }

  // get user if logged in
  
  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});

    var params = req.resource.params;
  
    user.find({ name: req.user.username }, function(err, results) {
      
      if (err) {
        return callback(null, err.message);
      }
      if (results.length === 0) {
        return callback(null, 'No user found');
      }

      var _user = results[0];
      $('.account').html(JSON.stringify(_user, true, 2))

      billing.find({ owner: req.user.username }, function(err, results) {

        if (err) {
          return callback(null, err.message);
        }
        if (results.length === 0) {
          $('.billing').html('No Billing Options Found!');
        } else {
          var _billing = results[0];
          $('.billing').html(JSON.stringify(_billing, true, 2));
        }


        callback(null, $.html());
      });

    });

  });
  
    // display user info in account form

    // if form post data, attempt to update user account information


};


// TODO - make request

/*
curl https://api.stripe.com/v1/charges \
   -u sk_test_ZXdJj4I3Db2iB9ZRm0gqyzDV: \
   -d source=btcrcv_15qUDWBUxcOSI5dklE50qie6 \
   -d amount=2000 \
   -d currency=usd
*/
