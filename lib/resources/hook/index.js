var resource = require('resource');
var hook = resource.define('hook');
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
  "required": true,
  "default": config.defaultTheme
});

hook.property('cron', 'string');
// hook.property('lastCron', 'string');
hook.property('cronActive', 'boolean')

hook.property('presenter', {
  "type": "string",
  "required": true,
  "default": config.defaultPresenter
});

// holds the schema of the hook
// remark: "schema" namespace is occupied by jugglingdb, and will be available after juggling is removed
hook.property('mschema', {
  "type": "object"
});

hook.property('isStreaming', {
  "type": "boolean",
  "default": false,
  "required": true
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
hook.runUntrustedHook = require('./runUntrustedHook');
hook.postprocessHook = require('./postprocessHook');

module['exports'] = hook;