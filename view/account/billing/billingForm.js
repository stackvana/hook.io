var forms = require('mschema-forms');
var servicePlan = require('../../../lib/resources/servicePlan');

module['exports'] = function billingForm (data, cb) {

  var billingSchema = billingSchema || {};

  var plan = data.plan;
  Object.keys(servicePlan).forEach(function(item){
    console.log(servicePlan[item], data.plan)
    if (servicePlan[item].stripe_label === data.plan) {
      plan = item;
    }
  });

/*
  billingSchema.name = {
    type: "string",
    default: data.name,
    disabled: true
  };

*/
  billingSchema.method = {
    label: "Billing Method",
    type: "string",
    default: data.type,
    disabled: true
  };

  billingSchema.plan = {
    label: "Service Plan",
    type: "string",
    default: plan,
    disabled: true
  };

  var amt = '$' + (data.amount / 100).toString() + ".00 billed per month";

  billingSchema.amount = {
    label: "Cost",
    type: "number",
    default: amt,
    disabled: true
  };

  billingSchema.run = {
    "type": "string",
    "default": "true",
    "format": "hidden"
  };

  forms.generate({
    type: 'read-only',
    form: {
      legend: "Billing Information",
      submit: "Update",
      action: ""
    },
    schema: billingSchema,
    }, function (err, result){
      cb(null, result);
  });

};