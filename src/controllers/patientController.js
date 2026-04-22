const Patient = require('../models/Patient');
const PaymentRecord = require('../models/PaymentRecord');
const ClinicAdmin = require('../models/ClinicAdmin');
const Staff = require('../models/Staff');
const { generateEntityCode } = require('../utils/codeGenerator');
const { sendEmail } = require('../utils/mailer');

async function createPatient(req, res) {
  const { name, age, gender, email, phone, address } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Patient name is required' });

  const code = await generateEntityCode(Patient, name, req.clinic.city, 'PAT');
  const patientId = `PID-${Date.now()}`;

  const patient = await Patient.create({
    clinicId: req.clinic._id,
    code,
    patientId,
    name,
    age: Number(age) || 0,
    gender: gender || 'other',
    email: email ? String(email).toLowerCase().trim() : '',
    phone: phone || '',
    address: address || '',
    registeredBy: req.user._id,
    registeredByModel: req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff'
  });

  const paymentRecord = await PaymentRecord.create({
    clinicId: req.clinic._id,
    patientId: patient._id,
    opd: { amount: req.clinic.clinicDetails.hasOPD ? Number(req.clinic.clinicDetails.consultationFee) || 0 : 0, status: 'pending', updatedAt: new Date() },
    lab: { amount: 0, status: 'pending', updatedAt: new Date() },
    medicalStore: { amount: 0, status: 'pending', updatedAt: new Date() }
  });

  if (patient.email) {
    const patientMail = await sendEmail({
      to: patient.email,
      subject: `Registration Successful - ${req.clinic.clinicName}`,
      text: [
        `Hello ${patient.name},`,
        '',
        `You are registered with ${req.clinic.clinicName}.`,
        `Patient ID: ${patient.patientId}`,
        `Clinic Code: ${req.clinic.code}`
      ].join('\n')
    });
    if (!patientMail.success && !patientMail.skipped) {
      console.warn(`Patient registration email failed for ${patient.email}: ${patientMail.error}`);
    }
  }

  const [admins, staffMembers] = await Promise.all([
    ClinicAdmin.find({ clinicId: req.clinic._id, status: 'active' }).select('email name'),
    Staff.find({ clinicId: req.clinic._id, status: 'active' }).select('email name designation')
  ]);

  const notifyRecipients = [...admins, ...staffMembers]
    .map((account) => account.email)
    .filter(Boolean);

  await Promise.all(notifyRecipients.map(async (to) => {
    const notification = await sendEmail({
      to,
      subject: `New Patient Registered - ${req.clinic.clinicName}`,
      text: [
        'A new patient has been registered.',
        `Patient Name: ${patient.name}`,
        `Patient ID: ${patient.patientId}`,
        `Registered By: ${req.user.name || 'Clinic Team'}`
      ].join('\n')
    });
    if (!notification.success && !notification.skipped) {
      console.warn(`Patient notification email failed for ${to}: ${notification.error}`);
    }
  }));

  res.status(201).json({ success: true, message: 'Patient created successfully', data: { patient, paymentRecord } });
}

async function getPatients(req, res) {
  const patients = await Patient.find({ clinicId: req.clinic._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: patients });
}

module.exports = { createPatient, getPatients };
