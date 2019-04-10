// TODO: if there is copied code in session ( from save to url or fork ), post message that content being created will be preopulated. have clear button as well [X]
// TODO: make `gateway` a reserved hook name since it might be confusing for users with /gateway logs
var hook = require('../lib/resources/hook');
var hooks = require('microcule-examples');
var psr = require('parse-service-request');
var config = require('../config');
var themes = require('../lib/resources/themes');
var hooks = require('microcule-examples');
var resource = require('resource');
var checkRoleAccess = require('../lib/server/routeHandlers/checkRoleAccess');

module['exports'] = function view (opts, callback) {
  var req = opts.request,
    res = opts.response;

  var $ = this.$,
    self = this;

  var appName = req.hostname;

  var user, boot;

  var params;
  psr(req, res, function(req, res, fields){
    params = req.resource.params;
    for (var p in fields) {
      params[p] = fields[p];
    }

    // TODO: move to resource.before hooks...maybe not. better to avoid the pre-processing logic...
    checkRoleAccess({ req: req, res: res, role: 'hook::create' }, function (err, hasPermission) {
      if (!hasPermission /* || req.resource.owner === "anonymous" */ ) { // don't allow anonymous hook creation
        if (req.jsonResponse !== true && typeof params.hook_private_key === 'undefined') {
          req.session.redirectTo = '/new';
          return res.redirect('/login');
        }
        return res.end(config.messages.unauthorizedRoleAccess(req, 'hook::create'));
      } else {
        user = req.resource.owner;
        boot = {
          owner: user
        };
        finish();
      }
    });

  });

  function finish () {
    $('title').html(appName + ' - Create new Service');

    var gist = params.gist;
    //$('.codeEditor').html(html);
    if (req.method === 'POST' && typeof params.scaffold === 'undefined') {

      if (typeof params.name === 'undefined' || params.name.length === 0) {

        var msg = 'Service name is required!';
        if (req.jsonResponse === true) {
          msg = {
            error: true,
            message: msg,
            property: 'name',
            constraint: 'required',
            required: true,
            actual: false
          };
          return res.end(JSON.stringify(msg, true, 2));
        } else {
          return res.end(msg);
        }

      }

      if (typeof params.view === 'string' && params.view.length > 1) {
        params.themeSource = params.view;
        params.themeActive = true;
      }

      if (typeof params.theme === 'string' && params.theme.length === 0) {
        delete params.theme;
      }
      if (typeof params.presenter === 'string' && params.presenter.length === 0) {
        delete params.presenter;
      }

      if (typeof params.hookSource === 'undefined') {
        params.hookSource = 'code';
      }

      if (params.isPrivate === 'true') {
        params.isPrivate = true;
      }

      params.sourceType = params.hookSource;

      if (params.themeActive) {
        params.themeStatus = 'enabled';
      }

      req.resource.owner = req.resource.owner.toLowerCase();
      params.name = params.name.toLowerCase();

      params.cron = params.cronString;

      if (params.hookSource === 'code') {
        delete params.gist;
        // updated 9/2/16 to allow .code parameter ( instead of source )
        params.source = params.source || params.code || params.codeEditor;
        if (typeof params.source === 'undefined') {
          // Remark: It might be better to return an error here instead of assigning a default value...
          //         It can be a bit surprising if user intended to supply source code but ended up with this default value due to bad parameters to Hook.create
          // params.source = "module['exports'] = function myService (req, res, next) {  \n  res.end('source not provided'); \n};";
        }
      }
      // TODO: remove this line
      params.owner = req.resource.owner;

      if (params.isPrivate === true || params.isPrivate === 'true') {
        params.isPrivate = true;
      } else {
        params.isPrivate = false;
      }

      // Only allow fields which exist on the Hook resource
      // Should this be an option in resource library itself?
      var safeParams = {};
      Object.keys(hook.schema.properties).forEach(function (p) {
        if (params[p] !== 'undefined') {
          safeParams[p] = params[p];
        }
      });

      return hook.create.call({ req: req, res: res }, safeParams, function (err, result) {
        if (err) {
          return callback(null, err.message);
        }
        var h = result;
        req.hook = h;

        resource.emit('hook::created', {
          ip: req.connection.remoteAddress,
          owner: params.owner,
          name: params.name
        });

        if (req.jsonResponse) {
          return res.json({ status: 'created', hook: result });
        } else {
          // if not, redirect to admin page for newly created hook
          return res.redirect('/admin?owner=' + h.owner + '&name=' + h.name + '&status=created');
        }
      });

    }

    if (typeof req.session.gistLink === 'string') {
      // todo: after created, unset gistSource so it doesn't keep popping up
      $('.gist').attr('value', req.session.gistLink);
    } else {
      $('.gistStatus').remove();
    }

    // TODO: update to use req.session.servicePlan instead?
    if (req.session.paidStatus === 'paid') {
      $('.paidAccount').remove();
    } else {
      $('.hookPrivate').attr('DISABLED', 'DISABLED');
      $('.hookPrivateLabel').css('color', '#aaa');
    }
    $('.typeOfService').remove();
    $('.cronSettings').remove();
    $('.redirectOptions').remove();

    $('.simpleBot').remove();
    $('.webhookPlugins').remove();
    $('.botAgent').remove();

    var services = hooks.services;
    var examples = {};
    boot.examples = examples;

    /*
      for (var e in examples) {
        for (var code in examples[e]) {
          // $('.services').append(examples[e][code]);
        }
      }
      */
    $ = req.white($);

    return callback(null, $.html());

  }

};

module['exports'].schema = {
  'name': {
    'type': 'string',
    'required': true
  },
  'path': {
    'type': 'string'
  },
  'isPrivate': {
    'type': 'boolean',
    'default': false
  },
  'source': {
    'type': 'string',
    'required': false
  }
};