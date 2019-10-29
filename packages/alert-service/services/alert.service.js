const { Errors } = require('moleculer')
const DbService = require('moleculer-db')
const MongooseAdapter = require('moleculer-db-adapter-mongoose')

module.exports = {
  name: 'alert',
  /**
   * Database adapter.
   */
  // mixins: [DbService],
  // adapter: new MongooseAdapter(process.env.DATABASE_CONNECTION_URI, { useUnifiedTopology: true }),
  // model: null,

  /**
   * Service settings.
   */
  settings: {

  },

  /**
   * Service dependencies.
   */
  dependencies: [],

  /**
   * Actions.
   */
  actions: {
    hello: {
      handler (ctx) {
        return 'Hello alert'
      }
    }
  },

  /**
   * Events.
   */
  events: {

  },

  /**
   * Methods.
   */
  methods: {

  },

  /**
   * Service created lifecycle event handler.
   */
  created () {

  },

  /**
   * Service started lifecycle event handler.
   */
  started () {

  },

  /**
   * Service stopped lifecycle event handler.
   */
  stopped () {

  }
}
