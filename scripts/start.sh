# start main front-end server
sudo node bin/server &

# start five workers to run hooks

sudo node bin/worker &
sudo node bin/worker &
sudo node bin/worker &
sudo node bin/worker &
sudo node bin/worker