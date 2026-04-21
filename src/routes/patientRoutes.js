const express = require('express');
const router = express.Router();
const { createPatient, getPatients } = require('../controllers/patientController');
const { protect, clinicAccountOnly } = require('../middlewares/authMiddleware');
const { canRegisterPatients } = require('../middlewares/permissionMiddleware');

router.post('/', protect, clinicAccountOnly, canRegisterPatients, createPatient);
router.get('/', protect, clinicAccountOnly, getPatients);

module.exports = router;
