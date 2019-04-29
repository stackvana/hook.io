var resource = require('resource');
var colors = require('colors');
var cache = require('../cache');
var alerts = resource.define('alerts');
var config = require('../../../config');
var util = require('util');
var fs = require('fs');
var async = require('async');
var email = require('resource-email');

var exceededLimitEmailTemplate = fs.readFileSync(__dirname + '/emails/exceeded-rate-limit.txt').toString();
var approachingLimitEmailTemplate = fs.readFileSync(__dirname + '/emails/approaching-rate-limit.txt').toString();

alerts.timestamps();

alerts.property('name', {
  'type': 'string',
  'default': 'my-alert-name',
  'required': true,
  'minLength': 1,
  'maxLength': 50
});

alerts.property('username', {
  'type': 'string',
  'required': true,
  'minLength': 1,
  'maxLength': 50
});

alerts.property('email', {
  'type': 'string',
  'required': false,
  'default': 'hookmaster@hook.io'
});

alerts.property('subject', {
  'type': 'string',
  'required': true,
  'default': 'Alert from hook.io'
});

alerts.property('code', {
  'type': 'string',
  'required': true,
  'default': 'DEFAULT_ALERT_CODE'
});

alerts.property('message', {
  'type': 'string'
});

alerts.property('metadata', {
  'type': 'object'
});

alerts.property('status', {
  'type': 'string',
  'default': 'queued',
  'required': true,
  'enum': ['queued', 'sent', 'error']
});

alerts.persist(config.couch);
resource.on('usage::ratelimit', function (data) {
  alerts.create({
    username: data.username,
    email: data.email,
    name: 'Rate Limit Exceeded',
    subject: 'Account Rate Limit Exceeded',
    metadata: data,
    code: data.code
  }, function (err, alert) {
    console.log('error creating alert:', err, alert);
  });
});

// TODO: clear out / archive older alerts after some period of time ( perhaps 3 months )
alerts.sendAlerts = function (data, finish) {
  alerts.find({ status: 'queued' }, function (err, _alerts) {
    console.log('Found alerts', _alerts.length);
    // consolidate alerts into object keyed on email
    // we shouldn't be sending out multiple alert emails at once, it probably means an error in alerting system
    var deduped = {};
    _alerts.map(function(a){
      deduped[a.email] = a;
    });
    console.log('Dedupled alerts to', Object.keys(deduped).length);
    async.eachLimit(Object.keys(deduped), 5, processAlert, function (err, re){
      finish();
    });
    function processAlert (key, cb) {
      var _alert = deduped[key];
      _alert.message = exceededLimitEmailTemplate;
      _alert.message = _alert.message.replace('{{username}}', _alert.username);
      _alert.message = _alert.message.replace(/{{servicePlan}}/g, _alert.metadata.servicePlan);
      _alert.message = _alert.message.replace(/{{monthlyLimit}}/g, _alert.metadata.monthlyLimit);
      console.log('sending alert', _alert.email, _alert);
      email.send({
        provider: config.email.provider,
        api_user: config.email.api_user,
        api_key: config.email.api_key,
        to: _alert.email,
        bcc: ['marak@hook.io'],
        from: 'hookmaster@hook.io',
        subject: _alert.subject,
        html:  _alert.message
      }, function (err) {
        if (err) {
          console.log(err);
          cb();
          return;
        }
        console.log('alert email sent', data)
        _alert.status = 'sent';
        _alert.save(cb);
      })
    }
  });
};

module['exports'] = alerts;