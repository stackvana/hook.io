var psr = require('parse-service-request');
var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var mschema = require('mschema');
var cron = require('../../lib/resources/cron/cron');
var html = require('../helpers/html');

module['exports'] = function allCronPresenter (opts, cb) {

  var $ = this.$, 
    req = opts.request,
    res = opts.response,
    params = req.resource.params;

  var self = this;

  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  psr(req, res, function (req, res, fields) {
    for (var p in fields) {
      params[p] = fields[p];
    }
    finish();
  });

  function finish () {
    checkRoleAccess({ req: req, res: res, role: 'cron::read' }, function (err, hasPermission) {
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, 'cron::read'));
      } else {
        var validate = mschema.validate(req.resource.params, self.schema);
        if (!validate.valid) {
          validate.status = 'error';
          return res.json(validate);
        } else {
          return cron.find({ owner: req.resource.owner }, function (err, result) {
            if (err) {
              return res.end(err.message);
            }
            result.forEach(function(r){
              $('.crons').append(html.rowToString([
                html.makeLink(config.app.url + '/cron/' + r.owner + '/' + r.name, r.name),
                r.cronExpression,
                undefined,
                undefined,
                undefined,
                html.makeLink(config.app.url + '/cron/' + r.owner + '/' + r.name + '/admin', 'Edit'),
              ]));
            });
            return cb(null, $.html());
          });
        }
      }
    });
  }

};
