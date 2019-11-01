'use strict'

const ApiGateway = require('moleculer-web')

module.exports = {
  name: 'api',
  mixins: [ApiGateway],

  // Global CORS settings for all routes
  cors: {
    // Configures the Access-Control-Allow-Origin CORS header.
    origin: '*',
    // Configures the Access-Control-Allow-Methods CORS header.
    methods: ['GET', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
    // Configures the Access-Control-Allow-Headers CORS header.
    allowedHeaders: [],
    // Configures the Access-Control-Expose-Headers CORS header.
    exposedHeaders: [],
    // Configures the Access-Control-Allow-Credentials CORS header.
    credentials: false,
    // Configures the Access-Control-Max-Age CORS header.
    maxAge: 3600
  },

  // More info about settings: https://moleculer.services/docs/0.13/moleculer-web.html
  settings: {
    port: process.env.PORT || 3000,
    path: '/api',
    routes: [{
      mappingPolicy: 'restrict',
      aliases: {
        'POST tasks/events': [
          function asanaWebhookHandshake (req, res, next) {
            const hookSecret = req.headers['x-hook-secret']
            if (hookSecret) {
              this.logger.info('Asana Webhook Handshake made')
              res.setHeader('X-Hook-Secret', hookSecret)
            }
            return next()
          },
          'task.syncTasksByEvents'
        ]
      },
      bodyParsers: {
        json: true
      }
    }]
  },

  methods: {

  }
}
