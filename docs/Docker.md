
Running a local development instance of hook.io is simple.

First, you'll need to install [Docker](https://docs.docker.com/engine/installation/).

### Docker???

It's important to note that hook.io is only using Docker to help developers get setup with a local development instance. We are not using Docker in production and do not recommend using our Docker image and default configurations in production ( as there will be almost no service isolation ).

### Installing hook.io

You may directly use your computer with Docker, or use `docker-machine`:

```bash
docker-machine create hook.io
eval $(docker-machine env hook.io)
```

Once `docker-machine` is installed and running, perform the following commands:

``` bash
git clone https://github.com/bigcompany/hook.io
cd hook.io
docker-compose build
docker-compose up
```

This should start the following services:

 - 1 hook.io front-end
 - 1 hook.io load balancer
 - 1 hook.io worker
 - 1 couchdb server
 - 1 redis server

*Note: The `cron` and `hpm` services are not currently included in our docker image. If you require using these services locally they should be easy to add.*

### Configure the local running hook.io instance

Once the services are started, you'll still need to run one more command.

To find the current address of the Docker machine run: `docker-machine ip hook.io`.

```bash
curl http://{{your_docker_machine_ip}}/_admin?setBase=1
```

If directly running from your computer, just use `localhost` for `{{your_docker_machine_ip}}`.

You should see something like:

```
set baseUrl to: http://{{your_docker_machine_ip}}:80
```

Without running this last line, site formatting (CSS), most HTTP redirects, and AJAX gateways in the system will not work. 

You may now browse to `http://{{your_docker_machine_ip}}` to access your local hook.io instance.

