FROM node:0.12.7-wheezy
#FROM ubuntu:14.04

COPY . /src

RUN rm -rf /src/node_modules

# update apt-get
RUN apt-get -y update && apt-get -y upgrade

# install build-essential
RUN apt-get -y install build-essential

# install and configure couchdb
RUN apt-get -y install couchdb

# install and configure redis
RUN apt-get -y install redis-server

RUN cd /tmp; git clone https://github.com/tj/mon; cd mon; make install

RUN npm install -g npm

RUN cd /src; npm install

# RUN adduser worker

RUN addgroup workers

RUN adduser --gid 1000 --disabled-password --gecos '' worker

RUN mkdir /chroot

# RUN which node

WORKDIR /src

EXPOSE 9999

CMD sh /src/scripts/start.sh
