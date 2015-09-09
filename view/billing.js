// Stripe info
// Plan ID: BASIC_HOSTING_PLAN
// Cost: $5.00 per 30 days, no trial
// Statement: Hook.io Hosting Plan

var hook = require('../lib/resources/hook');
var user = require('../lib/resources/user');
var config = require('../config');
var bodyParser = require('body-parser');
var mergeParams = require('./mergeParams');
var request = require('request');
var billing = require('../lib/resources/billing')
var stripe = require('stripe')(config.stripe.secretKey);

var billingForm = require('./billingForm');
var addPaymentOption = require('./addPaymentOption');

module['exports'] = function view (opts, callback) {

  var $ = this.$;
  var req = opts.request, res = opts.response;

  $('#addPaymentMethod').attr('data-key', config.stripe.publicKey);

  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    var params = req.resource.params;

    if (!req.isAuthenticated()) { 
      req.session.redirectTo = "/billing";
      return res.redirect('/login');
    }
    
    // TODO: make it so billing information can be captured directly from the /pricing page

    function showBillings (results, callback) {

      var count = results.length;

      function finish () {

        var _billing = results[0];
        // TODO: data bind $('#slider').slider("value", (_billing.amount / 100));
        // console.log('databinding', _billing.amount)
        $('#databind').text(' \
          var resource = {}; \
          resource.billing = { \
            amount: ' + _billing.amount + ' \
          };');
        if (count === 0) {
          callback(null);
        }
      };

      results.forEach(function(item){
        // item.destroy();
        billingForm(item, function (err, re){
          $('.billingForm').append(re);
          count--;
          finish();
        });
      });

    };

    $('.addPaymentOption').html(addPaymentOption());
    // console.log('getting params', params);
    // if new billing information was posted ( from  account page ), add it
    if (params.addCustomer) {
      // console.log('adding new customer');
      // create a new customer based on email address
      stripe.customers.create(
        { email: params.stripeEmail },
        function (err, customer) {
          if (err) {
            $('.status').html(err.message);
          }
          // console.log('new customer created', err, customer);
          $('.status').html('New billing informationed added!');

          // select plan based on user-selected value
          var _plan = "BASIC_HOSTING_PLAN";

          if (params.amount > 500) {
            _plan = _plan + "_" + (params.amount / 100);
          }

          // console.log('attempting to use plan', _plan);

          stripe.customers.createSubscription(customer.id, {
             plan: _plan,
             source: params.stripeToken // source is the token created from checkout.js
           }, function(err, charge){
             if (err) {
               $('.status').addClass('error');
               $('.status').html(err.message);
               return callback(err, $.html());
             }

            billing.create({
              owner: req.session.user,
              stripeID: customer.id,
              amount: params.amount,
              plan: _plan
            }, function (err, _billing) {
              // console.log('new billing created', err, _billing);
              if (err) {
                $('.status').html(err.message);
                return callback(null, err.message);
              }

               // console.log('added to plan', err, charge);
               $('.status').html('Billing Information Added! Thank you!');
               billing.find({ owner: req.session.user }, function (err, results) {
                 if (err) {
                   $('.status').html(err.message);
                   return callback(err, $.html());
                 }
                 showBillings(results, function(){
                   callback(err, $.html());
                 });
               });
            });
          });
        }
      );
    } else {
      billing.find({ owner: req.session.user }, function (err, results) {
        if (err) {
          return callback(null, err.message);
        }
        // console.log('billing results', err, results)
        if (results.length === 0) {
          var checkOut = ' \
            <form action="/billing" method="POST"> \
              <input type="hidden" value="true" name="addCustomer"/> \
              <script \
                src="https://checkout.stripe.com/checkout.js" class="stripe-button" \
                data-key="' + config.stripe.publicKey + '" \
                data-image="/square-image.png" \
                data-name="hook.io hosting" \
                data-description="1 Month Basic Hosting ($5.00)" \
                data-amount="500" \
                data-currency="usd" \
                data-bitcoin="true"> \
              </script> \
            </form> \
          ';
          // $('.billingForm').html('<h3>No Billing Options Found!</h3>' + checkOut);
          callback(null, $.html());
        } else {
          var _billing = results[0];
          showBillings(results, function(){
            callback(null, $.html());
          });
          // $('.billingForm').html(JSON.stringify(_billing, true, 2));
        }
      });
      // callback(null, $.html());
     }
  });
};
