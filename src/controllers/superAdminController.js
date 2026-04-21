const SuperAdmin = require('../models/SuperAdmin');
const Clinic = require('../models/Clinic');
const ClinicAdmin = require('../models/ClinicAdmin');
const Staff = require('../models/Staff');
const Patient = require('../models/Patient');
const generateToken = require('../utils/generateToken');

async function loginSuperAdmin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const superAdmin = await SuperAdmin.findOne({ email: email.toLowerCase() });
  if (!superAdmin || !(await superAdmin.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  if (superAdmin.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Super admin account inactive' });
  }

  res.json({
    success: true,
    message: 'Super admin login successful',
    token: generateToken({ id: superAdmin._id, accountType: 'super_admin' }),
    data: { id: superAdmin._id, name: superAdmin.name, email: superAdmin.email }
  });
}

async function getDashboard(req, res) {
  const [totalClinics, activeClinics, suspendedClinics, totalAdmins, totalStaff, totalPatients] = await Promise.all([
    Clinic.countDocuments(),
    Clinic.countDocuments({ status: 'active', isLoginBlocked: false }),
    Clinic.countDocuments({ $or: [{ status: 'suspended' }, { isLoginBlocked: true }] }),
    ClinicAdmin.countDocuments(),
    Staff.countDocuments(),
    Patient.countDocuments()
  ]);

  res.json({
    success: true,
    data: { totalClinics, activeClinics, suspendedClinics, totalAdmins, totalStaff, totalPatients }
  });
}

async function getClinics(req, res) {
  const clinics = await Clinic.find().sort({ createdAt: -1 });
  const enriched = await Promise.all(clinics.map(async (clinic) => ({
    ...clinic.toObject(),
    totalAdmins: await ClinicAdmin.countDocuments({ clinicId: clinic._id }),
    totalStaff: await Staff.countDocuments({ clinicId: clinic._id }),
    totalPatients: await Patient.countDocuments({ clinicId: clinic._id })
  })));
  res.json({ success: true, data: enriched });
}

async function getClinicById(req, res) {
  const clinic = await Clinic.findById(req.params.id);
  if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });

  const [admins, staff, patients] = await Promise.all([
    ClinicAdmin.find({ clinicId: clinic._id }).select('-password'),
    Staff.find({ clinicId: clinic._id }).select('-password'),
    Patient.find({ clinicId: clinic._id })
  ]);

  res.json({ success: true, data: { clinic, admins, staff, patients } });
}

async function updateClinicStatus(req, res) {
  const { status, deactivateOn, isLoginBlocked } = req.body;
  const clinic = await Clinic.findById(req.params.id);
  if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });

  if (status) clinic.status = status;
  if (typeof isLoginBlocked === 'boolean') clinic.isLoginBlocked = isLoginBlocked;
  if (deactivateOn !== undefined) clinic.deactivateOn = deactivateOn || null;

  await clinic.save();

  if (clinic.status !== 'active' || clinic.isLoginBlocked) {
    await Promise.all([
      ClinicAdmin.updateMany({ clinicId: clinic._id }, { status: 'inactive' }),
      Staff.updateMany({ clinicId: clinic._id }, { status: 'inactive' })
    ]);
  }

  if (clinic.status === 'active' && !clinic.isLoginBlocked) {
    await Promise.all([
      ClinicAdmin.updateMany({ clinicId: clinic._id }, { status: 'active' }),
      Staff.updateMany({ clinicId: clinic._id }, { status: 'active' })
    ]);
  }

  res.json({ success: true, message: 'Clinic status updated successfully', data: clinic });
}

module.exports = { loginSuperAdmin, getDashboard, getClinics, getClinicById, updateClinicStatus };
