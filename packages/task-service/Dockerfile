FROM node:10.16.0

USER node

RUN mkdir -p /home/node/node_app/app

WORKDIR /home/node/node_app

COPY package*.json ./

RUN npm install

ENV PATH /home/node/node_app/node_modules/.bin:$PATH

WORKDIR /home/node/node_app/app

CMD [ "npm", "start" ]