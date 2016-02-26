#!/bin/bash

HOST=http://couch:5984

curl -X PUT $HOST/_config/admins/admin -d '"password"'