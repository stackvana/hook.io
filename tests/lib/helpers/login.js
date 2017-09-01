var parseJSON = require('./parseJSON');
var request = require('request');


var request = require('supertest');


module['exports'] = function login (opts, cb) {
  var r = request(app)
    .get('/user')
    .expect('Content-Type', /json/)
    .expect('Content-Length', '20')
    .expect(200)
    .end(function(err, res){
      if (err) throw err;
    });
  
};