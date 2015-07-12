trap 'killall node' EXIT
trap 'killall node' SIGINT


# start main front-end server
sudo node bin/server &

# start five workers to run hooks

sudo node bin/worker &
sudo node bin/worker &
sudo node bin/worker &
sudo node bin/worker &
sudo node bin/worker &

# start cron jobs
# sudo node bin/cron