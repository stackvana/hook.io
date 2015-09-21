FROM ubuntu:14.04

COPY . /src

RUN apt-get -y install wget

RUN cd /src; sh ./scripts/install.sh; npm install;

EXPOSE  8080
CMD ["node", "/src/index.js"]
