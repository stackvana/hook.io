# start main front-end server
node bin/server &

# start five workers to run hooks

node bin/worker &
node bin/worker &
node bin/worker &
node bin/worker &
node bin/worker &
