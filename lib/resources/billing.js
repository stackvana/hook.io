var resource = require('resource');
var billing = resource.define('billing');
var config = require('../../config');

billing.timestamps();

billing.property('name', {
  "type": "string",
  "default": "my-billing",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

billing.property('amount', {
  "type": "number",
  "required": true,
  "default": 500
});

billing.property('plan', {
  "type": "string"
});

billing.property('status', {
  "type": "number",
  "required": true,
  "default": 500
});

billing.property('type', {
  "type": "string",
  "enum": ["Credit Card", "Bitcoin"],
  "default": "Credit Card"
});

billing.property('stripeID', {
  "type": "string"
});


billing.property('card_number', {
  "type": "string",
  "default": ""
});

billing.property('card_exp', {
  "type": "string",
  "default": ""
});

billing.property('card_ccv', {
  "type": "string",
  "default": ""
});

billing.property('owner', {
  "type": "string",
  "required": true
});

// todo: add bitcoin option
module['exports'] = billing;