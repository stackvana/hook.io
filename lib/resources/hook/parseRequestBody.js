var mergeParams = require('../../../view/mergeParams');

module['exports'] = function parseRequestBody (req, res, next) {
  var hook = require('./');
  if (req.method === "GET") {
    return mergeParams(req, res, function(){
      return next(req, res);
    });
  } else if (req.method === "POST") {
  
    // only attempt to parse body if its multipart form or urlencoded form, if not
    // do not parse as we don't want to interrupt req
    var contentTypes = [];
    if (req.headers && req.headers['content-type']) {
      contentTypes = req.headers['content-type'].split(';');
    }
    //
    // If a content-type of multipart/form-data or application/x-www-form-urlencoded is detected,
    // use busboy to parse the incoming form.
    //
    // For multipart file uploads:
    //   Each file is added to the request.resource.params as a pipe,
    //   this file upload pipe can later be processed by the hook
    //

    if (contentTypes.indexOf("multipart/form-data") !== -1 ||
        contentTypes.indexOf("application/x-www-form-urlencoded") !== -1) {
      var Busboy = require('busboy');
      var inspect = require('util').inspect;

      // create two busboy instances
      // one for parsing multipart form files, another for parsing urlencoded form fields
      var busboyFiles = new Busboy({ headers: req.headers });
      var busboyFields = new Busboy({ headers: req.headers });

      // a multipart file upload was detected, add this upload pipe to the resource params
      busboyFiles.on('file', function(fieldname, file, filename, encoding, mimetype) {
        req.resource.params[fieldname] = file;
      });

      // a urlencoded form field was detected, add it's value to resource params
      busboyFields.on('field', function(fieldname, val, fieldnameTruncated, valTruncated) {
        req.resource.params[fieldname] = val;
      });

      // when all fields have been parsed, merge the resource params and continue
      busboyFields.on('finish', function() {
        mergeParams(req, res, function(){
          next(req, res);
        })
      });

      // when all multipart files have been uploaded, do nothing
      // these upload file pipes should be handled by the user-defined Hook
      busboyFiles.on('finish', function() {
        // do nothing
      });

      // pipe the incoming request to busboy for processing
      req.pipe(busboyFiles);
      req.pipe(busboyFields);

      //return next(req, res);
    

    } else if (contentTypes.indexOf("application/json") !== -1 ) {
      jsonParser(req, res, function(){
        next(req, res);
      });
    } else {
      // Incoming request was a POST, but did not contain content types of multipart or urlencoded form
      // This means we should treat the incoming request is a streaming request
      next(req, res);
    }
  }
}
