// TODO: make parseRequest into separate module
// maybe put into https://github.com/bigcompany/parse-service-request/ ?
var parseRequest = function parse (req, res, cb) {
  var mergeParams = require('merge-params'),
      bodyParser = require('body-parser');
  bodyParser()(req, res, function bodyParsed () {
    mergeParams(req, res, function(){});
    params = req.resource.params;
    cb(null, params);
  });
};

var user = require("../lib/resources/user");
var config = require("../config");
var slug = require('slug');

var hook = require('../lib/resources/hook');
var bodyParser = require('body-parser');
var mergeParams = require('./mergeParams');
var request = require('request');
var billing = require('../lib/resources/billing')
var stripe = require('stripe')(config.stripe.secretKey);

var billingForm = require('./billingForm');
var addPaymentOption = require('./addPaymentOption');


module['exports'] = function hostingCredits (opts, cb) {
  var $ = this.$
      req = opts.request,
      res = opts.response;

  $('title').html('hook.io - Buy Hosting Credits')

  parseRequest(req, res, function (err, params) {

    // update a status message if post
    if (req.method === "POST") {
      // POST request, attempt to update hosting credits
      // success?
      // amount
      // email
      // TODO: better stripe confirmation check with amount
      if (typeof params.email !== "string" || params.email.length === 0) {
        return res.end('invalid transaction!');
      }

      var query = {};
      query.email = params.email;
      return user.find(query, function (err, results) {
        // check if an account already exists for this email
        if (err) {
          return res.end(err.message);
        }
        if (results.length === 0) {
          // if not, create a new account
            // if so, use that account info, login
            // set hosting credits
            // show amount
            var data = {};
            data.email = query.email;
            data.name = slug(data.email);
            data.hostingCredits = Number(params.credits);
            // attempting to cheat this number won't work
            // the payment processor logs will always be the authoritative source of credits, when it comes time to reconcile. 
            // please remember, we are a 100% open-source project.
            return user.create(data, function (err, u) {
              if (err) {
                return res.end(err.message);
              }
              return stripeCheckout(u);
            });
        } else {
          // if so, use that account info, login
          // set hosting credits
          // show amount
          var u = results[0];
          if (typeof u.hostingCredits !== "number" || u.hostingCredits === null) {
            u.hostingCredits = 0;
          }
          u.hostingCredits = Number(u.hostingCredits) + Number(params.credits);
          return stripeCheckout(u);
          

        }
        
      });
    
    } else {
      var out = $.html();
      out = out.replace('{{stripePK}}', config.stripe.publicKey);
      // GET request, show copy
      cb(null, out);
    }
    
    function stripeCheckout (u) {

       // create a new customer based on email address
       stripe.customers.create({ email: u.email }, function (err, customer) {
         if (err) {
           // TODO: better error handling
           return res.end(err.message);
         }
         console.log(params)
         stripe.charges.create({
            amount: Number(params.credits),
            currency: "usd",
            source: params.stripeToken.id // source is the token created from checkout.js
          }, function(err, charge){
           if (err) {
             return res.end(err.message);
           }
           return u.save(function(err){
             if (err) {
               return res.end(err.message);
             }
             return req.login(u, function (err){
               if (err) {
                 return res.end(err.message);
               }
               req.session.user = u.name;
               return res.end('paid');
             });
           });
         });
       });

     }
    
  });
  
 
};
