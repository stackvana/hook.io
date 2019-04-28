var resource = require('resource');
var colors = require('colors');
var cache = require('../cache');
var alerts = resource.define('alerts');
var config = require('../../../config');
var util = require('util');
var fs = require('fs');

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
    metadata: data,
    code: data.code
  }, function (err, alert) {
    console.log('error creating alert:', err, alert);
  });
});

module['exports'] = alerts;