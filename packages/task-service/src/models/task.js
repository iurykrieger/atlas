const mongoose = require('mongoose')

const TaskSchema = mongoose.Schema({
  _id: { type: String, required: true },
  completed: { type: Boolean, required: true },
  created_at: Date,
  due_on: Date,
  completed_at: Date,
  name: { type: String, required: true },
  notes: String,
  workspace: mongoose.Schema({
    gid: { type: String, required: true },
    name: { type: String, required: true }
  }, { _id: false }),
  projects: [
    mongoose.Schema({
      gid: { type: String, required: true },
      name: { type: String, required: true }
    }, { _id: false })
  ],
  assignee: mongoose.Schema({
    gid: { type: String, required: true },
    name: { type: String, required: true }
  }, { _id: false }),
  followers: [
    mongoose.Schema({
      gid: { type: String, required: true },
      name: { type: String, required: true }
    }, { _id: false })
  ],
  tags: [
    mongoose.Schema({
      gid: { type: String, required: true },
      name: { type: String, required: true }
    }, { _id: false })
  ],
  alert: { type: String }
}, {
  toObject: {
    transform: function (doc, ret) {
      delete ret.id
      delete ret._id
    },
    virtuals: true
  },
  toJSON: {
    transform: function (doc, ret) {
      delete ret.id
      delete ret._id
    },
    virtuals: true
  }
})

TaskSchema.methods.toAsana = function () {
  const task = this.toObject()
  return {
    name: task.name,
    notes: task.notes,
    completed: task.completed,
    due_on: task.due_on,
    workspace: task.workspace.gid
  }
}

TaskSchema.virtual('gid').get(function () {
  return this._id
})

module.exports = mongoose.model('Task', TaskSchema)
