var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var mschema = require('mschema');
var cron = require('../../lib/resources/cron/cron');
var resource = require('resource');
var web = require('../../lib/web/web');

module.exports = function (opts, cb) {
  var $ = this.$, 
    req = opts.request,
    res = opts.response,
    params = req.resource.params;

  var self = this;

  $ = req.white($);

  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }

    var validate = mschema.validate(req.resource.params, self.schema);
    if (!validate.valid) {
      validate.status = "error";
      return res.json(validate);
    }

    // params.owner = req.session.user;
    checkRoleAccess({ req: req, res: res, role: 'cron::update' }, function (err, hasPermission) {
      // console.log('check for role access', err, hasPermission)
      if (!hasPermission) {
        if (req.jsonResponse !== true && typeof params.hook_private_key === 'undefined') {
          req.session.redirectTo = req.url;
          return res.redirect('/login');
        }
        return res.end(config.messages.unauthorizedRoleAccess(req, 'cron::update'));
      } else {
        var name;
        if (typeof params.previousName !== 'undefined') {
          name = params.previousName.toLowerCase();
        } else {
          name = params.name.toLowerCase();
        }
        if (typeof name === 'undefined' || name.length === 0) {
          return res.redirect('/cron/' + req.session.user);
        }
        cron.findOne({ owner: params.owner, name: name }, function (err, c){
          if (err) {
            return web.handle404(req, res);
          }
          req.cron = c;
          finish();
        });
      }
    });
  });

  function finish () {
    var data = req.resource.params;

    if (req.method === 'GET') {
      if (!req.isAuthenticated()) {
        $('.keys').remove();
        $('.myKeys').remove();
        req.session.redirectTo = '/cron/create';
        return res.redirect('/login');
      } else {
        // load the cron and databind values
        var c = req.cron;
        $('.cronName').val(c.name);
        $('.cronPreviousName').val(c.name);
        $('.cronOwner').val(c.owner);
        $('.cronURI').val(c.uri);
        if (c.status === 'paused') {
          $('input[name="status"][value="paused"]').attr('checked', 'CHECKED');
        } else {
          $('input[name="status"][value="active"]').attr('checked', 'CHECKED');
        }
        var boot = {
          baseUrl: config.app.url,
          owner: req.session.user,
          name: req.resource.params.name
        };
        var out = $.html();
        out = out.replace('{{cron}}', JSON.stringify(boot, true, 2));
        return cb(null, out);
      }
      return;
    }
    data.id = req.cron.id;
    data.owner = req.cron.owner;
    // update the cron information in the couchdb document
    // recalulate the next time the cron should run
    // store the updated cron object in the redis cache
    return cron.update(data, function (err, result) {
      if (err) {
        // TODO: generic error handler
        return res.end(err.message);
      }
      resource.emit('cron::updated', {
        ip: req.connection.remoteAddress,
        owner: req.cron.owner,
        name: data.name
      });
      var key = '/' + data.owner + '/' + data.name;
      if (req.jsonResponse) {
        var rsp = {
          'status': 'updated',
          'key': key,
          'value': result
        };
        return res.json({ status: 'updated', cron: result });
      }
      return res.redirect('/admin?owner=' + req.cron.owner + '&name=' + data.name + '&status=saved');
    });
    cb(null, 'updated');
 
  }

};

module['exports'].schema = {
  "name": {
    type: 'string'
  },
  "owner": {
    type: 'string',
    required: true
  }
};