const mongoose = require('mongoose');

const clinicDetailsSchema = new mongoose.Schema({
  clinicType: {
    type: String,
    enum: [
      'General Clinic',
      'Dental Clinic',
      'Eye Clinic',
      'Skin Clinic',
      'Physiotherapy Clinic',
      'Multi-speciality Clinic'
    ],
    required: true
  },
  doctorCount: { type: Number, default: 0 },
  staffCount: { type: Number, default: 0 },
  consultationFee: { type: Number, default: 0 },
  openingHours: { type: String, trim: true },
  hasOPD: { type: Boolean, default: false },
  hasLab: { type: Boolean, default: false },
  hasMedicalStore: { type: Boolean, default: false }
}, { _id: false });

const documentsSchema = new mongoose.Schema({
  licenseUpload: { type: String, default: '' },
  ownerId: { type: String, default: '' },
  logo: { type: String, default: '' }
}, { _id: false });

const schema = new mongoose.Schema({
  code: { type: String, unique: true, index: true },
  clinicName: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phoneNumber: { type: String, required: true, trim: true },
  registrationNumber: { type: String, trim: true },
  address: { type: String, trim: true },
  country: { type: String, trim: true },
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  fullAddress: { type: String, trim: true },
  pincode: { type: String, trim: true },
  subscriptionPlan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
  planStartDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  deactivateOn: { type: Date, default: null },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  isLoginBlocked: { type: Boolean, default: false },
  clinicDetails: clinicDetailsSchema,
  documents: documentsSchema,
  createdBySuperAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Clinic', schema);
