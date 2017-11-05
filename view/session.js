module.exports = function (opts, cb) {
  var res = opts.res, req = opts.req;
  res.json(req.session);
}