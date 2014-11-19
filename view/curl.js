module['exports'] = function view (opts, callback) {
  callback(null, this.$.html());
};