/*
var config = require('../../config');
var resource = require('resource');
var feature = resource.define('feature');
*/
var feature = {};

module['exports'] = feature;

feature.features = {
  "apiKeyLimit" : "number",
  "customTimeouts" : "boolean",
  "customRoleChecks" : "boolean",
  "privateServices" : "boolean"
};