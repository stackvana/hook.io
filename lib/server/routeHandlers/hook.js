var hook = require('../../resources/hook');
var metric = require('../../resources/metric');
var cache = require('../../resources/cache');
var mergeParams = require('merge-params');
var bodyParser = require('body-parser');
var config = require('../../../config');
var url = require('url');

module['exports'] = function (req, res) {

  mergeParams(req, res, function(){
    if (req.resource.params.fork) {
      return hook.fork(req, res);
    }

    // normalize all incoming URLS to lowercase
    // this is done to ensure that hook.owner and hook.name will always work regardless of case
    // this may still cause some issues with overagressive toLowerCase()
    // if so, we can always pull out the exact strings that require toLowerCase() via req.params.owner and req.params.name
    var urlObj = url.parse(req.url);
    var newUrl = urlObj.pathname.toLowerCase();
    if (urlObj.search !== null) {
      newUrl += urlObj.search;
    }
    req.url = newUrl;
    // run hook on remote worker
    // console.log('calling remote handler', req.url)
    return remoteHandler(req, res, function(){
      // do nothing with the result
      // if the hook has been properly formatted, it should be able to call res.write res.end on it's own
    });
  })
};

var pool = config.workers;

var remoteHandler = hook.runRemote({ pool: pool });