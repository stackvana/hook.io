var checkRoleAccess = require('../../lib/server/routeHandlers/checkRoleAccess');
var config = require('../../config');
var cron = require('../../lib/resources/cron/cron');
var metric = require('../../lib/resources/metric');
var cache = require('../../lib/resources/cache');
var df = require('dateformat');

module.exports = function (opts, cb) {
  var $ = this.$,
    req = opts.req,
    res = opts.res;
  $ = req.white($);

  checkRoleAccess({ req: req, res: res, role: 'cron::read' }, function (err, hasPermission) {
    if (!hasPermission) {
      return res.end(config.messages.unauthorizedRoleAccess(req, 'cron::read'));
    } else {
      finish();
    }
  });

  function finish () {
    cron.findOne({
      owner: req.params.owner,
      name: req.params.cron
    }, function (err, c) {
      if (err) {
        return res.end(err.message);
      }
      $('.cronName').html(c.name);
      cache.get('/cron/' + req.params.owner + '/' + req.params.cron, function (err, cached) {
        metric.get('/cron/' + req.params.owner + '/' + req.params.cron, function (err, metrics) {
          /*
          $('.json').html(JSON.stringify(c, true, 2));
          $('.json').append(JSON.stringify(cached, true, 2));
          $('.json').append(JSON.stringify(metrics, true, 2));
          */
          $('.totalExecutions').html(metrics || 'n/a');
          if (cached) {
            $('.lastExecutionDate').html(df(cached.lastExecutionDate,  'mm/dd/yyyy HH:MM:ss Z'));
            $('.nextExecutionDate').html(df(cached.nextExecutionDate,  'mm/dd/yyyy HH:MM:ss Z'));
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