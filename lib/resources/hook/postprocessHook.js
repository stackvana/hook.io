
module['exports'] = function postprocessHook (err, opts, _hook) {
  var hook = require('./');
  
  var req = opts.req,
      res = opts.res;
  // after the hook is run fire and forget to update the hook count
  // and hook schema
  var query = { name: req.params.hook, owner: req.params.username };
  hook.find(query, function (err, results) {
    if (err) {
      throw err;
      // do nothing
      // return _res.end(err.message);
    }
    if (results.length > 0) {
      var _h = results[0];

      if (typeof err !== null) {
        _h.ran = _h.ran + 1;
      }

      // in addition, save the schema onto the document ( for the UI )
      _h.mschema = _hook.schema;
      // Remark: don't save hook theme and presenter? was causing issue with theme override from incoming request parameters
        //_h.theme = _hook.theme;
        //_h.presenter = _hook.presenter;
      _h.save(function(err) {
        if (err) {
          console.log("UNABLE TO SAVE HOOK");
          console.log(err);
          // do nothing
        }
      });

    } else {
      // do nothing
    }

  });
}
