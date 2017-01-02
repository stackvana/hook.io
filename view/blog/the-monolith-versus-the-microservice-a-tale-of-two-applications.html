<div class="container content">
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

<div class="container content"></div>

<h1 id="the-monolith-versus-the-microservice">The Monolith versus The Microservice</h1>
<h3 id="-a-tale-of-two-applications-"><em>A Tale of Two Applications</em></h3>
<p><strong>Date:</strong> <em>Wed Jul 29 2015 15:38:30 GMT-0700 (PDT)</em> <br>
<strong>Author:</strong> <a href="http://twitter.com/marak">Marak</a>
<br></p>
<p><em>The source code used in this post can be found <a href="https://github.com/marak/the-monolith-versus-the-microservice">here on Github</a></em></p>
<h2 id="preface">Preface</h2>
<p>The current standard approach to building backend HTTP services is monolithic. An HTTP server process is responsible for any amount of "routes". A route represents a unique url pattern that is associated with a unique piece of functionality ( the route handler ).</p>
<p>The problem with this monolithic approach is that since every route is sharing the same process and server state, potential issues in one route can affect the state of the entire application or server. This is bad. </p>
<p>The <strong>Monolith</strong> approach to application design leads to having to worry about the global state of the entire application any time a single route is modified.</p>
<p>The <strong>Microservice</strong> approach to application design offers a clear path to improving the stability and scalability of an application by isolating it's services into distinct composable units.</p>
<h2 id="a-new-company-builds-a-web-application">A New Company Builds A Web Application</h2>
<p>A brand new technology company emerges. They must build a new web application to power their business.</p>
<p><strong>The application must contain the following sections:</strong></p>
<pre>/       - Index / Company Homepage
/about  - Information About the Company
/signup - Sign Up for Company Product
</pre>

<p>The new company quickly gets to work, but unfortunately for our new company, their development team is not so great. During development they introduce a few bugs into the application.</p>
<h3 id="server">Server</h3>
<p>First they build the <code>server</code> component. This actually looks pretty good for now. Good job team!</p>
<pre><code class="lang-js"><span class="hljs-keyword">var</span> express = <span class="hljs-built_in">require</span>(<span class="hljs-string">'express'</span>);
<span class="hljs-keyword">var</span> app = express();

app.get(<span class="hljs-string">'/'</span>, <span class="hljs-built_in">require</span>(<span class="hljs-string">'../routes/index'</span>));
app.get(<span class="hljs-string">'/about'</span>, <span class="hljs-built_in">require</span>(<span class="hljs-string">'../routes/about'</span>));
app.get(<span class="hljs-string">'/signup'</span>, <span class="hljs-built_in">require</span>(<span class="hljs-string">'../routes/signup'</span>));

