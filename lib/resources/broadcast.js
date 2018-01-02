var broadcast = {};

var WebSocket = require('ws');
var broadcastRemote = new WebSocket('ws://0.0.0.0:9998');
broadcastRemote.on('open', function open () {
  console.log('open');
});

broadcastRemote.on('error', function error (err) {
  console.log('error', err);
});

broadcastRemote.on('close', function close (c) {
  console.log('close', c);
});

broadcast.message = function broadcastMessage (msg) {
  // TODO: broadcast message to instance of websocket client
  console.log('sending message to connected clients?', msg);
  broadcastRemote.send(JSON.stringify(msg));
};

broadcast.clients = function () {
  // gets list of connected clients waiting for data, show their stats
};

module.exports = broadcast;