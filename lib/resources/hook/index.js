var resource = require('resource');
var hook = resource.define('hook');
var user = require('../user');
var metric = require('../metric');
var config = require('../../../config');
var request = require('hyperquest');
var slug = require('slug');

hook.languages = [
  "bash",
  "es7",
  "coffee-script",
  "javascript",
  "lua",
  "perl",
  "php",
  "python",
  "python3",
  "ruby",
  "scheme",
  "smalltalk",
  "tcl"
];

hook.timestamps();

hook.property('name', {
  "type": "string",
  "default": "my-hook",
  "required": true,
  "minLength": 1,
  "maxLength": 50,
  "description": "The name of the Hook. This will be part of the url to access to the Hook."
});

hook.property('path', {
  "type": "string",
  "default": "/:id",
  "required": false,
  "maxLength": 100,
  "description": "Optional path of the Hook. This allows for url route parameter style routing."
});

hook.property('description', {
  "type": "string",
  "default": "",
  "required": false,
  "description": "A brief description of what the Hook does"
});

hook.property('language', {
  "type": "string",
  "default": "javascript",
  "required": true,
  "minLength": 1,
  "maxLength": 50,
  "description": "The programming language of the Hook."
});

hook.property('isPublic', {
  "type": "boolean",
  "default": true
});

hook.property('customTimeout', {
  "type": "number",
  "default": config.UNTRUSTED_HOOK_TIMEOUT,
  "min": 1000,
  "max": 300000,
  "description": "Custom timeout variable for services"
});

hook.property('themeName', {
  "type": "string",
  "default": "form",
  "required": false,
  "description": "The name of the Theme, such as 'form'"
});

hook.property('themeStatus', {
  "description": "the current status of the theme",
  "enum": ["enabled", "disabled", "error"],
  "default": "disabled",
  "required": false
});

hook.property('status', {
  "type": "string",
  "enum": ["active", "disabled"],
  "default": "active"
});

hook.property('gist', {
  "type": "string",
  "required": false,
  "description": "source of the Hook provided as a Github Gist Url"
});

hook.property('ran', {
  "type": "number",
  "default": 0
});

hook.property('forked', {
  "type": "number",
  "default": 0,
  "description": "The amount of times the Hook has been forked"
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

hook.property('hookType', {
  "type": "string",
  "description": "additional ( internal ) type classification for hooks. currently used to help manage hot-code gateways",
  "enum": ["service", "gateway"],
  "default": "service",
  "required": false
});

hook.property('sourceType', {
  "type": "string",
  "description": "the active type of source for the hook",
  "enum": ["code", "gist"],
  "default": "code",
  "required": false
});

hook.property('source', {
  "type": "string",
  "description": "source code of Hook",
  "required": false
});

hook.property('themeSource', {
  "type": "string",
  "description": "source code of Hook's view",
  "required": false
});

hook.property('presenterSource', {
  "type": "string",
  "description": "source code of Hook's presenter",
  "required": false
});

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
  "description": "Promoted hooks are top-level Hooks show-cased on https://hook.io",
  "default": false
});

hook.property('isPrivate', {
  "type": "boolean",
  "description": "Private hooks require access keys",
  "default": false
});


var checkRoleAccess = require('../../server/routeHandlers/checkRoleAccess');

hook.before('create', function (data, next) {
  // check auth role
  var self = this;
  checkRoleAccess({ req: self.req, res: self.res, role: "hook::create" }, function (err, hasPermission) {
    if (!hasPermission) {
      next(new Error(config.messages.unauthorizedRoleAccess(self.req, "hook::create")), data);
      //return res.end(config.messages.unauthorizedRoleAccess(req));
    } else {
      next(null, data);
    }
  });
});

hook.before('create', function (data, next){
  // slugify name
  data.name = slug(data.name);
  next(null, data);
});

function onlyPaidAccountsCanCreatePrivateServices (data, next) {
  var self = this;
  if (data.isPrivate) {
    user.findOne({ name: data.owner }, function (err, _user){
      if (err) {
        return next(err);
      }
      if (_user.paidStatus === "paid" || (self.req && self.req.session && self.req.session.paidStatus === "paid")) {
        next(null, data);
      } else {
        var msg = {
          error: true,
          message: "Only paid accounts can create private Hook Services!",
          type: "paid-account-required"
        };
        next(new Error(JSON.stringify(msg)))
      }
    });
  } else {
    next(null, data);
  }
}

// check that non-paid account is not trying to create private hook
hook.before('create', onlyPaidAccountsCanCreatePrivateServices);
// check that non-paid account is not trying to create private hook
hook.before('update', onlyPaidAccountsCanCreatePrivateServices);

// updates metrics for total hook count after creating
hook.after('create', function(data, next){
  metric.incr('/hook/count');
  next(null, data);
});

hook.fork = require('./fork');
hook.run = require('./run');
hook.runHook = require('./runHook');
hook.determineRequestFormat = require('./determineRequestFormat');
hook.invalidateCache = require('./invalidateCache');
hook.formatError = require('./formatError');
hook.fetchHookSourceCode = require('./fetchHookSourceCode');
hook.fetchHookTheme = require('./fetchHookTheme');
hook.fetchHookPresenter = require('./fetchHookPresenter');
hook.loadPresenter = require('./loadPresenter');
hook.attemptToRequireUntrustedHook = require('./attemptToRequireUntrustedHook');
hook.preprocessHook = require('./preprocessHook');
hook.renderView = require('./renderView');
hook.runUntrustedService = require('run-service');
hook.runRemote = require('run-remote-service');
hook.postprocessHook = require('./postprocessHook');
hook.spawnService = require('stackvana').spawn;

hook.validateServiceInput = require('./validateServiceInput');

module['exports'] = hook;