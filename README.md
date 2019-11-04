# 🌍 Atlas

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)
[![Moleculer](https://badgen.net/badge/Powered%20by/Moleculer/0e83cd)](https://moleculer.services)
![Repo status](https://www.repostatus.org/badges/latest/active.svg)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/dwyl/esta/issues)

This is a group of micro services created to manage the whole Customer Operations team support softwares.

The main ideia is to have just one Kubernetes platform running with two API Gateways: **REST** and **GraphQL**. Those two gateways are responsible for translating the HTTP Requests into micro services calls, which are transported and cached by a Redis instance.

---

## Dependencies

- [Node JS](https://nodejs.org/en/) **^10.16**
- [Docker](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Instalation

Just install it as same as any other Node based project:

```bash
npm install
```

## Development

To locally start all the micro services platform, you need to copy the `.env.example` files inside the `packages/**/env` folder to `.env` files. This step is necessary to avoid exposing some of your private env vars into Git.

Sample of `.env.example` file:

```
NAMESPACE=atlas
NODENAME=rest-api-gateway

LOGGER=true
LOGLEVEL=info

SERVICEDIR=services
PORT=3030

TRANSPORTER=redis://redis:6379
CACHER=redis://redis:6379
SERIALIZER=JSON
```

Those env vars are responsible for setting main things for the micro service like its node name, its transporters or which cache instance will be used. Also, you can improve it with more context environment variables like database connection URIs or service exposed ports.

### Running locally

Once you setup all your `.env` files, you just need to execute the npm `dev` script which will start all docker containers and bind them with one network using docker compose.

```bash
npm run dev
```

### Seeing logs

You can also see all the micro services logs by typing the following command in another terminal:

```bash
# See all docker instances logs
npm run logs

# You can also specify a package to filter the log output
npm run logs -- task-service
```

### Linting

You can lint all the atlas packages by executing the lint command. It's important to remember that every package has its own `.eslintrc` config file:

```bash
# Lint all packages
npm run lint

# Or you can lint specific packages using the scope paramter
npm run lint -- --scope task-service
```

### Testing

You can run tests for every packages using the same test command you would in a classic Node project. Or you can run the continous test environment to a specific package or to all of them with the `test:watch` command:

```bash
# To run all tests once with coverage report
npm run test

# To watch tests from all packages
npm run test:watch

# To watch tests from a specific package
npm run test:watch -- --scope task-service
```

## Deployment

You just need to release a new version with this npm script:

```bash
npm run release
```

It will generate new versions based on the modified packages. Each new version will trigger a circleci deployment to refresh Kubernetes images.
