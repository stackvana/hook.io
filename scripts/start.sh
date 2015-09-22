#trap 'killall node' EXIT
#trap 'killall node' SIGINT


# start main front-end server
node /src/bin/server &

# start five workers to run hooks

node /src/bin/worker &
node /src/bin/worker &
node /src/bin/worker &
node /src/bin/worker &
node /src/bin/worker

# start cron jobs
# sudo node bin/cron