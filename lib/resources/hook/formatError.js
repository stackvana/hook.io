module['exports'] = function formatError (err, opts) {

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
  if (typeof opts !== "undefined" && typeof opts.tag !== "undefined") {
    message += 'Error: ' + opts.tag;
  } else {
    message += 'Error: '  + err.message;
  }
  err.message = message;
  err.message += '\n\n' + err.stack;
  return err;
};