FROM npmdeps
#FROM ubuntu:14.04

COPY ./lib /src/lib
COPY ./config /src/config

# COPY ./bin /bin

WORKDIR /src

EXPOSE 9999

CMD node /src/bin/server

