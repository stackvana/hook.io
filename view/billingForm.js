var forms = require('mschema-forms');
var mustache = require('mustache');

module['exports'] = function billingForm (data, cb) {

  var billingSchema = billingSchema || {};

/*
  billingSchema.name = {
    type: "string",
    default: data.name,
    disabled: true
  };

*/
  billingSchema.method = {
    type: "string",
    default: data.type,
    disabled: true
  };

  var amt = '$' + (data.amount / 100).toString() + ".00 billed per month";

  billingSchema.amount = {
    type: "number",
    default: amt,
    disabled: false
  };

  billingSchema.plan = {
    type: "string",
    default: data.plan,
    disabled: true
  };

 /*
  billingSchema.card_number = {
    type: "string",
    default: data.card_number,
    disabled: true
  };

  billingSchema.card_exp = {
    type: "string",
    default: data.card_exp,
    disabled: true
  };

  billingSchema.card_ccv = {
    type: "string",
    default: data.card_ccv,
    disabled: true
   };
 */

  billingSchema.run = {
    "type": "string",
    "default": "true",
    "format": "hidden"
  };

  forms.generate({
    type: "read-only",
    form: {
      legend: "Billing Information",
      submit: "Update",
      action: ""
    },
    schema: billingSchema,
    }, function (err, result){
      console.log('generated', err, result)
      cb(null, result);
  });

};