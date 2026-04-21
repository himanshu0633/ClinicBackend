const mongoose = require('mongoose');

const statusEntrySchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid', 'partial', 'waived'], default: 'pending' },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const schema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  opd: { type: statusEntrySchema, default: () => ({}) },
  lab: { type: statusEntrySchema, default: () => ({}) },
  medicalStore: { type: statusEntrySchema, default: () => ({}) },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('PaymentRecord', schema);
