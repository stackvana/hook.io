FROM npmdeps
#FROM ubuntu:14.04

COPY ./lib /src/lib
COPY ./config /src/config


#COPY ./bin /bin
#COPY ./node_modules /bin/node_modules

RUN addgroup workers

RUN adduser --gid 1000 --disabled-password --gecos '' worker

RUN mkdir -p /var/chroot/bin
COPY ./bin /var/chroot/bin

# COPY /bin/bash /var/chroot/bin/bash

# RUN debootstrap --arch i386 wheezy /var/chroot http://httpredir.debian.org/debian

# dns resolve is probably missing...
RUN mkdir -p /var/chroot/etc/
RUN echo 'nameserver 8.8.4.4' | tee -a /var/chroot/etc/resolv.conf

WORKDIR /src

EXPOSE 10000

CMD node /src/bin/worker