// Stripe info
// Plan ID: BASIC_HOSTING_PLAN
// Cost: $5.00 per 30 days, no trial
// Statement: Hook.io Hosting Plan

var hook = require('../lib/resources/hook');
var user = require('../lib/resources/user');
var bodyParser = require('body-parser');
var mergeParams = require('./mergeParams');
var request = require('request');
var billing = require('../lib/resources/billing')
var stripe = require('stripe')('sk_test_ZXdJj4I3Db2iB9ZRm0gqyzDV');
/*
var options = {
	"url": "https://hooks.slack.com/services/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",
	"method":"POST",
	"json": true,
	"body":{
		"text": responseobj["message"],
		"channel": slackobj["channel"],
		"username": slackobj["commands"]["route"] + "-bot"
		}
	}
request.post(options);

*/

var billingForm = require('./billingForm');
var addPaymentOption = require('./addPaymentOption');

module['exports'] = function view (opts, callback) {
  console.log('billing')
  var $ = this.$;
  var req = opts.request, res = opts.response;

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    var params = req.resource.params;
    console.log(params);
    
    if (!req.isAuthenticated()) { 
      req.session.redirectTo = "/billing";
      return res.redirect('/login');
    }
    
    $('.addPaymentOption').html(addPaymentOption());
    
    // if new billing information was posted ( from  account page ), add it
    if (params.addCustomer) {
      console.log('adding new customer')
      // create a new customer based on email address
      stripe.customers.create(
        { email: params.stripeEmail },
        function (err, customer) {
          console.log('new customer created', err, customer);
          billing.create({ owner: req.user.username, stripeID: customer.id }, function (err, billing) {
            console.log('new billing created', err, billing);
            if (err) {
              return callback(null, err.message);
            }
            stripe.customers.createSubscription(customer.id, {
               plan: 'BASIC_HOSTING_PLAN',
               source: params.stripeToken // source is the token created from checkout.js
             }, function(err, charge){
               console.log('added to plan', err, charge);
               callback(err, $.html());
            });
         });
        }
      );
    } else {
      
      billing.find({ owner: req.user.username }, function (err, results) {
        if (err) {
          return callback(null, err.message);
        }
        console.log('billing results', err, results)
        if (results.length === 0) {
          var checkOut = ' \
            <form action="/billing" method="POST"> \
              <input type="hidden" value="true" name="addCustomer"/> \
              <script \
                src="https://checkout.stripe.com/checkout.js" class="stripe-button" \
                data-key="pk_test_axAR0vF3Qam8zs09JE7t8ZIo" \
                data-image="/square-image.png" \
                data-name="hook.io hosting" \
                data-description="1 Month Basic Hosting ($5.00)" \
                data-amount="500" \
                data-currency="usd" \
                data-bitcoin="true"> \
              </script> \
            </form> \
          ';
          //$('.billingForm').html('<h3>No Billing Options Found!</h3>' + checkOut);
          callback(null, $.html());
        } else {
          var _billing = results[0];
          billingForm(_billing, function (err, re){
//            console.log(err, re)
            $('.billingForm').html(re);
            callback(null, $.html());
          });
          // $('.billingForm').html(JSON.stringify(_billing, true, 2));
        }
      });
      
//      callback(null, $.html());
     }
    //

  });

};


// TODO - make request

/*
curl https://api.stripe.com/v1/charges \
   -u sk_test_ZXdJj4I3Db2iB9ZRm0gqyzDV: \
   -d source=btcrcv_15qUDWBUxcOSI5dklE50qie6 \
   -d amount=2000 \
   -d currency=usd
*/
