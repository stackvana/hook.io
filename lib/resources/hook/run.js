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

var themes = require('../themes');

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

      // override theme if set in url
      var params = req.resource.params;
      if (typeof params.theme !== 'undefined' && themes[params.theme] !== 'undefined') {
        req.hook.theme = themes[params.theme].theme;
        req.hook.presenter = themes[params.theme].presenter;
      }

      req.params.gist = result[0].gist;
      req.resource.params.gist = result[0].gist;
      // console.log('parseRequestBody')
      hook.parseRequestBody(req, res, function(){
        // console.log('determineRequestFormat')
        hook.determineRequestFormat(req , res, function (req, res){
          // console.log('runHook')
          hook.runHook({ req: req, res: res }, function (err, res){
            // do nothing
            // console.log('ran the hook');
            if (err) {
              // response should have already been handled at this point
              console.log('hook had an issue running ' + err.message);
            }
          });
        });
      });
    });
  });
};