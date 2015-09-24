#trap 'killall node' EXIT
#trap 'killall node' SIGINT


# start main front-end server
node ./bin/server &

# start five workers to run hooks

node ./bin/worker &
node ./bin/worker &
node ./bin/worker &
node ./bin/worker &
node ./bin/worker

# start cron jobs
# sudo node bin/cron