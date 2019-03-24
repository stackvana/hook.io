<img src="https://hook.io/img/logo.png"></img>
## Open-Source Microservice Hosting Platform 

### Build and deploy HTTP microservices in seconds

#### Supported Service Programming Languages

  - c ( with `gcc` )
  - java
  - javascript ( first-class support )
  - coffee-script
  - common
  - bash
  - lua
  - golang
  - ocaml
  - perl
  - php
  - python
  - python3
  - ruby
  - rust
  - r
  - scheme
  - smalltalk
  - tcl

To start using hook.io visit the website at [https://hook.io](https://hook.io). Here you will find many examples and documentation on how to use hook.io

Architectural details can be found a bit further down.

## Interested, but too busy to read this now?

If you'd like, you can run the following Curl command to opt-in to our mailing list. We'll periodically send you updates about the project.

`curl hook.io?signup=youremail@marak.com`

Replace youremail@marak.com with your email address.


## Installing Local Hook.io Server

Before setting up a local hook.io server, you should try the free hosted version at [https://hook.io](https://hook.io)

If you don't need a full hosting platform and only want to host microservices, we recommend using the [Microcule](https://github.com/stackvana/microcule) project.

Everything needed to setup a full locally running hook.io server is available is this repo. We have a Docker image available, but it's not being used in production and needs to be improved.


## What is the purpose of hook.io?

hook.io is an open-source hosting platform for webhooks and microservices. The microservice architectural style is an approach to developing a single application as a suite of small services, each running in its own process and communicating with lightweight mechanisms. hook.io provides an easy way to create, host, and share microservices. Through developing many small re-usable microservices, you can reduce the complexity of your applications while improving stability.

## Why or how would I want to use hook.io?

You should want to use hook.io if it can make your life as a developer easier.

The most *basic use-case* for hook.io is quick and free webhook hosting. You can instantly create a [simple hook](https://hook.io/examples/echo) which parses the incoming parameters of an HTTP request and performs arbitrary actions on it. For instance: Send an SMS message every-time the Hook is requested as a webpage. Since NPM is supported, you can re-use any existing library from the extensive [NPM module repository](http://npmjs.org). You can also configure Hooks to be executed on a schedule using a [Cron pattern](https://hook.io/cron).

At this point, we will take note that Hooks are [fully streaming](https://github.com/substack/stream-handbook). Inside your Hook source code you have direct access to Node's [http.IncomingMessage](http://nodejs.org/api/http.html#http_http_incomingmessage) and [httpServer.ServerResponse](http://nodejs.org/api/http.html#http_class_http_serverresponse) request and response streams. This means you can treat the inside of a Hook the exact same way as if it were inside a streaming middleware in a regular node http server. Having direct access to these streams is extremely useful and I am unsure if any other microservice hosting providers currently offer this feature.

More *advanced use-cases* for hook.io would be replacing individual parts of your application with microservices. Instead of adding a new route or module to your application , you could instead create a Hook responsible for only one unit of functionality and call it using a regular HTTP request from inside your existing application. One specific example could be building a Hook with a [custom theme](https://hook.io/themes) which acts perfectly as a stand-alone sign-up form. This sign-up form can then be loaded server-side in your application using one HTTP get request. It might sound complicated at first, but integrating microservices with your existing application is actually very easy. In the upcoming weeks we'll work on releasing specific guides for separating application functionalities into microservices.

An *even more advanced usage* would be building a suite of Hooks and composing them to create new and unique applications! Since every Hook understands Standard In and Standard Out and Hooks can [easily call other Hooks](https://hook.io/examples/javascript-stream-merge) from inside each other, there are an endless amount of combinations to be made. This composability enables the foundation for [Flow-based Programming](http://en.wikipedia.org/wiki/Flow-based_programming) without imposing any specific rules for composition. A specific example could be building a Hook ( called "tar" ) responsible for taking in STDIN and streaming out a compressed tar file. Once this Hook is created, you could easily pipe the results of another Hook ( such as an image downloader ) into the "tar" Hook. These Hooks don't exist yet, but I am certain someone will build them in the near future.

## Unix Pipes!

hook.io is very friendly with Unix Pipes. Using STDOUT and STDIN you can connect hook.io to your existing Unix Tool chain. The best way to explain this concept is to review the [Curl examples](https://hook.io/curl).

## The Data!

If you noticed in the last example, hook.io is fully capable of streaming binary data. It also supports streaming file uploads, multipart form uploads, and will assist in parsing all incoming form fields, JSON, and query string data.

## Software Architecture

The core software architecture of hook.io is Resource-View-Presenter ( RVP ).

Resources are created using the npm [resource](http://npmjs.org/package/resource) module.

View-Presenters are created using the npm [view](http://npmjs.org/package/view) module with regular HTML, CSS, and JavaScript. The same View-Presenter pattern is also used to implement custom theming for Hooks see: [hook.io/themes](https://hook.io/themes)


## Server Architecture

There is one front-facing HTTP server and any number of Hook Workers.

The front-facing server is responsible for serving static content, maintaining user session data, and piping requests between the client and Worker.

Workers are responsible for executing user-submitted source code and piping their responses through the front-facing server to the client.

At this point, we will take note that communication between the Hook and client remains streaming throughout the entire architecture. This gives hook.io the ability to perform complex tasks like transcoding large video streams without worrying about clogging up any parts of the system with large memory buffers.

Hook Servers and Hook Workers are immutable and stateless to ensure stability of the platform. They are designed to fail fast and restart fast. [mon](http://github.com/tj/mon) is used as a process supervisor.

This architecture can theoretically scale to upwards of 10,000 concurrent connections. Realistically, it will probably be closer to 4,000. When the site needs to scale past this, we will create several front-facing servers and load balance incoming HTTP requests to them using DNS. 

Hook and User configuration data are stored in a CouchDB database. If the database grows too large, we will split it into several smaller database severs sharded by the first alphabetic letter of every document's primary key.

Source code for Hooks is currently stored on Github as Github Gists. I'd imagine sometime in the future we will add the option to store and edit source code directly on hook.io itself. The project is open-source, so you could be the first to [open up the issue](http://github.com/bigcompany/hook.io/issues/new?title=Add%20ability%20to%20store%20Hook%20Source%20code%20directly%20on%20site%20and%20without%20Github%20Gist)!

## Creating new Hooks

It's very simple. Go to [https://hook.io/new](https://hook.io/new)

## Support

If you run into an issue, have a question, or have feedback with using hook.io you can open up a Github Issue by [clicking here](http://github.com/bigcompany/hook.io/issues/new)

## Adding new NPM Modules to hook.io

NPM modules will automatically install if you attempt to require them in a Hook. The first time the Hook is run, hook.io will install the dependency. Re-run the hook a few moments later and it should just work.

If your module requires additional dependencies outside of what NPM can install, you can create a custom build script in [this folder](https://github.com/bigcompany/hook.io/tree/master/modules/builds). The hosting environment for hook.io is Ubuntu 14.04.1 LTS (Trusty Tahr) Bash scripts are recommended.

## Testing your Hook

If you only need to test your Hook code, you can run `./bin/test-hook` without having to setup the full hook.io stack.

## Workers

Hooks are executed on *stateless* isolated workers to help facilitate scaling and to ensure stability in the core application. These workers are responsible for running user-submitted Hook source code and piping their responses back to the main server. If running untrusted user-submitted code, you will need to isolate these workers.

see: `./bin/worker` and `./bin/test-worker`

## i18n Internationalization

[https://github.com/bigcompany/hook.io-i18n](https://github.com/bigcompany/hook.io-i18n)


## Tests

```bash
npm test
```

## Contributing

Contributions are welcomed and much appreciated. Simply open up a Github Pull Request to start the discussion.

All contributors must sign our <a href="https://www.clahub.com/agreements/bigcompany/hook.io">Contributor License Agreement</a>. 

This is a simple document to help protect both the hook.io project and your rights as a contributor.

## Licensing

hook.io is licensed under the Affero General Public License (AGPL) open-source software license. 

This license favors the developer ( **you** ) and ensures that all corporate contributions are made available to the public.

If this license is not suitable for your use-case please email <a href="mailto:support@marak.com">support@marak.com</a>. Individual licenses are available upon request.
