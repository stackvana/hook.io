module['exports'] = function formatError (type, err) {
  if (typeof err === "undefined") {
    err = type;
  }
  var message = 'An error occurred with user-submitted code<br/>';
  var stack = err.stack.split('\n');
  message += '&nbsp;&nbsp;&nbsp;&nbsp;' + stack[1] + '<br/><br/>';
  message += 'Error: ' + err.message;
  console.log(stack)
  err.message = message;
  return err;
};