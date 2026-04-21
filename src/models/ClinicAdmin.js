const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const paymentScopeSchema = new mongoose.Schema({
  opd: { type: Boolean, default: false },
  lab: { type: Boolean, default: false },
  medicalStore: { type: Boolean, default: false }
}, { _id: false });

const permissionsSchema = new mongoose.Schema({
  canCreateSubAdmins: { type: Boolean, default: false },
  canRegisterPatient: { type: Boolean, default: false },
  canUpdateOPDPayment: { type: Boolean, default: false },
  canUpdateLabPayment: { type: Boolean, default: false },
  canUpdateMedicalStorePayment: { type: Boolean, default: false },
  paymentCollectionResponsibility: paymentScopeSchema
}, { _id: false });

const schema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  code: { type: String, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['clinic_admin', 'sub_admin'], default: 'clinic_admin' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  permissions: { type: permissionsSchema, default: () => ({}) },
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'createdByModel', default: null },
  createdByModel: { type: String, enum: ['SuperAdmin', 'ClinicAdmin', 'Staff'], default: 'SuperAdmin' }
}, { timestamps: true });

schema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

schema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('ClinicAdmin', schema);
