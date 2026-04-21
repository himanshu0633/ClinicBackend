const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  paymentRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRecord', required: true },
  moduleName: { type: String, enum: ['opd', 'lab', 'medical_store'], required: true },
  oldStatus: { type: String, default: 'pending' },
  newStatus: { type: String, required: true },
  oldAmount: { type: Number, default: 0 },
  newAmount: { type: Number, default: 0 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'changedByModel' },
  changedByModel: { type: String, enum: ['ClinicAdmin', 'Staff'], required: true },
  changedByName: { type: String, required: true },
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('PaymentAuditLog', schema);
