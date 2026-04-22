const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  code: { type: String, unique: true, index: true },
  patientId: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number, default: 0 },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  email: { type: String, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  address: { type: String, trim: true },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'registeredByModel' },
  registeredByModel: { type: String, enum: ['ClinicAdmin', 'Staff'], default: 'ClinicAdmin' }
}, { timestamps: true });

module.exports = mongoose.model('Patient', schema);
