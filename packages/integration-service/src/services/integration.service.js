const DbService = require('moleculer-db')
const SqlAdapter = require('moleculer-db-adapter-sequelize')
const Sequelize = require('sequelize')

module.exports = {
  name: 'integration',
  /**
   * Database adapter.
   */
  mixins: [DbService],
  adapter: new SqlAdapter(process.env.DATABASE_NAME, process.env.USERNAME, process.env.PASSWORD, {
    dialect: process.env.DIALECT,
    host: process.env.HOST,
    port: process.env.PORT
  }),
  model: {
    name: 'integration',
    define: {
      title: Sequelize.STRING,
      content: Sequelize.TEXT,
      votes: Sequelize.INTEGER,
      author: Sequelize.INTEGER,
      status: Sequelize.BOOLEAN
    },
    options: {
      // Options from http://docs.sequelizejs.com/manual/tutorial/models-definition.html
    }
  },
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
      cache: true,
      handler(ctx) {
        return new Promise(resolve => {
          console.log('chamou')
          setTimeout(() => resolve('hello'), 2000)
        })
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
  created() {

  },

  /**
   * Service started lifecycle event handler.
   */
  started() {

  },

  /**
   * Service stopped lifecycle event handler.
   */
  stopped() {

  }
}
