module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  if (req.user && req.user.username) {
    $('.myHooks').attr('href', '/' + req.user.username);
  }
  callback(null, this.$.html());
};