app.listen(<span class="hljs-number">9999</span>);
</code></pre>
<h3 id="index-page">Index Page</h3>
<p>Next, they move on to building the <code>index</code> section. This page looks good. No mistakes yet!</p>
<pre><code class="lang-js"><span class="xml">module['exports'] = function index (req, res) {
  res.write('<span class="hljs-tag">&lt;<span class="hljs-title">h1</span>&gt;</span>Welcome to our awesome website!<span class="hljs-tag">&lt;<span class="hljs-title">br</span>/&gt;</span>');
  res.write('<span class="hljs-tag">&lt;<span class="hljs-title">a</span> <span class="hljs-attribute">href</span>=<span class="hljs-value">"</span></span></span><span class="hljs-expression">{{<span class="hljs-variable">appUrl</span>}}</span><span class="xml"><span class="hljs-tag"><span class="hljs-value">/about"</span>&gt;</span>About<span class="hljs-tag">&lt;/<span class="hljs-title">a</span>&gt;</span><span class="hljs-tag">&lt;<span class="hljs-title">br</span>/&gt;</span>');
  res.write('<span class="hljs-tag">&lt;<span class="hljs-title">a</span> <span class="hljs-attribute">href</span>=<span class="hljs-value">"</span></span></span><span class="hljs-expression">{{<span class="hljs-variable">appUrl</span>}}</span><span class="xml"><span class="hljs-tag"><span class="hljs-value">/signup"</span>&gt;</span>Signup<span class="hljs-tag">&lt;/<span class="hljs-title">a</span>&gt;</span><span class="hljs-tag">&lt;<span class="hljs-title">br</span>/&gt;</span>');
  res.end();
};</span>
</code></pre>
<h3 id="about-page">About Page</h3>
<p>Moving on to the <code>about</code> section, the development team makes a minor mistake.</p>
<pre><code class="lang-js"><span class="hljs-keyword">var</span> someHTML = <span class="hljs-string">''</span>;
<span class="hljs-built_in">module</span>[<span class="hljs-string">'exports'</span>] = <span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">about</span> (<span class="hljs-params">req, res</span>) </span>{
  <span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">buildHTML</span>(<span class="hljs-params"></span>) </span>{
    someHTML += <span class="hljs-string">'&lt;h1&gt;This is our awesome about page! Please buy our stuff!&lt;/h1&gt;'</span>;
    <span class="hljs-keyword">return</span> someHTML;
  }
  res.end(buildHTML());
};
</code></pre>
<p>This is a contrived example, but the error should be clear. </p>
<p>The developer has declared the  <code>someHTML</code> variable in the wrong place and has broken encapsulation. The <code>someHTML</code> variable will continue to append to itself until the server runs out of memory. </p>
<p><em>Introducing additional state outside the scope of the route handler breaks functional encapsulation and can cause bad things can happen.</em></p>
<p>Let's not worry about this error for now. We'll get to see it in action later.</p>
<h3 id="signup-page">Signup Page</h3>
<p>Finally, after several weeks of arduous development the team finishes the last section, <code>signup</code>.</p>
<pre><code class="lang-js"><span class="hljs-built_in">module</span>[<span class="hljs-string">'exports'</span>] = <span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">signup</span> (<span class="hljs-params">req, res</span>) </span>{
  <span class="hljs-keyword">while</span>(<span class="hljs-literal">true</span>);
};
</code></pre>
<p>Looks like the development team really blew it on the signup page!</p>
<p><em>At least the office feels a bit warmer today.</em></p>
<p>The signup page is another contrived example, but it simulates what can happen with bad code. This route handler both fails to call <code>res.end</code> and puts the process into an infinite loop. Running this page will cause the server to hit 100% CPU ( and get quite hot ).</p>
<h3 id="deployment">Deployment</h3>
<p>Since the new company didn't have a budget for testing or quality assurance, the site was deployed that week on Friday afternoon. </p>
<p>Unfortunately for the new company, their site went down almost immediately. </p>
<p>Debugging the issues was complicated, partly because the server kept locking up due to lack of available RAM and CPU. </p>
<p>Ultimately, a key potential customer was unable to access any sections of the site on launch and choose to signup with a competitor. The company failed.</p>
<h2 id="the-same-application-built-with-microservices">The Same Application built with Microservices</h2>
<p>Now, the same development story with the same development team. The only difference this time is that instead of building their application as a monolithic service, the company choose to use microservices.</p>
<h3 id="server">Server</h3>
<p>First, they built the front-facing HTTP server. This acts a load balancer, sending incoming requests to the worker cloud with a round-robin strategy. </p>
<p>The team chooses to use the <a href="https://npmjs.org/package/run-remote-service">run-remote-service</a> npm module, which is a thin component responsible for proxying HTTP requests. They could have just as easily used the <a href="https://npmjs.org/package/request">request</a> module instead.</p>
<pre><code class="lang-js"><span class="hljs-keyword">var</span> express = require(<span class="hljs-string">'express'</span>);
<span class="hljs-keyword">var</span> runRemoteService = require(<span class="hljs-string">'run-remote-service'</span>)({ 
  pool: [<span class="hljs-string">"10000"</span>, <span class="hljs-string">"10001"</span>, <span class="hljs-string">"10002"</span>, <span class="hljs-string">"10003"</span>, <span class="hljs-string">"10004"</span>] 
});

<span class="hljs-keyword">var</span> server = {};

server.listen = <span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-params">()</span> </span>{
  <span class="hljs-keyword">var</span> app = express();
  app.<span class="hljs-keyword">get</span>(<span class="hljs-string">'/'</span>, runRemoteService);
  app.<span class="hljs-keyword">get</span>(<span class="hljs-string">'/about'</span>, runRemoteService);
  app.<span class="hljs-keyword">get</span>(<span class="hljs-string">'/signup'</span>, runRemoteService);
  app.listen(<span class="hljs-number">9999</span>);
};

