const Clinic = require('../models/Clinic');
const ClinicAdmin = require('../models/ClinicAdmin');
const { generateEntityCode } = require('../utils/codeGenerator');

function calculateExpiryDate(plan) {
  const date = new Date();
  if (plan === 'basic') date.setDate(date.getDate() + 90);
  else if (plan === 'premium') date.setDate(date.getDate() + 365);
  else date.setDate(date.getDate() + 30);
  return date;
}

async function registerClinic(req, res) {
  const {
    clinicName,
    ownerName,
    email,
    phoneNumber,
    registrationNumber,
    address,
    country,
    state,
    city,
    fullAddress,
    pincode,
    adminName,
    adminEmail,
    password,
    subscriptionPlan,
    clinicType,
    doctorCount,
    staffCount,
    consultationFee,
    openingHours,
    hasOPD,
    hasLab,
    hasMedicalStore,
    deactivateOn
  } = req.body;

  if (!clinicName || !ownerName || !email || !phoneNumber || !city || !adminName || !adminEmail || !password || !clinicType) {
    return res.status(400).json({ success: false, message: 'Please fill all required fields' });
  }

  const existingAdmin = await ClinicAdmin.findOne({ email: adminEmail.toLowerCase() });
  if (existingAdmin) return res.status(400).json({ success: false, message: 'Admin email already exists' });

  const files = req.files || {};
  const documents = {
    licenseUpload: files.licenseUpload?.[0] ? `/uploads/clinics/${files.licenseUpload[0].filename}` : '',
    ownerId: files.ownerId?.[0] ? `/uploads/clinics/${files.ownerId[0].filename}` : '',
    logo: files.logo?.[0] ? `/uploads/clinics/${files.logo[0].filename}` : ''
  };

  const code = await generateEntityCode(Clinic, clinicName, city, 'CLN');
  const clinic = await Clinic.create({
    code,
    clinicName,
    ownerName,
    email,
    phoneNumber,
    registrationNumber,
    address,
    country,
    state,
    city,
    fullAddress,
    pincode,
    subscriptionPlan: subscriptionPlan || 'free',
    expiryDate: calculateExpiryDate(subscriptionPlan || 'free'),
    deactivateOn: deactivateOn || null,
    documents,
    createdBySuperAdmin: req.superAdmin?._id || null,
    clinicDetails: {
      clinicType,
      doctorCount: Number(doctorCount) || 0,
      staffCount: Number(staffCount) || 0,
      consultationFee: Number(consultationFee) || 0,
      openingHours: openingHours || '',
      hasOPD: hasOPD === 'true' || hasOPD === true,
      hasLab: hasLab === 'true' || hasLab === true,
      hasMedicalStore: hasMedicalStore === 'true' || hasMedicalStore === true
    }
  });

  const adminCode = await generateEntityCode(ClinicAdmin, adminName, city, 'ADM');
  const admin = await ClinicAdmin.create({
    clinicId: clinic._id,
    code: adminCode,
    name: adminName,
    email: adminEmail.toLowerCase(),
    password,
    role: 'clinic_admin',
    createdBy: req.superAdmin?._id || null,
    createdByModel: 'SuperAdmin',
    permissions: {
      canCreateSubAdmins: true,
      canRegisterPatient: true,
      canUpdateOPDPayment: true,
      canUpdateLabPayment: true,
      canUpdateMedicalStorePayment: true,
      paymentCollectionResponsibility: {
        opd: clinic.clinicDetails.hasOPD,
        lab: clinic.clinicDetails.hasLab,
        medicalStore: clinic.clinicDetails.hasMedicalStore
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Clinic registered successfully',
    data: {
      clinic,
      admin: { id: admin._id, code: admin.code, name: admin.name, email: admin.email, role: admin.role }
    }
  });
}

module.exports = { registerClinic };
