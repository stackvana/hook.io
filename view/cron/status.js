let cron = require('../../lib/resources/cron/cron');
let dateformat = require('dateformat');
let fnst = require('date-fns-timezone')
let fns = require('date-fns')

module.exports = function (opts, cb) {
  var $ = this.$,
      req = opts.req,
      res = opts.res;
  $ = req.white($);
  cron.getStatus(function (err, result) {
    if (err) {
      return res.end(err.message);
    }
    var date = result.lastCronBatch;
    var timezone = req.session.timezone || 'America/New_York';
    const zonedDate = fnst.formatToTimeZone(date, 'MMMM DD, YYYY HH:mm:ss z', { timeZone: timezone });
    $('.lastCronBatch').html(zonedDate);
    $('.status').html(JSON.stringify(result, true, 2))
    cb(null, $.html());
  })
}