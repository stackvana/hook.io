
<script type="text/javascript" class="data">
  var data = {
    title: "The Monolith versus The Microservice, A Tale of Two Applications",
    description: "",
    url: "https://hook.io/blog/the-monolith-versus-the-microservice-a-tale-of-two-applications",
    guid: "the-monolith-versus-the-microservice-a-tale-of-two-applications",
    author: "Marak",
    date: "Wed Jul 29 2015 15:38:30 GMT-0700 (PDT)"
  };
</script>


# The Monolith versus The Microservice

### *A Tale of Two Applications*

**Date:** *Wed Jul 29 2015 15:38:30 GMT-0700 (PDT)* <br/>
**Author:** [Marak](http://twitter.com/marak)
<br/>

*The source code used in this post can be found [here on Github](https://github.com/marak/the-monolith-versus-the-microservice)*

## Preface

The current standard approach to building backend HTTP services is monolithic. An HTTP server process is responsible for any amount of "routes". A route represents a unique url pattern that is associated with a unique piece of functionality ( the route handler ).

The problem with this monolithic approach is that since every route is sharing the same process and server state, potential issues in one route can affect the state of the entire application or server. This is bad. 

The **Monolith** approach to application design leads to having to worry about the global state of the entire application any time a single route is modified.

The **Microservice** approach to application design offers a clear path to improving the stability and scalability of an application by isolating it's services into distinct composable units.

## A New Company Builds A Web Application

A brand new technology company emerges. They must build a new web application to power their business.

**The application must contain the following sections:**

<pre>/       - Index / Company Homepage
/about  - Information About the Company
/signup - Sign Up for Company Product
</pre>

The new company quickly gets to work, but unfortunately for our new company, their development team is not so great. During development they introduce a few bugs into the application.

### Server

First they build the <code>server</code> component. This actually looks pretty good for now. Good job team!

```js
var express = require('express');
var app = express();

app.get('/', require('../routes/index'));
app.get('/about', require('../routes/about'));
app.get('/signup', require('../routes/signup'));

app.listen(9999);
```

### Index Page

Next, they move on to building the `index` section. This page looks good. No mistakes yet!

```js
module['exports'] = function index (req, res) {
  res.write('<h1>Welcome to our awesome website!<br/>');
  res.write('<a href="/about">About</a><br/>');
  res.write('<a href="/signup">Signup</a><br/>');
  res.end();
};
```

### About Page

Moving on to the `about` section, the development team makes a minor mistake.

```js
var someHTML = '';
module['exports'] = function about (req, res) {
  function buildHTML() {
    someHTML += '<h1>This is our awesome about page! Please buy our stuff!</h1>';
    return someHTML;
  }
  res.end(buildHTML());
};
```

This is a contrived example, but the error should be clear. 

The developer has declared the  <code>someHTML</code> variable in the wrong place and has broken encapsulation. The <code>someHTML</code> variable will continue to append to itself until the server runs out of memory. 

*Introducing additional state outside the scope of the route handler breaks functional encapsulation and can cause bad things can happen.*

Let's not worry about this error for now. We'll get to see it in action later.

### Signup Page


Finally, after several weeks of arduous development the team finishes the last section, `signup`.

```js
module['exports'] = function signup (req, res) {
  while(true);
};
```

Looks like the development team really blew it on the signup page!

*At least the office feels a bit warmer today.*

The signup page is another contrived example, but it simulates what can happen with bad code. This route handler both fails to call <code>res.end</code> and puts the process into an infinite loop. Running this page will cause the server to hit 100% CPU ( and get quite hot ).
 
### Deployment

Since the new company didn't have a budget for testing or quality assurance, the site was deployed that week on Friday afternoon. 

Unfortunately for the new company, their site went down almost immediately. 

Debugging the issues was complicated, partly because the server kept locking up due to lack of available RAM and CPU. 

Ultimately, a key potential customer was unable to access any sections of the site on launch and choose to signup with a competitor. The company failed.
 
## The Same Application built with Microservices

Now, the same development story with the same development team. The only difference this time is that instead of building their application as a monolithic service, the company choose to use microservices.

### Server

First, they built the front-facing HTTP server. This acts a load balancer, sending incoming requests to the worker cloud with a round-robin strategy. 

The team chooses to use the <a href="https://npmjs.org/package/run-remote-service">run-remote-service</a> npm module, which is a thin component responsible for proxying HTTP requests. They could have just as easily used the <a href="https://npmjs.org/package/request">request</a> module instead.

```js
var express = require('express');
var runRemoteService = require('run-remote-service')({ 
  pool: ["10000", "10001", "10002", "10003", "10004"] 
});

var server = {};

server.listen = function () {
  var app = express();
  app.get('/', runRemoteService);
  app.get('/about', runRemoteService);
  app.get('/signup', runRemoteService);
  app.listen(9999);
};

module['exports'] = server;
```

*You may notice the worker pool is hard-coded in this example. With a bit of imagination you can imagine an elastic worker pool where workers can register themselves with the load balancer at run-time.*

### Worker


Second, they built the `worker` component, which is used to execute services. Workers receive incoming HTTP requests from the server and execute service source code in response to these requests.

The team chooses to use the <a href="https://npmjs.org/package/run-service">run-service</a> npm module which acts a thin layer of abstraction for executing untrusted source code in response to incoming HTTP requests. 

The `run-service` module provides a level of control over service execution to ensure that any issues within the service remain isolated and always trapped and returned to the `server` in a meaningful way.

```js
var argv = require('minimist')(process.argv.slice(2));
var port = argv.p || 10000;
var runService = require('run-service');
var express = require('express');
var worker = {};
worker.start = function (opts, cb) {
  var app = express();
  app.post('/', runService);
  app.post('/about', runService);
  app.post('/signup', runService);
  app.listen(port);
};
module['exports'] = worker;
```

### Building out the pages

After completing the `server` and `worker`, the development team builds the same routes for `index`, `about`, and `signup` in the exact same way as before. 

**The second application still contains the exact same bugs that brought down the first application.**

### Deployment

There is still no budget for testing or quality assurance, so the team again deploys the application on Friday afternoon.

**Surprisingly, the site almost works! Great job team!**

The `index` and `about` sections are working flawlessly. The out of scope <code>someHTML</code> variable in `about` causes no issues in this version of the application as every service is now stateless.

The `signup` page is displaying a timeout error. The error stated that the total amount of execution time for the service had exceeded. It suggested checking for infinite loops or that `res.end()` had not been called. The team was able to quickly identify the issue and had the site working within a few hours.

The team was also able to fix the `signup` page without ever having to take down the application, or the `index` and `about` sections. Since all routes are isolated, they were able to modify `signup.js` without taking down the front-facing server or any other pages.

On launch, the same key customer was able to access the site and retrieve information about the product. The customer was unable to signup for the service, but came back the next day and was able to sign up. This key customer was crucial to the early success of the business and the new company was able to succeed.

## Conclusion

The tale of these two applications is not about the contrived examples of forgetting to call `res.end`, or accidentally putting the `someHTML` variable in the wrong place.

**The tale of these two applications is about application design choice.**

Instead of a programming error, the server could have just as easily ran out of resources. In high-traffic situations, you may find the need to isolate specific routes onto separate servers.

**Do you really want to have your entire application bound to a single monolith where a minor issue in a single route can take down the entire application?**

**The Monolith is limited and brittle. The Microservice is scalable and robust.**

Moving forward, I highly suggest you begin to migrate towards integrating microservices into your stack.

Looking for an easy way to get your microservices hosted online? Check out [https://hook.io](https://hook.io).

<br/>