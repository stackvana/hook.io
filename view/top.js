var forms = require('mschema-forms');
var config = require('../config');
var metric = require('../lib/resources/metric');
var dateFormat = require('dateformat');
var util = require('util');
var generate = util.promisify(forms.generate);
var recent = util.promisify(metric.recent);
var top = util.promisify(metric.top);

// takes in array of data and formats it into smaller object to render in grid
function formatResults (data) {
  var sorted = [];
  while (data.length > 0) {
    var user = data.shift();
    var hits = data.shift();
    sorted.push({ user: user, hits: hits, reset: user });
  }
  return sorted;
}

// TODO: add top running services / top hits report using sets and http://redis.io/commands/zrevrangebyscore methods
module['exports'] = async function topPresenter (opts, callback) {

  var req = opts.req, res = opts.res, $ = this.$;
  var appName = req.hostname;
  if (req.session.user !== "marak") {
    return res.end('unauthorized');
  }

  // get all metrics data for rendering view
  let recentMembers = await recent('recent');
  let recentErrors = await recent('recent:500');
  let mostAccountHits = await top('hits');
  let runningServices = await top('running');

  var formSchema = {};
  formSchema.user = {
    "type": "string",
    "default": "bob"
  };

  formSchema.hits = {
    "type": "string",
    "default": "42"
  };

  formSchema.user.formatter = function (val) {
    return '<a href="' + config.app.url + '/' + val + '">' + val + '</a>';
  }

  formSchema.hits.formatter = function (val) {
    return dateFormat(new Date(Number(val)), 'hh:MM:ss dddd, mmmm dS, yyyy');
  }

  recentMembers = formatResults(recentMembers);
  recentErrors = formatResults(recentErrors);
  runningServices = formatResults(runningServices);
  mostAccountHits = formatResults(mostAccountHits);

  let recentlyRunHtml = await generate({
    type: "grid",
    name: 'hits-forms',
    form: {
      legend: 'Recently Run',
      submit: "Submit",
      action: ""
    },
    data: recentMembers,
    schema: formSchema
  });

  let recentErrorsHtml = await generate({
    type: "grid",
    name: 'recent-error-forms',
    form: {
      legend: 'Recent Errors',
      submit: "Submit",
      action: ""
    },
    data: recentErrors,
    schema: formSchema
  });

  formSchema.hits.formatter = function (val) {
    return val;
  }

  let mostAccountHitsHtml = await generate({
    type: "grid",
    form: {
      legend: 'Most Account Hits',
      submit: "Submit",
      action: ""
    },
    data: mostAccountHits,
    schema: formSchema
  });


  formSchema.reset = {
    "type": "string"
  };

  formSchema.reset.formatter = function (val, obj) {
    return '<a href="_admin?method=user.resetRunningServicesCount&owner=' +  val + '">reset link</a>';
  }

  let runningServicesHtml = await generate({
    type: "grid",
    form: {
      legend: 'Currently Running',
      submit: "Submit",
      action: ""
    },
    data: runningServices,
    schema: formSchema
  });

  $('.running').html(runningServicesHtml);
  $('.hits').html(mostAccountHitsHtml);
  $('.recentErrors').html(recentErrorsHtml);
  $('.recent').html(recentlyRunHtml);

  callback(null, $.html());

};