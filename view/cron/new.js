var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var mschema = require('mschema');
var cron = require('../../lib/resources/cron/cron');

module['exports'] = function createCronPresenter (opts, callback) {

  var $ = this.$, 
    req = opts.request,
    res = opts.response,
    params = req.resource.params;

  var self = this;

  $ = req.white($);

  if (req.method === 'GET') {
    if (!req.isAuthenticated()) {
      req.session.redirectTo = '/cron/new';
      return res.redirect('/login');
    } else {
      return callback(null, $.html());
    }
  }
  psr(req, res, function(req, res, fields){
    for (var p in fields) {
      params[p] = fields[p];
    }
    finish();
  });

  function finish () {
    checkRoleAccess({ req: req, res: res, role: 'cron::create' }, function (err, hasPermission) {
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, 'cron::create'));
      } else {
        var validate = mschema.validate(req.resource.params, self.schema);
        if (!validate.valid) {
          validate.status = 'error';
          return res.json(validate);
        } else {
          req.resource.params.owner = req.resource.owner;
          req.resource.params;
          return cron.create({
            name: req.resource.params.name,
            owner: req.resource.params.owner,
            uri: req.resource.params.uri,
            cronExpression: req.resource.params.cronExpression,
            status: req.resource.params.status
          }, function (err, result) {
            if (err) {
              res.status(400);
              return res.json({ error: true, message: err.message });
            }
            if (req.jsonResponse) {
              return res.json(result);
            } else {
              return res.redirect(config.app.url + '/cron/' + result.owner + '/' + result.name + '/admin');
            }
          });
        }
      }
    });
  }

};

module['exports'].schema = {
  name: {
    type: 'string',
    required: true
  },
  uri: {
    type: 'string',
    required: true,
    regex: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/
  }
};