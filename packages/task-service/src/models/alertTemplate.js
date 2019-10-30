const mongoose = require('mongoose')

const AlertTemplateSchema = mongoose.Schema({
  _id: { type: String, required: true },
  description: { type: String, required: true },
  memberships: {
    type: [
      mongoose.Schema({
        project: { type: String, required: true },
        section: { type: String, required: true }
      }, { _id: false })
    ],
    required: true,
    validate: {
      validator: function (array) {
        return array.length > 0
      }
    }
  },
  tags: { type: Array },
  limitDate: { type: Number, required: true }
}, {
  _id: false,
  id: true
})

module.exports = mongoose.model('AlertTemplate', AlertTemplateSchema)
