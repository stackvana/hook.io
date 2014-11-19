module['exports'] = function view (opts, callback) {
  callback(null, this.$.html().replace(/\{\{username\}\}/g, opts.request.query.user));
};