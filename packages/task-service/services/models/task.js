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
    gid: { type: Number, required: true },
    name: { type: String, required: true }
  }, { _id: false }),
  followers: [
    mongoose.Schema({
      gid: { type: Number, required: true },
      name: { type: String, required: true }
    }, { _id: false })
  ],
  tags: [
    mongoose.Schema({
      gid: { type: String, required: true },
      name: { type: String, required: true }
    }, { _id: false })
  ]
})

TaskSchema.virtual('gid').get(function () {
  return this._id
})

TaskSchema.set('toJSON', {
  virtuals: true
})

module.exports = mongoose.model('Task', TaskSchema)
