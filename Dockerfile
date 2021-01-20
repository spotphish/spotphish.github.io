FROM alpine
RUN apk add curl
COPY . /spotphish-model-testing
WORKDIR /spotphish-model-testing
