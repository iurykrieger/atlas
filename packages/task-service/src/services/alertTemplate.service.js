const DbService = require('moleculer-db')
const MongooseAdapter = require('moleculer-db-adapter-mongoose')
const AlertTemplateModel = require('../models/alertTemplate')

/**
 * @typedef AlertTemplate
 * @property { string } id - Alert type.
 * @property { string } description - Alert template description.
 * @property { string[] } tags - Asana task tags.
 * @property { number } limitDate - Task due date.
 * @property { object[] } memberships
 * @property { string } memberships[].project
 * @property { string } memberships[].section
 */

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
    get: {
      params: {
        id: { type: 'string', required: true }
      },
      handler (ctx) {
        return this.getById(ctx.params.id)
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
    async getById (id) {
      try {
        const template = await this.adapter.findById(id)
        return template
      } catch (error) {
        return null
      }
    }
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
