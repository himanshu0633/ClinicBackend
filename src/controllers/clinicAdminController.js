const Clinic = require('../models/Clinic');
const ClinicAdmin = require('../models/ClinicAdmin');
const Staff = require('../models/Staff');
const generateToken = require('../utils/generateToken');
const { generateEntityCode } = require('../utils/codeGenerator');

async function loginClinicAccount(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

  let account = await ClinicAdmin.findOne({ email: email.toLowerCase() });
  let accountType = 'clinic_admin';
  if (!account) {
    account = await Staff.findOne({ email: email.toLowerCase() });
    accountType = 'staff';
  }

  if (!account || !(await account.matchPassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const clinic = await Clinic.findById(account.clinicId);
  if (!clinic) return res.status(404).json({ success: false, message: 'Clinic not found' });

  const now = new Date();
  if (account.status !== 'active') return res.status(403).json({ success: false, message: 'Your account is inactive' });
  if (clinic.status !== 'active' || clinic.isLoginBlocked || (clinic.deactivateOn && now > clinic.deactivateOn)) {
    return res.status(403).json({ success: false, message: 'Clinic is inactive or expired. Login blocked.' });
  }

  res.json({
    success: true,
    message: 'Login successful',
    token: generateToken({ id: account._id, accountType }),
    data: {
      id: account._id,
      code: account.code,
      name: account.name,
      email: account.email,
      accountType,
      role: account.role || account.designation,
      clinic: { id: clinic._id, code: clinic.code, clinicName: clinic.clinicName, city: clinic.city }
    }
  });
}

async function createSubAdmin(req, res) {
  const { name, email, password, permissions = {} } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });

  const exists = await ClinicAdmin.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ success: false, message: 'Email already exists' });

  const code = await generateEntityCode(ClinicAdmin, name, req.clinic.city, 'ADM');
  const admin = await ClinicAdmin.create({
    clinicId: req.clinic._id,
    code,
    name,
    email: email.toLowerCase(),
    password,
    role: 'sub_admin',
    permissions,
    createdBy: req.user._id,
    createdByModel: req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff'
  });

  res.status(201).json({ success: true, message: 'Sub admin created successfully', data: admin });
}

async function createStaff(req, res) {
  const { name, email, password, phoneNumber, designation, consultationFee, openingHours, permissions = {} } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email and password are required' });
  if ((designation || 'other') === 'doctor' && !phoneNumber) {
    return res.status(400).json({ success: false, message: 'phoneNumber is required for doctor' });
  }

  const exists = await Staff.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(400).json({ success: false, message: 'Email already exists' });

  const code = await generateEntityCode(Staff, name, req.clinic.city, 'STF');
  const staff = await Staff.create({
    clinicId: req.clinic._id,
    code,
    name,
    email: email.toLowerCase(),
    phoneNumber: phoneNumber || '',
    password,
    designation: designation || 'other',
    consultationFee: consultationFee !== undefined ? Number(consultationFee) : 0,
    openingHours: openingHours || '',
    permissions,
    createdBy: req.user._id,
    createdByModel: req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff'
  });

  res.status(201).json({ success: true, message: 'Staff created successfully', data: staff });
}

async function listAccounts(req, res) {
  const [admins, staff] = await Promise.all([
    ClinicAdmin.find({ clinicId: req.clinic._id }).select('-password').sort({ createdAt: -1 }),
    Staff.find({ clinicId: req.clinic._id }).select('-password').sort({ createdAt: -1 })
  ]);
  res.json({ success: true, data: { admins, staff } });
}

module.exports = { loginClinicAccount, createSubAdmin, createStaff, listAccounts };
