// assume git pull was already performed

var cache = require('../lib/resources/cache');
var async = require('async');

function getNodes (poolName, cb) {
  cache.smembers(poolName, function (err, webs) {
    if (err) {
      throw err;
      process.exit();
    }
    cb(err, webs);
  });
}

function roundHalf (num) {
 // rounds up by default
 // i.e. 5 becomes 3, not 2
 return Math.round(num / 2);
}

//var poolName = 'pools.worker';

//rollingUpdate('pools.worker');
rollingUpdate('pools.web');

function rollingUpdate (poolName) {

  var halfDone = false;

  getNodes(poolName, function (err, nodes) {

    removeHalfPool('first');

    function removeHalfPool (pos) {
      pos = pos || 'first';
      console.log('performing rolling update');

      // split the nodes into two halves
      var half = roundHalf(nodes.length);
      console.log('half', half, nodes.length)

      var _nodes;
      if (pos === "first") {
        _nodes = nodes.slice(0, half);
      } else {
        _nodes = nodes.slice(half);
      }

      // remove nodes from the pool
      // update the pool with smaller node list
      console.log('nodes', nodes.length, nodes);
      async.forEach(_nodes, function(node, next){
        cache.srem(poolName, node, next);
      }, function complete (err, results) {
        console.log('complete')
        console.log(err, results)
        // wait 60 seconds for all requests to complete...maybe needs more
        setTimeout(function(){
          killOldPids(_nodes)
        }, 60000)

      })
    }
    function killOldPids (nodes) {
      // kill the pid of the removed nodes ( pids should already be reported? or query? )
      nodes.forEach(function(node){
        console.log('killing', node, halfDone);
        process.kill(node.pid);
        // TODO: wait a few moments and perform basic health check of new servers
        // TODO: repeat same process for other half of nodes
      });

      setTimeout(function(){
        if (halfDone) {
          console.log('completed update!');
          process.exit();
        }
        halfDone = true;
        removeHalfPool('last');
      }, 20000);
    }

  });
  
};




