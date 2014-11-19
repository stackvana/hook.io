var request = require('hyperquest');

module['exports'] = function fetchHookTheme (url, callback) {
  request.get(url, function(err, res){
    if (err) {
      // no theme, do nothing
      return callback(err);
    }
    var themeHtml = '';
     res.on('data', function(c){
       themeHtml += c.toString();
     });
     res.on('end', function(){
       callback(null, themeHtml);
     });
  });
}
