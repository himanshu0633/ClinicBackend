const PaymentRecord = require('../models/PaymentRecord');
const PaymentAuditLog = require('../models/PaymentAuditLog');
const Patient = require('../models/Patient');

async function updateModulePayment(req, res) {
  const { patientId, status, amount, note } = req.body;
  const moduleName = req.params.moduleName;

  if (!['opd', 'lab', 'medical_store'].includes(moduleName)) {
    return res.status(400).json({ success: false, message: 'Invalid module name' });
  }

  const patient = await Patient.findOne({ _id: patientId, clinicId: req.clinic._id });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  const paymentRecord = await PaymentRecord.findOne({ patientId: patient._id, clinicId: req.clinic._id });
  if (!paymentRecord) return res.status(404).json({ success: false, message: 'Payment record not found' });

  const fieldKey = moduleName === 'medical_store' ? 'medicalStore' : moduleName;
  const previous = paymentRecord[fieldKey];
  paymentRecord[fieldKey] = {
    amount: amount !== undefined ? Number(amount) : previous.amount,
    status: status || previous.status,
    updatedAt: new Date()
  };
  await paymentRecord.save();

  await PaymentAuditLog.create({
    clinicId: req.clinic._id,
    patientId: patient._id,
    paymentRecordId: paymentRecord._id,
    moduleName,
    oldStatus: previous.status,
    newStatus: paymentRecord[fieldKey].status,
    oldAmount: previous.amount,
    newAmount: paymentRecord[fieldKey].amount,
    changedBy: req.user._id,
    changedByModel: req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff',
    changedByName: req.user.name,
    note: note || ''
  });

  res.json({ success: true, message: `${moduleName} payment updated successfully`, data: paymentRecord });
}

async function getPatientPayments(req, res) {
  const patient = await Patient.findOne({ _id: req.params.patientId, clinicId: req.clinic._id });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  const [paymentRecord, auditLogs] = await Promise.all([
    PaymentRecord.findOne({ clinicId: req.clinic._id, patientId: patient._id }),
    PaymentAuditLog.find({ clinicId: req.clinic._id, patientId: patient._id }).sort({ createdAt: -1 })
  ]);

  res.json({ success: true, data: { patient, paymentRecord, auditLogs } });
}

module.exports = { updateModulePayment, getPatientPayments };
