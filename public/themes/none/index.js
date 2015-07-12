module['exports'] = function view (opts, cb) {
  opts.response.writeHead(200, {
    "Content-Type": "text/html"
  });
  cb(null, opts.output);
};