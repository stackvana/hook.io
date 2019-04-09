let cron = require('../../lib/resources/cron/cron');

module.exports = function (opts, cb) {
  var $ = this.$,
      req = opts.req,
      res = opts.res;

  cron.getStatus(function (err, result) {
    if (err) {
      return res.end(err.message);
    }
    $('.status').html(JSON.stringify(result, true, 2))
    cb(null, $.html());
  })
}