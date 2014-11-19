module['exports'] = function formatError (type, err) {
  if (typeof err === "undefined") {
    err = type;
  }
  return (err.stack);
};