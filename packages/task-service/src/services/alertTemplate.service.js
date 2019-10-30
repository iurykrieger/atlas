const DbService = require('moleculer-db')
const MongooseAdapter = require('moleculer-db-adapter-mongoose')
const AlertTemplateModel = require('../models/alertTemplate')

module.exports = {
  name: 'alertTemplate',
  /**
   * Database adapter.
   */
  mixins: [DbService],
  adapter: new MongooseAdapter(process.env.DATABASE_CONNECTION_URI, { useUnifiedTopology: true }),
  model: AlertTemplateModel,
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
