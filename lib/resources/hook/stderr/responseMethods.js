var methods = {};
module['exports'] = methods;

/*
  TODO: Implement the following methods
  see: https://github.com/bigcompany/hook.io/issues/96
  
    ✓ hook.res.writeHead
    ✓ hook.res.write
    ✓ hook.res.end
    ✓ hook.res.writeContinue
    ✓ hook.res.setTimeout ( missing callback argument )
    ✓ hook.res.statusCode (getter and setter)
    ✓ hook.res.statusMessage
    ✓ hook.res.setHeader
    ✓ hook.res.sendDate
    ✓ hook.res.removeHeader
    ✓ hook.res.addTrailers

    TODO:

      hook.res.headersSent
      hook.res.getHeader

*/

/*
 Remark: All methods carry the following signature:

  function (message, res)

  message: hash containing the hook.res.foo method payload
  res: the http response object

*/

methods.addTrailers = function (message, res) {
  res.addTrailers(message.payload.headers);
};

methods.removeHeader = function (message, res) {
  res.removeHeader(message.payload.name);
};

methods.setHeader = function (message, res) {
  res.setHeader(message.payload.name, message.payload.value);
};

methods.setTimeout = function (message, res) {
  // TODO: add optional callback argument?
  res.setTimeout(message.payload.msecs);
};

methods.sendDate = function (message, res) {
  res.sendDate = message.payload.value;
};

methods.statusMessage = function (message, res) {
  res.statusMessage = message.payload.value;
};

methods.statusCode = function (message, res) {
  res.statusCode = message.payload.value;
};

methods.writeContinue = function (message, res) {
  res.writeContinue();
};

methods.writeHead = function (message, res) {
  res.writeHead(message.payload.code, message.payload.headers);
};