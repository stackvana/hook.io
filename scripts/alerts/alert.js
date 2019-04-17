#!/usr/bin/env node
var sendEmailAlert = require('./sendEmailAlert');
var readline = require('readline');

module.exports = function (message) {
  if (process.stdin.isTTY) {
    sendEmailAlert({
      subject: message
    });
    return;
  } else {
    var buffer = '';
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    rl.on('line', function (line) {
      buffer += line.toString() + '<br/>';
    });
    rl.on('close', function (line) {
      sendEmailAlert({
        subject: message,
        html: buffer
      });
    });
  }
}