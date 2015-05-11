/*

  This module is responsible for managing custom domains
  Any incoming requests with hosts that don't match hook.io or localhost,
  will be assumed to be a custom domain which requires a database lookup

*/

var domain = require('../../resources/domain');

module['exports'] = function customDomains (req, res, next) {

  // console.log('using domain routing middleware')
  console.log(req.host, req.url.blue)
  if ( req.host !== "hook.io" &&
      req.host !== "www.hook.io" &&
      req.host !== "localhost" &&
      req.host !== "127.0.0.1"
     ) {
   // if the req.host doesn't match the main site, assume its a custom domain
   // perform domain name lookup
   console.log('attempting to find custom domain', req.host)
   domain.find({ name: req.host }, function (err, results) {
     if (err) {
       return res.end(err.stack);
     }
     if (results.length === 0) {
       // domain not found, do nothing
       return res.end('cannot find custom domain ' + req.host + '\n Try adding this as a new domain? http://hook.io/domains');
     } else {
       var result = results[0];
       // TODO: domain found, show the root for that user
       return res.end('found custom domain' + result.name);
     }
   });
  } else {
   next();
  }

};