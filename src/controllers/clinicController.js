const Clinic = require('../models/Clinic');
const ClinicAdmin = require('../models/ClinicAdmin');
const Staff = require('../models/Staff');
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
    doctors,
    consultationFeeSameForAllDoctors,
    openingHoursSameForAllDoctors,
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

  const parsedDoctorCount = Number(doctorCount) || 0;
  let doctorEntries = [];
  if (doctors) {
    if (Array.isArray(doctors)) {
      doctorEntries = doctors;
    } else if (typeof doctors === 'string') {
      try {
        doctorEntries = JSON.parse(doctors);
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Invalid doctors format. Use valid JSON array' });
      }
    }
  }

  if (parsedDoctorCount > 0) {
    if (!Array.isArray(doctorEntries) || doctorEntries.length !== parsedDoctorCount) {
      return res.status(400).json({
        success: false,
        message: `doctors array with exactly ${parsedDoctorCount} entries is required`
      });
    }
  }

  const isConsultationFeeSame = consultationFeeSameForAllDoctors === 'true' || consultationFeeSameForAllDoctors === true;
  const isOpeningHoursSame = openingHoursSameForAllDoctors === 'true' || openingHoursSameForAllDoctors === true;

  const normalizedDoctors = [];
  for (const doctor of doctorEntries) {
    const doctorName = String(doctor?.name || '').trim();
    const doctorEmail = String(doctor?.email || '').trim().toLowerCase();
    const doctorPassword = String(doctor?.password || '').trim();
    const doctorPhoneNumber = String(doctor?.phoneNumber || '').trim();

    if (!doctorName || !doctorEmail || !doctorPhoneNumber || !doctorPassword) {
      return res.status(400).json({
        success: false,
        message: 'Each doctor must include name, email, phoneNumber and password'
      });
    }

    const emailExists = await Promise.all([
      ClinicAdmin.findOne({ email: doctorEmail }),
      Staff.findOne({ email: doctorEmail })
    ]);
    if (emailExists[0] || emailExists[1]) {
      return res.status(400).json({ success: false, message: `Doctor email already exists: ${doctorEmail}` });
    }

    const doctorConsultationFee = isConsultationFeeSame
      ? Number(consultationFee) || 0
      : Number(doctor?.consultationFee);
    const doctorOpeningHours = isOpeningHoursSame
      ? (openingHours || '').trim()
      : String(doctor?.openingHours || '').trim();

    if (!isConsultationFeeSame && Number.isNaN(doctorConsultationFee)) {
      return res.status(400).json({
        success: false,
        message: `consultationFee is required for doctor ${doctorName}`
      });
    }
    if (!isOpeningHoursSame && !doctorOpeningHours) {
      return res.status(400).json({
        success: false,
        message: `openingHours is required for doctor ${doctorName}`
      });
    }

    normalizedDoctors.push({
      name: doctorName,
      email: doctorEmail,
      phoneNumber: doctorPhoneNumber,
      password: doctorPassword,
      consultationFee: doctorConsultationFee,
      openingHours: doctorOpeningHours
    });
  }

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
      doctorCount: parsedDoctorCount,
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

  const createdDoctors = [];
  for (const doctor of normalizedDoctors) {
    const doctorCode = await generateEntityCode(Staff, doctor.name, city, 'DOC');
    const savedDoctor = await Staff.create({
      clinicId: clinic._id,
      code: doctorCode,
      name: doctor.name,
      email: doctor.email,
      phoneNumber: doctor.phoneNumber,
      password: doctor.password,
      designation: 'doctor',
      consultationFee: doctor.consultationFee,
      openingHours: doctor.openingHours,
      createdBy: admin._id,
      createdByModel: 'ClinicAdmin'
    });
    createdDoctors.push({
      id: savedDoctor._id,
      code: savedDoctor.code,
      name: savedDoctor.name,
      email: savedDoctor.email,
      phoneNumber: savedDoctor.phoneNumber,
      consultationFee: savedDoctor.consultationFee,
      openingHours: savedDoctor.openingHours
    });
  }

  res.status(201).json({
    success: true,
    message: 'Clinic registered successfully',
    data: {
      clinic,
      admin: { id: admin._id, code: admin.code, name: admin.name, email: admin.email, role: admin.role },
      doctors: createdDoctors
    }
  });
}

module.exports = { registerClinic };
