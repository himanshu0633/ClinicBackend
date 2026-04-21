const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const Clinic = require('../models/Clinic');
const ClinicAdmin = require('../models/ClinicAdmin');
const Staff = require('../models/Staff');

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401);
      throw new Error('Not authorized, token missing');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.auth = decoded;

    if (decoded.accountType === 'super_admin') {
      const superAdmin = await SuperAdmin.findById(decoded.id).select('-password');
      if (!superAdmin || superAdmin.status !== 'active') {
        res.status(401);
        throw new Error('Super admin account inactive');
      }
      req.superAdmin = superAdmin;
      req.userType = 'super_admin';
      return next();
    }

    let user = null;
    if (decoded.accountType === 'clinic_admin') {
      user = await ClinicAdmin.findById(decoded.id).select('-password');
    } else if (decoded.accountType === 'staff') {
      user = await Staff.findById(decoded.id).select('-password');
    }

    if (!user) {
      res.status(401);
      throw new Error('User not found');
    }

    if (user.status !== 'active') {
      res.status(403);
      throw new Error('Your account is inactive');
    }

    const clinic = await Clinic.findById(user.clinicId);
    if (!clinic) {
      res.status(404);
      throw new Error('Clinic not found');
    }

    const now = new Date();
    if (clinic.status !== 'active' || clinic.isLoginBlocked || (clinic.deactivateOn && now > clinic.deactivateOn)) {
      res.status(403);
      throw new Error('Clinic is inactive or expired. Login blocked.');
    }

    req.clinic = clinic;
    req.user = user;
    req.userType = decoded.accountType;
    next();
  } catch (error) {
    next(error);
  }
}

function superAdminOnly(req, res, next) {
  if (req.userType !== 'super_admin') {
    res.status(403);
    return next(new Error('Only super admin can access this route'));
  }
  next();
}

function clinicAccountOnly(req, res, next) {
  if (!['clinic_admin', 'staff'].includes(req.userType)) {
    res.status(403);
    return next(new Error('Only clinic users can access this route'));
  }
  next();
}

module.exports = { protect, superAdminOnly, clinicAccountOnly };
