module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  if (req.user && req.session.user) {
    $('.myHooks').attr('href', '/' + req.session.user);
  }
  callback(null, this.$.html());
};