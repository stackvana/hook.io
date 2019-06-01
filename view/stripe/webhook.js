var stripe = require('stripe');
var bodyParser = require('body-parser');
var config = require('../../config');
var billing = require('../../lib/resources/billing');

module.exports = function (opts, cb) {
  var $ = this.$,
    res = opts.res,
    req = opts.req;

  const sig = req.headers['stripe-signature'];

  bodyParser.raw({type: 'application/json'})(req, res, function () {
    let event;
    let endpointSecret = config.stripe.endpointSecret;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    console.log('received valid webhook from stripe', event);
    console.log(event);
    console.log(req.resource.params);
    if (event.type === 'invoice.payment_succeeded') {
      // attempt to find user internally based on customer id
      console.log('incoming customer id', event.data.object.customer);
      billing.find({ stripeID: event.data.object.customer }, function (err, results) {
        console.log(err, results);
        res.end('ended request');
      });
      // successful billing event indicates subscription should be extended
    } else {
      res.status(500);
      res.end('unknown event.type ' + event.type);
    }
  });

};