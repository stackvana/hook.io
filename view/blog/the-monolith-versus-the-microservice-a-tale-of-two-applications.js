var df = require('dateformat');

module['exports'] = function view (opts, callback) {
  var self = this, $ = this.$;
  callback(null, $.html());
};

// cache this page indefintely
module['exports'].cache = 0;