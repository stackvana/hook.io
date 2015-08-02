var resource = require('resource');
var hook = resource.define('hook');
var metric = require('../metric');
var config = require('../../../config');
var request = require('hyperquest');

hook.timestamps();

hook.property('name', {
  "type": "string",
  "default": "my-hook",
  "required": true,
  "minLength": 1,
  "maxLength": 50
});

hook.property('isPublic', {
  "type": "boolean",
  "default": true
});

hook.property('status', {
  "type": "string",
  "enum": ["active", "disabled"],
  "default": "active"
});

hook.property('gist', {
  "type": "string",
  "required": true,
});

hook.property('ran', {
  "type": "number",
  "default": 0
});

hook.property('owner', {
  "type": "string",
  "required": true
});

hook.property('theme', {
  "type": "string",
  "required": false,
  "default": ""
});

hook.property('cron', 'string');
hook.property('lastCron', 'string');
hook.property('cronActive', 'boolean')

hook.property('presenter', {
  "type": "string",
  "required": false,
  "default": ""
});

// holds the schema of the hook
// remark: "schema" namespace is occupied by jugglingdb, and will be available after juggling is removed
hook.property('mschema', {
  "type": "object"
});

/* removed: legacy
hook.property('isStreaming', {
  "type": "boolean",
  "default": false,
  "required": true
});
*/

hook.property('mode', {
  "type": "string",
  "enum": ["Production", "Development"],
  "required": true,
  "default": "Development"
});

// cache settings
hook.property('cacheSourceCode', {
  "type": "boolean",
  "default": false,
  "required": true
});

hook.property('cacheThemeView', {
  "type": "boolean",
  "default": false,
  "required": true
});

hook.property('cacheThemePresenter', {
  "type": "boolean",
  "default": false,
  "required": true
});

hook.property('isPromoted', {
  "type": "boolean",
  "description": "Promoted hooks are top-level Hooks show-cased on http://hook.io",
  "default": false
});

// updates metrics for total hook count after creating
hook.after('create', function(data, next){
  metric.incr('/hook/count');
  next(null, data);
});

hook.fork = require('./fork');
hook.run = require('./run');
hook.runRemote = require('./runRemote');
hook.runHook = require('./runHook');
hook.determineRequestFormat = require('./determineRequestFormat');
hook.parseRequestBody = require('./parseRequestBody');
hook.formatError = require('./formatError');
hook.fetchHookSourceCodeFromGithub = require('./fetchHookSourceCodeFromGithub');
hook.fetchHookTheme = require('./fetchHookTheme');
hook.fetchHookPresenter = require('./fetchHookPresenter');
hook.loadPresenter = require('./loadPresenter');
hook.attemptToRequireUntrustedHook = require('./attemptToRequireUntrustedHook');
hook.preprocessHook = require('./preprocessHook');
hook.renderView = require('./renderView');
hook.runUntrustedService = require('run-service');
hook.postprocessHook = require('./postprocessHook');
hook.validateServiceInput = require('./validateServiceInput');

module['exports'] = hook;