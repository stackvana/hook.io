var mergeParams = require('../../../view/mergeParams');

var view = require('view');
var _view;
 view.create({ path: __dirname + "/../../../view"}, function (err, v){
   if (err) {
     throw err;
   }
   _view = v;
});

function handle404(req, res) {
  _view['404'].present({
    request: req,
    response: res
  }, function (err, html){
    res.writeHead(404);
    res.end(html);
  })
};

module['exports'] = function run (req, res, next) {
  var hook = require('./');

  if (typeof req.params.subhook !== "undefined" && req.params.subhook.length) {
    req.params.hook = req.params.hook + "/" + req.params.subhook;
  }

  mergeParams(req, res, function(){
    var query = { owner: req.params.username, name: req.params.hook };
    hook.find(query, function (err, result) {
      if (err) {
        return res.end(err.message);
      }

      if (result.length === 0) {
        return handle404(req, res);
      }
      // attach found hook onto request scope
      req.hook = result[0];

      req.params.gist = result[0].gist;
      req.resource.params.gist = result[0].gist;
      hook.parseRequestBody(req, res, function(){
        hook.determineRequestFormat(req , res, function(req, res){
          hook.runHook({ req: req, res: res }, function(err, res){
            // do nothing
            console.log('ran the hook', err, res)
          });
        });
      });
    });
  });
};