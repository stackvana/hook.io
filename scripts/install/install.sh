# install.sh - will bootstrap an ubuntu machine to run hook.io
# TODO: replace this script with a Dockerfile

cd ..
cd ..
cd ..

# update apt-get
apt-get -y update

# install git
apt-get -y install git-core

# get latest stable node as tar
wget https://github.com/joyent/node/tarball/v0.12.7

# extract latest node
tar xf v0.12.7

# change directory into node
cd joyent-node-bf88623

# install some missing deps
apt-get -y install g++ curl libssl-dev apache2-utils

# configure
./configure

# install make
apt-get -y install make

# make node
make

# install node
make install

cd..

# install couchdb
apt-get install couchdb -y

# install redis
apt-get install redis-server -y

# install mon
git clone https://github.com/tj/mon
cd mon
make install
cd ..

# install user modules
cd hook.io
npm install
cd modules
node install.js
cd ..
cd ..


# run custom builds scripts /modules/builds
# TODO: automate
# see: /modules/builds folder for individual package build instructions

# start production
sh scripts/start-production.sh


# cd into main hook.io main repo
cd hook.io

# install hook.io deps
npm install
npm link



