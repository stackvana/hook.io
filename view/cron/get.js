var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var cron = require('../../lib/resources/cron/cron');
var metric = require('../../lib/resources/metric');
var cache = require('../../lib/resources/cache');
var df = require('dateformat');
var mschema = require('mschema');
var psr = require('parse-service-request');

module.exports = function (opts, cb) {
  var $ = this.$,
    req = opts.req,
    res = opts.res;
  $ = req.white($);
  var self = this;
  psr(req, res, function(){
    
    if (typeof req.params === 'object') {
      Object.keys(req.params).forEach(function (p) {
        req.resource.params[p] = req.params[p];
      });
    }
    
    checkRoleAccess({ req: req, res: res, role: 'cron::read' }, function (err, hasPermission) {
      if (!hasPermission) {
        return res.end(config.messages.unauthorizedRoleAccess(req, 'cron::read'));
      } else {
      
        var validate = mschema.validate(req.resource.params, self.schema);
        if (!validate.valid) {
          validate.status = "error";
          return res.json(validate);
        } else {
          finish();
        }
      }
    });
  });

  function finish () {
    cron.findOne({
      owner: req.params.owner,
      name: req.params.name
    }, function (err, c) {
      if (err) {
        return res.end(err.message);
      }
      $('.cronName').html(c.name);
      cache.get('/cron/' + req.params.owner + '/' + req.params.name, function (err, cached) {
        if (cached === null) {
          return res.end('Something went wrong getting cached cron. Please contact support.');
        }
        metric.get('/cron/' + req.params.owner + '/' + req.params.name, function (err, metrics) {
          /*
          $('.json').html(JSON.stringify(c, true, 2));
          $('.json').append(JSON.stringify(cached, true, 2));
          $('.json').append(JSON.stringify(metrics, true, 2));
          */
          var obj = {
            name: c.name,
            owner: c.owner,
            method: c.method,
            status: c.status,
            cronExpression: c.cronExpression,
            uri: c.uri,
            hits: metrics,
            lastExecutionDate: df(cached.lastExecutionDate,  'mm/dd/yyyy HH:MM:ss Z'),
            nextExecutionDate: df(cached.nextExecutionDate,  'mm/dd/yyyy HH:MM:ss Z')
          };
          if (req.jsonResponse) {
            return res.json(obj);
          }
          $('.totalExecutions').html(metrics || 'n/a');
          if (cached.lastExecutionDate) {
            $('.lastExecutionDate').html(obj.lastExecutionDate);
          }
          if (cached.nextExecutionDate) {
            $('.nextExecutionDate').html(obj.nextExecutionDate);
          }
          $('.cronMethod').html(c.method);
          $('.cronURI').html(c.uri);
          $('.cronExpression').html(c.cronExpression);
          $('.cronStatus').html(c.status);
          $('.editLink').attr('href', config.app.url + '/cron/' + c.owner + '/' + c.name + '/admin');
          $('.testLink').attr('href', config.app.url + '/cron/' + c.owner + '/' + c.name + '/test');
          cb(null, $.html());
        });
      });
    });
  }

};

module.exports.schema = {
  'owner': {
    type: 'string',
    required: true
  },
  'name': {
    type: 'string',
    required: true
  }
};