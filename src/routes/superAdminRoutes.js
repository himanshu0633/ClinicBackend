const express = require('express');
const router = express.Router();
const { loginSuperAdmin, getDashboard, getClinics, getClinicById, updateClinicStatus } = require('../controllers/superAdminController');
const { protect, superAdminOnly } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const { registerClinic } = require('../controllers/clinicController');

router.post('/login', loginSuperAdmin);
router.get('/dashboard', protect, superAdminOnly, getDashboard);
router.get('/clinics', protect, superAdminOnly, getClinics);
router.get('/clinics/:id', protect, superAdminOnly, getClinicById);
router.patch('/clinics/:id/status', protect, superAdminOnly, updateClinicStatus);
router.post(
  '/clinics/register',
  protect,
  superAdminOnly,
  upload.fields([
    { name: 'licenseUpload', maxCount: 1 },
    { name: 'ownerId', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
  ]),
  registerClinic
);

module.exports = router;
