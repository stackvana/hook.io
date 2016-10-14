module['exports'] = function view (opts, callback) {
  var self = this, $ = self.$;
  if (opts.theme) {
    $('#theme').attr('value', opts.theme);
    var themes = opts.themes;
  }
  if (opts.presenter) {
    $('#presenter').attr('value', opts.presenter);
  }
  callback(null, this.$.html());
};

module['exports'].useLayout = false;