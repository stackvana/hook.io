var hook = require('../lib/resources/hook');
var user = require('../lib/resources/user');
var config = require('../config');
var bodyParser = require('body-parser');
var mergeParams = require('merge-params');
var request = require('request');
var billing = require('../lib/resources/billing')
var stripe = require('stripe')(config.stripe.secretKey);
var servicePlan = require('../lib/resources/servicePlan');

var billingForm = require('./billingForm');

module['exports'] = function view (opts, callback) {

  var $ = this.$;
  var req = opts.request, res = opts.response;

  $ = req.white($);

  $('#addPaymentMethod').attr('data-key', config.stripe.publicKey);


  bodyParser()(req, res, function bodyParsed(){
    mergeParams(req, res, function(){});
    var params = req.resource.params;

    var planName = "free";

    params.amount = Number(params.amount);
    var _plan = "BASIC_HOSTING_PLAN";

    if (params.amount > 500) {
      _plan = _plan + "_" + (params.amount / 100);
    }

    Object.keys(servicePlan).forEach(function(item){
      if (servicePlan[item].stripe_label === _plan) {
        planName = item;
      } 
    });

    function createStripeSubscription (id, opts, cb) {
      stripe.customers.createSubscription(id, opts, cb);
    }
    
    function createLocalBillings (opts, cb) {
      // TODO: separate rules if the user is already logged in, but with no purchase? that way, no create will happen
      if (typeof opts.owner === "undefined" || opts.owner === "anonymous") {
        var slug = require('slug');
        // quick hack fix for creating a unique user name based on email
        // TODO: no way to update user name now...fix that in /account page
        var name = slug(opts.email);
        user.find({ email: opts.email }, function (err, results) {
          if (err) {
            return res.end(err.message);
          }

          if(results.length === 0) {
            user.create({ name: name, email: opts.email, paidStatus: "paid", servicePlan: planName }, function (err, result) {
              if (err) {
                return res.end(err.message);
              }
              req.session.paidStatus = "paid";
              req.session.servicePlan = planName;
              req.user = req.user || {};
              req.user.paidStatus = "paid";
              user.emit('login', result);
              complete(result)
            });
          } else {
            var u = results[0];
            u.paidStatus = "paid";
            u.email = opts.email;

            // TODO: add service plan
            // update service plan name based on purchase
            u.servicePlan = planName;
            req.session.servicePlan = planName;

            // TODO: update account with stripe email?
            // it's probably best to update the account to use the email registered with stripe
            req.user = req.user || {};
            req.user.paidStatus = "paid";
            req.session.paidStatus = "paid";

            user.emit('login', u);
            u.save(function(err, r){
              if (err) {
                return res.end(err.message);
              }
              complete(u);
            });
          }
        });
      } else {
        complete();
      }
      function complete (_user) {
        // console.log('creating billings', opts);
        if (typeof _user !== "undefined") {
          opts.owner = _user.name;
          req.login(_user, function (err){
            if (err) {
              return res.end(err.message);
            }
            req.session.user = _user.name.toLowerCase();
            req.user = req.user || {};
            req.user.paidStatus = "paid";
            req.session.paidStatus = "paid";
            billing.create(opts, cb);
          })
        } else {
          user.find({ name: opts.owner }, function (err, results) {
            if (err) {
              return res.end(err.message);
            }
            if (results.length === 0) {
              return res.end('An error occurred, please contact support.')
            } else {
              var u = results[0];
              u.paidStatus = "paid";
              u.servicePlan = planName;
              req.user = req.user || {};
              req.user.paidStatus = "paid";
              req.session.paidStatus = "paid";
              u.save(function(err, r){
                if (err) {
                  return res.end(err.message);
                }
                billing.create(opts, cb);
              });
            }
          });
        }
      };
      // if new billing creation was succesful, but no user was found with that email
      // *AND* there is no current session,
      // then we need to sign up a new user, and redirect to /account?paid

    }

    function showBillings (results, callback) {
      if(params.ajax === true) {
        return res.end('paid');
      }

      var count = results.length;

      function finish () {
        var _billing = results[0];
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

    // console.log('getting params', params);
    // if new billing information was posted ( from  account page ), add it
    if (params.addCustomer) {
      // console.log('adding new customer');
      // create a new customer based on email address
      stripe.customers.create(
        { email: params.email },
        function (err, customer) {
          if (err) {
            if (params.ajax) {
              return res.end(err.message);
            }
            // possible issue here with existing customers attempting to add new plans
            $('.status').html(err.message);
          }
          // console.log('new customer created', err, customer);
          $('.status').html('New billing informationed added!');

          // select plan based on user-selected value

          // the stripe customer has been created, now enroll them into a subscription
          createStripeSubscription(customer.id, {
             plan: _plan,
             source: params.stripeToken // source is the token created from checkout.js
           }, function(err, charge){
             if (err) {
               if (params.ajax) {
                 return res.end(err.message);
               }
               $('.status').addClass('error');
               $('.status').html(err.message);
               return callback(err, $.html());
             }

            // the stripe subscription was successful, now create a local billings entry to correspond with stripe
            createLocalBillings({
              owner: req.session.user, // TODO: better check here
              stripeID: customer.id,
              email: params.email,
              amount: params.amount,
              plan: _plan
            }, function (err, _billing) {
              // console.log('new billing created', err, _billing);
              if (err) {
                $('.status').html(err.message);
                return callback(null, err.message);
              }
              // the local billing entry was successful, fetch that billing and render page
              // TODO: remove session and user scope code here? or remove it from createBillings
              req.user = req.user || {};
              req.user.paidStatus = "paid";
              req.session.paidStatus = "paid";

              // update service plan name based on purchase
              var planName = "free";
              Object.keys(servicePlan).forEach(function(item){
                if (servicePlan[item].stripe_label === _plan) {
                  planName = item;
                }
              });
              req.session.servicePlan = planName;

               // console.log('added to plan', err, charge);
               $('.status').html('Billing Information Added! Thank you!');
               if (params.ajax) {
                 return res.end('paid');
               }
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
      // not adding new billing data, just show existing
      if (!req.isAuthenticated()) {
        req.session.redirectTo = "/billing";
        return res.redirect('/login');
      }
      billing.find({ owner: req.session.user }, function (err, results) {
        if (err) {
          return callback(null, err.message);
        }
        if (results.length > 0) {
          $('.noBilling').remove();
          var _billing = results[0];
          showBillings(results, function(){
            var out = $.html();
            out = out.replace('{{stripePK}}', config.stripe.publicKey);
            callback(null, out);
          });
        } else {
          // TODO: add copy on billing page for pricing options
          // $('.billingForm').html('<h3>No Billing Options Found!</h3>' + checkOut);
          $('.cancelPlan').remove();
          $('#stripeForm').remove();
          callback(null, $.html());
        }
      });
     }
  });
};
