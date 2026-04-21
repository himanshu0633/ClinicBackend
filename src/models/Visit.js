const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'opdPayment.updatedByModel', default: null },
  updatedByModel: { type: String, enum: ['ClinicAdmin', 'Staff'], default: null },
  updatedByName: { type: String, default: '' },
  updatedAt: { type: Date, default: null }
}, { _id: false });

const vitalsSchema = new mongoose.Schema({
  bp: { type: String, default: '' },
  temperature: { type: Number, default: null },
  weight: { type: Number, default: null },
  filledBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'vitals.filledByModel', default: null },
  filledByModel: { type: String, enum: ['ClinicAdmin', 'Staff'], default: null },
  filledAt: { type: Date, default: null }
}, { _id: false });

const testItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  fee: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'ready'], default: 'pending' },
  reportFile: { type: String, default: '' },
  notes: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'tests.updatedByModel', default: null },
  updatedByModel: { type: String, enum: ['ClinicAdmin', 'Staff'], default: null },
  updatedByName: { type: String, default: '' },
  updatedAt: { type: Date, default: null }
}, { _id: true, timestamps: true });

const medicineItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  timing: { type: String, enum: ['before_food', 'after_food', 'anytime'], default: 'after_food' },
  frequencyPerDay: { type: Number, default: 1 },
  days: { type: Number, default: 1 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  storeStatus: { type: String, enum: ['pending', 'processing', 'completed'], default: 'pending' },
  unitPrice: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' }
}, { _id: true, timestamps: true });

const consultationSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  parhej: { type: String, default: '' },
  medicineDays: { type: Number, default: 0 },
  followUpDate: { type: Date, default: null },
  caseStatus: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  completedAt: { type: Date, default: null },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', default: null },
  doctorName: { type: String, default: '' }
}, { _id: false, timestamps: true });

const schema = new mongoose.Schema({
  clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  visitDate: { type: Date, required: true, index: true },
  serialNo: { type: Number, required: true },
  bookingSource: { type: String, enum: ['self', 'clinic'], default: 'clinic' },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'bookedByModel', default: null },
  bookedByModel: { type: String, enum: ['ClinicAdmin', 'Staff', 'Patient'], default: 'Staff' },
  visitType: { type: String, enum: ['new', 'revisit'], default: 'new' },
  status: { type: String, enum: ['booked', 'arrived', 'with_doctor', 'done', 'cancelled'], default: 'booked' },
  opdPayment: { type: paymentSchema, default: () => ({}) },
  vitals: { type: vitalsSchema, default: () => ({}) },
  consultation: { type: consultationSchema, default: () => ({}) },
  tests: { type: [testItemSchema], default: [] },
  medicines: { type: [medicineItemSchema], default: [] },
  previousOpenVisitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visit', default: null }
}, { timestamps: true });

schema.index({ clinicId: 1, visitDate: 1, serialNo: 1 }, { unique: true });

module.exports = mongoose.model('Visit', schema);