module[<span class="hljs-string">'exports'</span>] = server;
</code></pre>
<p><em>You may notice the worker pool is hard-coded in this example. With a bit of imagination you can imagine an elastic worker pool where workers can register themselves with the load balancer at run-time.</em></p>
<h3 id="worker">Worker</h3>
<p>Second, they built the <code>worker</code> component, which is used to execute services. Workers receive incoming HTTP requests from the server and execute service source code in response to these requests.</p>
<p>The team chooses to use the <a href="https://npmjs.org/package/run-service">run-service</a> npm module which acts a thin layer of abstraction for executing untrusted source code in response to incoming HTTP requests. </p>
<p>The <code>run-service</code> module provides a level of control over service execution to ensure that any issues within the service remain isolated and always trapped and returned to the <code>server</code> in a meaningful way.</p>
<pre><code class="lang-js"><span class="hljs-keyword">var</span> argv = <span class="hljs-built_in">require</span>(<span class="hljs-string">'minimist'</span>)(process.argv.slice(<span class="hljs-number">2</span>));
<span class="hljs-keyword">var</span> port = argv.p || <span class="hljs-number">10000</span>;
<span class="hljs-keyword">var</span> runService = <span class="hljs-built_in">require</span>(<span class="hljs-string">'run-service'</span>);
<span class="hljs-keyword">var</span> express = <span class="hljs-built_in">require</span>(<span class="hljs-string">'express'</span>);
<span class="hljs-keyword">var</span> worker = {};
worker.start = <span class="hljs-function"><span class="hljs-keyword">function</span> (<span class="hljs-params">opts, cb</span>) </span>{
  <span class="hljs-keyword">var</span> app = express();
  app.post(<span class="hljs-string">'/'</span>, runService);
  app.post(<span class="hljs-string">'/about'</span>, runService);
  app.post(<span class="hljs-string">'/signup'</span>, runService);
  app.listen(port);
};
<span class="hljs-built_in">module</span>[<span class="hljs-string">'exports'</span>] = worker;
</code></pre>
<h3 id="building-out-the-pages">Building out the pages</h3>
<p>After completing the <code>server</code> and <code>worker</code>, the development team builds the same routes for <code>index</code>, <code>about</code>, and <code>signup</code> in the exact same way as before. </p>
<p><strong>The second application still contains the exact same bugs that brought down the first application.</strong></p>
<h3 id="deployment">Deployment</h3>
<p>There is still no budget for testing or quality assurance, so the team again deploys the application on Friday afternoon.</p>
<p><strong>Surprisingly, the site almost works! Great job team!</strong></p>
<p>The <code>index</code> and <code>about</code> sections are working flawlessly. The out of scope <code>someHTML</code> variable in <code>about</code> causes no issues in this version of the application as every service is now stateless.</p>
<p>The <code>signup</code> page is displaying a timeout error. The error stated that the total amount of execution time for the service had exceeded. It suggested checking for infinite loops or that <code>res.end()</code> had not been called. The team was able to quickly identify the issue and had the site working within a few hours.</p>
<p>The team was also able to fix the <code>signup</code> page without ever having to take down the application, or the <code>index</code> and <code>about</code> sections. Since all routes are isolated, they were able to modify <code>signup.js</code> without taking down the front-facing server or any other pages.</p>
<p>On launch, the same key customer was able to access the site and retrieve information about the product. The customer was unable to signup for the service, but came back the next day and was able to sign up. This key customer was crucial to the early success of the business and the new company was able to succeed.</p>
<h2 id="conclusion">Conclusion</h2>
<p>The tale of these two applications is not about the contrived examples of forgetting to call <code>res.end</code>, or accidentally putting the <code>someHTML</code> variable in the wrong place.</p>
<p><strong>The tale of these two applications is about application design choice.</strong></p>
<p>Instead of a programming error, the server could have just as easily ran out of resources. In high-traffic situations, you may find the need to isolate specific routes onto separate servers.</p>
<p><strong>Do you really want to have your entire application bound to a single monolith where a minor issue in a single route can take down the entire application?</strong></p>
<p><strong>The Monolith is limited and brittle. The Microservice is scalable and robust.</strong></p>
<p>Moving forward, I highly suggest you begin to migrate towards integrating microservices into your stack.</p>
<p>Looking for an easy way to get your microservices hosted online? Check out <a href="https://hook.io">https://hook.io</a>.</p>
<p><br></p>
</div>