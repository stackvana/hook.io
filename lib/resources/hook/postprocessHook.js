var metric = require('../metric');

module['exports'] = function postprocessHook (err, opts, _hook) {
  metric.incr(opts.req.hook.owner + "/" + opts.req.hook.name + '/hits');
}