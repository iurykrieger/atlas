const mongoose = require('mongoose')

module.exports = mongoose.model('Task', mongoose.Schema({
  gid: { type: String, required: true },
  completed: { type: Boolean, required: true },
  created_at: Date,
  due_on: Date,
  completed_at: Date,
  name: { type: String, required: true },
  notes: String,
  workspace: mongoose.Schema({
    gid: { type: String, required: true },
    name: { type: String, required: true }
  }, false),
  projects: [
    mongoose.Schema({
      gid: { type: String, required: true },
      name: { type: String, required: true }
    }, false)
  ],
  assignee: mongoose.Schema({
    gid: { type: Number, required: true },
    name: { type: String, required: true }
  }, false),
  followers: [
    mongoose.Schema({
      gid: { type: Number, required: true },
      name: { type: String, required: true }
    }, false)
  ],
  tags: [
    mongoose.Schema({
      gid: { type: String, required: true },
      name: { type: String, required: true }
    }, false)
  ]
}))
