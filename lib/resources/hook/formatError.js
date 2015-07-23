module['exports'] = function formatError (type, err) {
  if (typeof err === "undefined") {
    err = type;
  }
  var message = 'An error occurred with user-submitted code \n';
  var stack = err.stack.split('\n');
  message += '    ' + stack[1] + '\n\n';
  message += 'Error: ' + err.message;
  console.log(stack)
  err.message = message;
  return err;
};