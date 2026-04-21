const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  name: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel', default: null },
  createdByModel: { type: String, enum: ['ClinicAdmin', 'Staff'], default: null }
}, { timestamps: true });

schema.index({ clinicId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('MedicineMaster', schema);
