const express = require('express');
const router = express.Router();
const { updateModulePayment, getPatientPayments } = require('../controllers/paymentController');
const { protect, clinicAccountOnly } = require('../middlewares/authMiddleware');
const { canUpdatePayment } = require('../middlewares/permissionMiddleware');

router.patch('/opd', protect, clinicAccountOnly, canUpdatePayment('opd'), (req, res, next) => {
  req.params.moduleName = 'opd';
  next();
}, updateModulePayment);

router.patch('/lab', protect, clinicAccountOnly, canUpdatePayment('lab'), (req, res, next) => {
  req.params.moduleName = 'lab';
  next();
}, updateModulePayment);

router.patch('/medical-store', protect, clinicAccountOnly, canUpdatePayment('medical_store'), (req, res, next) => {
  req.params.moduleName = 'medical_store';
  next();
}, updateModulePayment);

router.get('/patient/:patientId', protect, clinicAccountOnly, getPatientPayments);

module.exports = router;
