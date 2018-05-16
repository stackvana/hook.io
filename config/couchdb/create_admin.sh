#!/bin/bash

HOST=http://couch:5984

curl -s -X PUT $HOST/_node/nonode@nohost/_config/admins/admin  -d '"password"'
curl -s -X PUT -u admin:password $HOST/_users
curl -s -X PUT -u admin:password $HOST/_replicator
curl -s -X PUT -u admin:password $HOST/_global_changes

#curl -X PUT $HOST/_config/admins/admin -d '"password"'
