module['exports'] = function view (opts, callback) {
  var self = this, $ = self.$;
  if (opts.theme) {
    $('#theme').attr('value', opts.theme);
  }
  if (opts.presenter) {
    $('#presenter').attr('value', opts.presenter);
  }
  callback(null, this.$.html());
};