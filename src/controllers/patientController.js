const Patient = require('../models/Patient');
const PaymentRecord = require('../models/PaymentRecord');
const { generateEntityCode } = require('../utils/codeGenerator');

async function createPatient(req, res) {
  const { name, age, gender, phone, address } = req.body;
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

  res.status(201).json({ success: true, message: 'Patient created successfully', data: { patient, paymentRecord } });
}

async function getPatients(req, res) {
  const patients = await Patient.find({ clinicId: req.clinic._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: patients });
}

module.exports = { createPatient, getPatients };
