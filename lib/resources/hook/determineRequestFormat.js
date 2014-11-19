var mergeParams = require('../../../view/mergeParams');

var view = require('view');
var _view;
 view.create({ path: __dirname + "/../../../view"}, function (err, v){
   if (err) {
     throw err;
   }
   _view = v;
});

module['exports'] = function determineRequestFormat (req, res, next) {
  
  var hook = require('./');
    var types = [];
    if (req.headers && req.headers.accept) {
      types = req.headers.accept.split(',');
    }
    req.resource.params.format = req.resource.params.format || "friendly";
    if (types.indexOf('text/html') !== -1 && req.resource.params.format === "friendly") {
      // console.log('RENDERING FRIENDLY RESPONSE')
      mergeParams(req, res, function(){
        _view['hook'].present({
          gist: req.hook.gist,
          request: req,
          response: res
        }, function(err, html){
          res.end(html);
        });
      });
    } else {
      //
      // If the response should be rendered raw, write the response as the Hook dictates
      //
      // console.log('RENDERING RAW RESPONSE');
      // override format
      mergeParams(req, res, function(){
       //console.log('resource parsed', req.resource.params)
        req.resource.params.format = "raw";
        return next(req, res);
      });
    }

}