
module['exports'] = function (opts, callback) {

  var $ = this.$, req = opts.req;
  var hook = require('../lib/resources/hook');
  var appName = req.hostname;

  hook.find({ owner: "marak" }, function (err, results){
    if (err) {
      return res.end(err.message);
    }

    // filter results to only show examples
    results = results.filter(function(h){
      if (h.name.search(/examples-/) !== -1) {
        return h;
      }
    });

    var grouped = {};
    results.forEach(function(h) {
      h.language = h.language || "javascript";
      grouped[h.language] = grouped[h.language] || [];
      grouped[h.language].push(h);
    });

    Object.keys(grouped).forEach(function(key){
      // group headers per language
      $('.examples').append('<h3>' + key + '</h3>')
      grouped[key].forEach(function(h){
        // TODO: add description of hook with h.description ( data is missing for most examples )
        $('.examples').append('<a href="/marak/' + h.name + '">' + h.name + '</a><br/>')
      });
      $('.examples').append('<br/>');
      // group by language type
      // if (h.name.search(/examples-/) !== -1) {
        // $('.examples').append('<a href="/marak/' + h.name + '">' + h.name + '</a><br/>')
      // }
    });

    var out = $.html();
    out = out.replace(/\{\{appName\}\}/g, appName);
    callback(null, out);

  });

};