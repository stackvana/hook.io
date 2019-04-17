FROM node:10

# update apt-get
RUN apt-get -y update && apt-get -y upgrade

# install build-essential
RUN apt-get -y install build-essential binutils debootstrap netcat

# install mon
RUN cd /tmp; git clone https://github.com/tj/mon; cd mon; make install

# copy basic files
# Only copy package.json first to help with cache
ADD . /src
WORKDIR /src

RUN export USER=root && cd /src && rm -rf ./node_modules/ && npm install && npm link

# disable install modules for now
# RUN cd /src/modules && node install.js

RUN addgroup workers
RUN adduser --gid 1000 --disabled-password --gecos '' worker

RUN mkdir -p /var/chroot/bin
COPY ./bin /var/chroot/bin

# fake ssl certificates
RUN mkdir -p /etc/letsencrypt/live/hook.io
COPY ./ssl/*.pem /etc/letsencrypt/live/hook.io/

# COPY /bin/bash /var/chroot/bin/bash

# RUN debootstrap --arch i386 wheezy /var/chroot http://httpredir.debian.org/debian

# dns resolve is probably missing...
# RUN mkdir -p /var/chroot/etc/
# RUN echo 'nameserver 8.8.4.4' | tee -a /var/chroot/etc/resolv.conf

