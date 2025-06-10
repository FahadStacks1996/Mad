const mongoose = require('mongoose');

const orderCounterSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: DDMMYYYY
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('OrderCounter', orderCounterSchema);