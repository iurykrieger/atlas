const Asana = require('asana')
const { Errors } = require('moleculer')
const DbService = require('moleculer-db')
const MongooseAdapter = require('moleculer-db-adapter-mongoose')
const TaskModel = require('./models/task')

/**
 * @typedef Alert
 * @property { string } apiKey
 * @property { string } type
 * @property { number } [count=1]
 * @property { object } data
 * @property { string } data.message
 */
class AsanaError extends Errors.MoleculerError {
  constructor (msg, error) {
    super(`${msg}: ${error.message}`, error.status, 'ASANA_ERROR', error.value)
  }
}

class MongooseError extends Errors.MoleculerError {
  constructor (msg, error) {
    super(`${msg}: ${error.message}`, error.status, 'MONGOOSE_ERROR', error.value)
  }
}

module.exports = {
  name: 'task',
  /**
   * Database adapter.
   */
  mixins: [DbService],
  adapter: new MongooseAdapter(process.env.DATABASE_CONNECTION_URI, { useUnifiedTopology: true }),
  model: TaskModel,
  /**
   * Service settings.
   */
  settings: {
    $secureSettings: ['asana.token'],
    asana: {
      headers: {
        'asana-enable': 'string_ids,new_sections'
      },
      workspace: '2653227806782', // Chaordic
      token: process.env.ASANA_TOKEN,
      projects: {
        ftt: {
          id: '520293271448220',
          sections: {
            v2: '1135307252592043'
          }
        },
        'devs-atd': {
          id: '24457451196652',
          sections: {
            p0: '24457451196655'
          }
        },
        'dsns-atd': {
          id: '23236706094881',
          sections: {
            alerts: '909056654431347'
          }
        },
        'n1-atd': {
          id: '743516892538171',
          sections: {
            catalogAlerts: '753691956828190'
          }
        },
        'qas-atd': {
          id: '24595803650935',
          sections: {
            p0: '24597094114090'
          }
        }
      }
    },
    alerts: {
      'alert.routine.full.crash': [{
        project: 'devs-atd',
        section: 'p0'
      }],
      'alert.teste': [{
        project: 'devs-atd',
        section: 'p0'
      }]
    }
  },

  /**
   * Service dependencies.
   */
  dependencies: [],

  /**
   * Actions.
   */
  actions: {

    create: {
      /**
       * Task schema validation.
       */
      params: {
        name: { type: 'string' },
        notes: { type: 'string', optional: true },
        memberships: {
          type: 'array',
          items: {
            type: 'object',
            props: {
              project: { type: 'string' },
              section: { type: 'string' }
            }
          }
        }
      },
      /**
       * Creates a task into wanted project.
       *
       * @param { import('moleculer').Context } ctx - Moleculer context.
       * @returns { Promise.<import('asana').resources.Tasks.Type> } Asana created task.
       */
      handler (ctx) {
        return this.createTask(ctx.params)
      }
    },

    update: {
      params: {
        id: { type: 'string' },
        data: { type: 'object' }
      },
      handler (ctx) {
        return this.updateTask(ctx.params.id, ctx.params.data)
      }
    },

    remove: {
      params: {
        id: { type: 'string' }
      },
      handler (ctx) {
        return this.deleteTask(ctx.params.id)
      }
    },

    close: {
      params: {
        id: { type: 'string' }
      },
      handler (ctx) {
        return this.closeTask(ctx.params.id)
      }
    },

    getUser: {
      cache: true,
      /**
       * Retrieves current client user info.
       *
       * @returns { Promise.<import('asana').resources.Users.Type> } Asana User Type.
       */
      handler () {
        return this.getUser()
      }
    },

    getWorkspaceByName: {
      cache: true,
      params: {
        name: { type: 'string' }
      },
      /**
       * Finds any workspace matching the given name.
       *
       * @param { import('moleculer').Context } ctx - Moleculer context.
       * @returns { Promise.<import('asana').resources.Workspaces.Type> } Asana workspace.
       */
      handler (ctx) {
        return this.getWorkspaceByName(ctx.params.name)
      }
    }
  },

  /**
   * Events.
   */
  events: {
    'alert.created' (alert) {
      this.createTaskByAlert(alert)
    },
    'alert.closed' (alert) {
      this.closeTaskByAlert(alert)
    },
    'alert.updated' (alert) {
      this.updateTaskOccurrences()
    }
  },

  /**
   * Methods.
   */
  methods: {

    /**
     * Creates a Asana Task based on a payload alert.
     *
     * @param { Alert } alert - Payload alert.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } - Promise of created task.
     */
    createTaskByAlert (alert) {
      return this.createTask(this.parseAlertIntoTask(alert))
    },

    closeTaskByAlert (alert) {
      // TODO: Close task by alert payload operation.
    },

    /**
     * Creates a task into Asana wanted project and inserts it into the database.
     *
     * @param { import('asana').resources.Tasks.Type } taskData - Asana task create params.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } Database created task based on Asana created one.
     */
    async createTask (taskData) {
      const asanaTask = await this.createAsanaTask(taskData)
      const databaseTask = await this.createDatabaseTask(asanaTask)
      return databaseTask
    },

    /**
     * Creates a task into Asana wanted project.
     *
     * @param { import('asana').resources.Tasks.Type } taskData - Asana task create params.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } Asana created task.
     */
    async createAsanaTask (taskData) {
      try {
        const asanaTask = await this.client.tasks.create({ workspace: this.settings.asana.workspace, ...taskData })
        return asanaTask
      } catch (error) {
        throw new AsanaError('Could not create Asana task', error)
      }
    },

    /**
     * Creates a taask into database based on Asana created one.
     *
     * @param { import('asana').resources.Tasks.Type } asanaTask - Asana created task.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } Database created task.
     */
    async createDatabaseTask (asanaTask) {
      try {
        const databaseTask = await this.adapter.insert({ ...asanaTask, _id: asanaTask.gid })
        return databaseTask
      } catch (error) {
        await this.deleteAsanaTask(asanaTask.gid)
        throw new MongooseError('Could not create Mongoose task', error)
      }
    },

    async closeTask (gid) {
      try {
        const asanaTask = await this.updateTask(gid, { completed: true })
        return asanaTask
      } catch (error) {
        throw new AsanaError('Could not close Asana task', error)
      }
    },

    async updateTask (gid, taskData) {
      const asanaTask = await this.updateAsanaTask(gid, taskData)
      const databaseTask = await this.updateDatabaseTask(asanaTask)
      return databaseTask
    },

    async updateAsanaTask (gid, taskData) {
      try {
        const asanaTask = await this.client.tasks.update(gid, taskData)
        return asanaTask
      } catch (error) {
        throw new AsanaError('Could not update Asana task', error)
      }
    },

    async updateDatabaseTask (asanaTask) {
      try {
        const databaseTask = await this.adapter.updateById(asanaTask.gid, asanaTask)
        return databaseTask
      } catch (error) {
        const databaseTask = await this.adapter.findById(asanaTask.gid)
        await this.updateAsanaTask(asanaTask.gid, databaseTask.toAsana())
        throw new MongooseError('Could not update Mongoose task', error)
      }
    },

    async deleteTask (gid) {
      await this.deleteAsanaTask(gid)
      await this.deleteDatabaseTask(gid)
    },

    async deleteAsanaTask (gid) {
      try {
        await this.client.tasks.delete(gid)
      } catch (error) {
        throw new AsanaError('Could not delete asana task', error)
      }
    },

    async deleteDatabaseTask (gid) {
      try {
        await this.adapter.removeById(gid)
      } catch (error) {
        throw new MongooseError('Could not delete database task', error)
      }
    },

    /**
     * Finds any workspace matching the given name.
     *
     * @param { string } name - Name to be found.
     * @returns { Promise.<import('asana').resources.Workspaces.Type> } Asana workspace.
     */
    async getWorkspaceByName (name) {
      try {
        const { data: workspaces } = await this.client.workspaces.findAll()
        return workspaces.find(workspace => workspace.name === name) || {}
      } catch (error) {
        throw new AsanaError(`There's been an error finding the workspace ${name}`, error)
      }
    },

    async updateTaskOccurrences (gid, ocurrenceDate, count) {
      try {
        const task = await this.adapter.findById(gid)
        const date = ocurrenceDate.toLocaleDateString(
          'pt-BR',
          {
            year: 'numeric',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'America/Sao_Paulo'
          }
        )
        const ocurrenceRegex = /^[\W\w]+-----/
        const ocurrenceLabel = (count, lastOcurrence) => `Alerta ocorreu ${count}x.\nÚltimo em ${lastOcurrence}.\n-----\n`

        return this.updateTask(gid, {
          name: task.name.replace(/^(?:\[\d+x\])?\s*/, `[${count}x] `),
          notes: task.notes.match(ocurrenceRegex)
            ? task.notes.replace(ocurrenceRegex, ocurrenceLabel(count, date))
            : ocurrenceLabel(count, date).concat(task.notes)
        })
      } catch (error) {
        throw new AsanaError('Could not update task occurences', error)
      }
    },

    /**
     * Retrieves Asana current client user info.
     *
     * @returns { Promise.<import('asana').resources.Users.Type> } Asana User Type.
     */
    async getUser () {
      try {
        const user = await this.client.users.me()
        return user
      } catch (err) {
        throw new Errors.MoleculerError('Could not find the Asana client user', 404)
      }
    },

    /**
     * Parses an `Alert` into a `Task` type to be created.
     *
     * @param { Alert } alert - Payload alert.
     * @returns { import('asana').resources.Tasks.Type } Parsed task.
     */
    parseAlertIntoTask (alert) {
      try {
        return {
          name: `[${alert.apiKey}][${alert.count || 1}x] ${alert.data.message}`,
          workspace: this.settings.asana.workspace,
          memberships: this.getMembershipsByAlertType(alert.type),
          notes: alert.data.message
        }
      } catch (error) {
        throw new Errors.MoleculerError('There\'s a problem at alert parsing', 400, error.message, alert)
      }
    },

    /**
     * Discover task memberships by the given alert type.
     * This will choose in which project/section the task will be created.
     *
     * @param { string } alertType - Alert type.
     * @returns { import('asana').resources.Membership[] } Matched memberships found.
     */
    getMembershipsByAlertType (alertType) {
      return this.settings.alerts[alertType].map(({ project, section }) => ({
        project: this.settings.asana.projects[project].id,
        section: this.settings.asana.projects[project].sections[section]
      }))
    }
  },

  /**
   * Service created lifecycle event handler.
   */
  created () {
    this.client = Asana.Client
      .create({ defaultHeaders: this.settings.asana.headers })
      .useAccessToken(this.settings.asana.token)
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
