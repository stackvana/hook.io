var methods = {};
module['exports'] = methods;

/*
  TODO: Implement the following methods
  see: https://github.com/bigcompany/hook.io/issues/96
  
    hook.res.writeContinue
    hook.res.writeHead
    hook.res.setTimeout
    hook.res.statusCode (getter and setter)
    hook.res.statusMessage
    hook.res.setHeader
    hook.res.headersSent
    hook.res.sendDate
    hook.res.getHeader
    hook.res.removeHeader
    hook.res.addTrailers

*/

//
// Remark: All methods carry the following signature
// function (res, message)
// res: the http response object
// message: hash containing the hook.res.foo method payload

// if the incoming message is a writeHead event, replay that event
methods.writeHead = function (res, message) {
  res.writeHead(message.payload.code, message.payload.headers);
};