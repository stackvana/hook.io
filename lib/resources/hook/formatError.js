module['exports'] = function formatError (type, err) {
  if (typeof err === "undefined") {
    err = type;
  }
  var message = 'An error occurred \n';
  /*
  if(err.stack) {
    console.log(err.stack)
    var stack = err.stack.split('\n');
    message += '    ' + stack[1] + '\n';
    message += '    ' + stack[2] + '\n\n';
    console.log(stack)
  }
  */
  message += 'Error: ' + err.message;
  //err.message = message;
  err.message += '\n\n' + err.stack;
  return err;
};