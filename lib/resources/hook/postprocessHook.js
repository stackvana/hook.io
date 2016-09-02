var metric = require('../metric');

module['exports'] = function postprocessHook (err, opts, _hook) {
  metric.incr("/" + opts.req.hook.owner + "/" + opts.req.hook.name + '/hits');
  metric.incr("/" + opts.req.hook.owner + "/hits");
  metric.incr("/" + opts.req.hook.owner + "/totalHits");
  metric.incr("/hook/totalHits");
}