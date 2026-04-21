function canManageAdminCreation(req, res, next) {
  if (req.userType === 'clinic_admin') return next();
  if (req.userType === 'staff' && req.user?.permissions?.canCreateSubAdmins) return next();
  res.status(403);
  next(new Error('You do not have permission to create admin accounts'));
}

function canRegisterPatients(req, res, next) {
  if (req.userType === 'clinic_admin') return next();
  if (req.userType === 'staff' && req.user?.permissions?.canRegisterPatient) return next();
  res.status(403);
  next(new Error('You do not have permission to register patients'));
}

function canUpdatePayment(moduleName) {
  return (req, res, next) => {
    if (req.userType === 'clinic_admin') return next();

    const permissions = req.user?.permissions || {};
    const allowed = (
      (moduleName === 'opd' && permissions.canUpdateOPDPayment) ||
      (moduleName === 'lab' && permissions.canUpdateLabPayment) ||
      (moduleName === 'medical_store' && permissions.canUpdateMedicalStorePayment)
    );

    if (!allowed) {
      res.status(403);
      return next(new Error(`You do not have permission to update ${moduleName} payment`));
    }

    next();
  };
}

module.exports = { canManageAdminCreation, canRegisterPatients, canUpdatePayment };
