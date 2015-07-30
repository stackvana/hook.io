module['exports'] = function view (opts, callback) {
  var req = opts.request
      $ = this.$;
  $('title').html('hook.io/blog - all things microservice, the hook.io microservice blog');
  callback(null, $.html());
};