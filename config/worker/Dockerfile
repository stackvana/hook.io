FROM node:0.12.7-wheezy
#FROM ubuntu:14.04

COPY . /src

RUN rm -rf /src/node_modules

# update apt-get
RUN apt-get -y update && apt-get -y upgrade

# install build-essential
RUN apt-get -y install build-essential

RUN cd /tmp; git clone https://github.com/tj/mon; cd mon; make install

RUN npm install -g npm

RUN cd /src; npm install

# RUN adduser worker

RUN addgroup workers

RUN adduser --gid 1000 --disabled-password --gecos '' worker

RUN mkdir /chroot

# RUN which node

WORKDIR /src

EXPOSE 10000

CMD node /src/bin/worker

# CMD node /src/bin/worker

# CMD node /src/bin/worker

# CMD node /src/bin/worker

# CMD node /src/bin/worker

# CMD node /src/bin/worker