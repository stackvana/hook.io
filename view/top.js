var metric = require('../lib/resources/metric');
// TODO: add top running services / top hits report using sets and http://redis.io/commands/zrevrangebyscore methods
module['exports'] = function topPresenter (opts, callback) {
  var req = opts.req, res = opts.res, $ = this.$;
  var appName = req.hostname;
  if (req.session.user !== "marak") {
    return res.end('unauthorized');
  }
  metric.top('running', function(err, members){
    if (err) {
      return res.end(err.message);
    }
    $('.running').html(JSON.stringify(members, true , 2));
    metric.top('hits', function(err, members){
      if (err) {
        return res.end(err.message);
      }
      $('.hits').html(JSON.stringify(members, true , 2));
      callback(null, $.html());
    });
  });
};