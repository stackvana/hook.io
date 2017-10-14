var nodes = {};

// amount of time we wait after removing server from pool before killing it
// this is used to ensure we don't kill any servers which are still processing open requests
var COOLDOWN_TIMER = 60000;
nodes.rollingUpdate = function (poolName) {

  // assume git pull was already performed

  var cache = require('./cache');
  var async = require('async');

  function getNodes (poolName, cb) {
    cache.smembers(poolName, function (err, _nodes) {
      if (err) {
        throw err;
        process.exit();
      }
      _nodes.sort(function(a, b){
        return a.port > b.port;
      });
      cb(err, _nodes);
    });
  }

  function roundHalf (num) {
   // rounds up by default
   // i.e. 5 becomes 3, not 2
   return Math.round(num / 2);
  }

  //var poolName = 'pools.worker';

  //rollingUpdate('pools.worker');
  // 'pools.web'
  _rollingUpdate(poolName);

  function _rollingUpdate (poolName) {

    var halfDone = false;

    getNodes(poolName, function (err, nodes) {

      removeHalfPool('first');

      function removeHalfPool (pos) {
        pos = pos || 'first';
        console.log('performing rolling update');

        // split the nodes into two halves
        var half = roundHalf(nodes.length);
        console.log('taking half of pool', nodes.length, 'which is ', half);

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
          console.log('removing', node)
          cache.srem(poolName, node, next);
        }, function complete (err, results) {
          if (err) {
            console.log('WARNING', err)
          }
          console.log('completed partial update. waiting 60 seconds for requests to end');
          // wait 60 seconds for all requests to complete...maybe needs more
          setTimeout(function(){
            killOldPids(_nodes)
          }, COOLDOWN_TIMER)

        })
      }
      function killOldPids (nodes) {
        // kill the pid of the removed nodes ( pids should already be reported? or query? )
        nodes.forEach(function(node){
          console.log('killing', node, halfDone);
          try {
            process.kill(node.pid);
          } catch (err) {
            console.log('WARNING: could not kill pid!', node.pid);
            // TODO: should probably perform roll-back to bring capacity back into pool
            // at this state we have removed active service from pool, but it's still running somewhere
            throw err;
          }
          // TODO: wait a few moments and perform basic health check of new servers
          // TODO: repeat same process for other half of nodes
        });
        console.log('performing 20s wait for pids to die...')
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
  
}

module.exports = nodes;