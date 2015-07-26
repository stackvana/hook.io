var Datastore = require('../lib/resources/datastore').Datastore;

module['exports'] = function view (opts, callback) {

  var $ = this.$, 
      req = opts.request, 
      params = req.resource.params;

  // if not logged in, simply show documentation page
  if (!req.isAuthenticated()) {
    $('.last').remove();
    return callback(null, $.html());
  }

  var datastore = new Datastore({ root: req.user.username });

  if (typeof params.key !== 'undefined') {
    datastore.get(params.key, function(err, result){
      if (err) {
        return callback(err);
      }
      return callback(null, JSON.stringify(result, true, 2));
    });
  } else {
    $('.last').remove();
    return callback(null, $.html());
    
    /* TODO: 
    datastore.recent(function(err, keys){
      if (err) {
        return callback(err.message);
      }
      var str = '';
      keys.forEach(function(k){
        str += '<li><a href="' + '/datastore?key=' + k + '">'
        str += k;
        str += '</a></li>'
      });
      $('.lastKeys').html(str);
      return callback(null, $.html());
    });
    */
  }

};