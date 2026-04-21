const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  name: { type: String, required: true, trim: true },
  defaultFee: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

schema.index({ clinicId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('TestCatalog', schema);
