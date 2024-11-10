FROM node:20.18-alpine as base

ARG _WORKDIR=/home/node/app
ARG PORT=3333
COPY package.json ${_WORKDIR}/
COPY .yarn ${_WORKDIR}/.yarn
COPY .yarnrc.yml ${_WORKDIR}/
RUN corepack enable
# install yarn berry
RUN yarn set version berry
USER root
RUN apk add git

WORKDIR ${_WORKDIR}

ADD . ${_WORKDIR}
RUN yarn install

FROM base as development
ENV NODE_PATH=./src
EXPOSE ${PORT}
CMD ["yarn", "dev"]

FROM base as production

ENV NODE_PATH=./dist
RUN yarn build

USER node
EXPOSE ${PORT}

CMD ["yarn","start"]
