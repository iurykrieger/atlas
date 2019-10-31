const Asana = require('asana')
const { Errors } = require('moleculer')
const { MongooseError, AsanaError } = require('../utils/errors')
const DbService = require('moleculer-db')
const MongooseAdapter = require('moleculer-db-adapter-mongoose')
const TaskModel = require('../models/task')

/**
 * @typedef Alert
 * @property { string } apiKey
 * @property { string } type
 * @property { number } [count=1]
 * @property { object } data
 * @property { string } data.message
 */

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
      token: process.env.ASANA_TOKEN
    }
  },

  /**
   * Service dependencies.
   */
  dependencies: [
    'alertTemplate'
  ],

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
      /**
       * Deletes a task based on its id.
       *
       * @param { import('moleculer').Context } ctx - Moleculer context.
       * @returns { Promise.<import('asana').resources.Tasks.Type> } Asana updated task.
       */
      handler (ctx) {
        return this.updateTask(ctx.params.id, ctx.params.data)
      }
    },

    remove: {
      params: {
        id: { type: 'string' }
      },
      /**
       * Deletes a task based on its id.
       *
       * @param { import('moleculer').Context } ctx - Moleculer context.
       * @returns { Promise.<void> } Promise to delete action.
       */
      handler (ctx) {
        return this.deleteTask(ctx.params.id)
      }
    },

    close: {
      params: {
        id: { type: 'string' }
      },
      /**
       * Closes a task based on its id.
       *
       * @param { import('moleculer').Context } ctx - Moleculer context.
       * @returns { Promise.<import('asana').resources.Tasks.Type> } Asana closed task.
       */
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
    },

    getProjects: {
      cache: true,

      /**
       * Get all Asana workspace projects.
       *
       * @returns { import('asana').resources.Projects.Type[] } - List of workspace projects.
       */
      handler () {
        return this.getWorkspaceProjects()
      }
    }
  },

  /**
   * Events.
   */
  events: {
    /**
     * Creates a task based on the received alert payload.
     *
     * @param { Alert } alert - Payload alert.
     */
    async 'alert.created' (alert) {
      try {
        await this.createTaskByAlert(alert)
      } catch (error) {
        this.logger.error(error)
      }
    },
    /**
     * Closes the task corresponding to the received alert payload.
     *
     * @param { Alert } alert - Payload alert.
     */
    async 'alert.closed' (alert) {
      try {
        await this.closeTaskByAlert(alert)
      } catch (error) {
        this.logger.error(error)
      }
    },
    /**
     * Updates the task ocurrences corresponding to the received alert payload.
     *
     * @param { Alert } alert - Payload alert.
     */
    async 'alert.updated' (alert) {
      try {
        await this.updateTaskOccurrencesByAlert(alert)
      } catch (error) {
        this.logger.error(error)
      }
    }
  },

  /**
   * Methods.
   */
  methods: {

    /**
     * Gets the correlated Asana task to the given payload alert.
     *
     * @param { Alert } alert - Payload alert.
     * @returns { import('asana').resources.Tasks.Type } Related task found.
     */
    async getTaskByAlert (alert) {
      try {
        const task = await this.adapter.findOne({ alert: alert.id })
        return task
      } catch (error) {
        throw new MongooseError(`There's been a problem finding the task related to alert "${alert.id}"`, error)
      }
    },

    /**
     * Creates a Asana Task based on a payload alert.
     *
     * @param { Alert } alert - Payload alert.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } - Promise of created task.
     */
    async createTaskByAlert (alert) {
      const alertTemplate = await this.broker.call('alertTemplate.get', { id: alert.type })
      if (alertTemplate && alert) {
        const asanaTask = await this.createAsanaTask(this.parseAlertIntoTask(alertTemplate, alert))
        const databaseTask = await this.createDatabaseTask({ ...asanaTask, alert: alert.id })
        return databaseTask
      }
    },

    /**
     * Update task ocurrences based on payload alert information.
     *
     * @param { Alert } alert - Payload alert.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } Updated task.
     */
    async updateTaskOccurrencesByAlert (alert) {
      if (!alert.id || !alert.count) {
        throw new Errors.MoleculerError('No alert id or count found', 400, 'TASK_SERVICE', alert)
      }

      const task = await this.getTaskByAlert(alert)

      if (task) {
        return this.updateTaskOccurrences(task, new Date(), alert.count)
      }
    },

    /**
     * Closes the related Asana task based on payload alert information.
     *
     * @param { Alert } alert - Payload alert.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } Closed task.
     */
    async closeTaskByAlert (alert) {
      if (!alert.id) {
        throw new Errors.MoleculerError('No alert id found', 400, 'TASK_SERVICE', alert)
      }

      const task = await this.getTaskByAlert(alert)

      if (task) {
        return this.closeTask(task.gid)
      }
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

    /**
     * Closes a task at Asaana and update its state at the database.
     *
     * @param { string } gid - Asana task id.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } Database closed task.
     */
    async closeTask (gid) {
      try {
        const asanaTask = await this.updateTask(gid, { completed: true })
        return asanaTask
      } catch (error) {
        throw new AsanaError('Could not close Asana task', error)
      }
    },

    /**
     * Updates a task at Asana and update its state at the database.
     *
     * @param { string } gid - Asana task id.
     * @param { import('asana').resources.Tasks.CreateParams } taskData - Task data to be updated.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } - Database updated task.
     */
    async updateTask (gid, taskData) {
      const asanaTask = await this.updateAsanaTask(gid, taskData)
      const databaseTask = await this.updateDatabaseTask(asanaTask)
      return databaseTask
    },

    /**
     * Updates the given task content at Asana.
     *
     * @param { string } gid - Asana task id.
     * @param { import('asana').resources.Tasks.CreateParams } taskData - Task data to be updated.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } - Asana updated task.
     */
    async updateAsanaTask (gid, taskData) {
      try {
        const asanaTask = await this.client.tasks.update(gid, taskData)
        return asanaTask
      } catch (error) {
        throw new AsanaError('Could not update Asana task', error)
      }
    },

    /**
     * Updates the state of an Asana task into the database.
     *
     * @param { import('asana').resources.Tasks.Type } asanaTask - Asana task.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } - Database updated task.
     */
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

    /**
     * Deletes a task at Asana and remove it at the database as well.
     *
     * @param { string } gid - Asana task id.
     * @returns { Promise.<void> } Promise of the remove action.
     */
    async deleteTask (gid) {
      await this.deleteAsanaTask(gid)
      await this.deleteDatabaseTask(gid)
    },

    /**
     * Deletes a task at Asana.
     *
     * @param { string } gid - Asana task id.
     * @returns { Promise.<void> } Promise of the remove action.
     */
    async deleteAsanaTask (gid) {
      try {
        await this.client.tasks.delete(gid)
      } catch (error) {
        throw new AsanaError('Could not delete asana task', error)
      }
    },

    /**
     * Deletes a task at the database.
     *
     * @param { string } gid - Asana task id.
     * @returns { Promise.<void> } Promise of the remove action.
     */
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

    /**
     * Updates Asana task occurrence information.
     *
     * @param { import('asana').resources.Tasks.Type } task - Database task.
     * @param { Date } ocurrenceDate - Date of the last occurrence.
     * @param { number } count - Current number of occurrences.
     * @returns { Promise.<import('asana').resources.Tasks.Type> } Database updated task.
     */
    async updateTaskOccurrences (task, ocurrenceDate, count) {
      try {
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

        return this.updateTask(task.gid, {
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
     * @param { import('./alertTemplate.service').AlertTemplate } alertTemplate - Alert template.
     * @param { Alert } alert - Payload alert.
     * @returns { import('asana').resources.Tasks.Type } Parsed task.
     */
    parseAlertIntoTask (alertTemplate, alert) {
      try {
        return {
          name: `[${alert.apiKey}][${alert.count || 1}x] ${alert.data.message}`,
          workspace: this.settings.asana.workspace,
          memberships: alertTemplate.memberships,
          notes: alertTemplate.description
        }
      } catch (error) {
        throw new Errors.MoleculerError('There\'s a problem at alert parsing', 400, error.message, alert)
      }
    },

    async getWorkspaceProjects () {
      try {
        const { data: projects = [] } = await this.client.projects.findByWorkspace(this.settings.asana.workspace)
        return projects
      } catch (error) {
        throw new AsanaError('Could not get the workspace projects', error)
      }
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
