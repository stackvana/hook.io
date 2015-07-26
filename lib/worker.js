/* worker agent for running hooks */
var http = require('resource-http');
var debug = require('debug')('big::worker');
var hook = require('./resources/hook');
var user = require('./resources/user');
var config = require('../config');

user.persist(config.couch);
hook.persist(config.couch);

var worker = {};
module['exports'] = worker;

worker.start = function (opts, cb) {
  // worker is very simple. everything is streaming http.
  // http-resource will auto-increment the port if 10000 is not available
  // this gives the ability to run this script multiple times to spawn multiple servers
  http.listen({ port: 10000 }, function (err, app){
    app.get('/:owner/:hook', hook.run);
    app.post('/:owner/:hook', hook.run)
    app.get('/:owner/:hook/:subhook', hook.run);
    app.post('/:owner/:hook/:subhook', hook.run)
    return cb(err, app);
  })
};