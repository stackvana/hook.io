var hook = require('../../resources/hook');

module['exports'] = function handleHookPackage (req, res) {

   /*

   // TODO: make configurable for private hooks
   if (!req.isAuthenticated()) {
     req.session.redirectTo = req.url;
     return res.redirect('/login');
   }

   if (req.session.user !== req.params.owner && req.session.user !== "marak") {
     return res.end(req.session.user + ' does not have permission to view ' + req.params.owner + "/" + req.params.hook);
   }
   */

   // fetch the latest version of hook ( non-cached )
   hook.find({ owner: req.params.owner, name: req.params.hook }, function (err, result) {
     if (err) {
       return res.end(err.message);
     }
     if (result.length === 0) {
       return server.handle404(req, res);
     }
     var h = result[0];
     // TODO: better package.json support
     var pkg = {
       "name": h.name,
       "version": "1.0.0",
       "description": "",
       "main": "index.js",
       "scripts": {
         "test": "echo \"Error: no test specified\" && exit 1"
       },
       "author": h.owner,
       "license": "MIT"
     };
     res.end(JSON.stringify(pkg, true, 2));
   });
}
