const express = require('express');
const router = express.Router();
const { loginClinicAccount, createSubAdmin, createStaff, listAccounts } = require('../controllers/clinicAdminController');
const { protect, clinicAccountOnly } = require('../middlewares/authMiddleware');
const { canManageAdminCreation } = require('../middlewares/permissionMiddleware');

router.post('/login', loginClinicAccount);
router.post('/admins', protect, clinicAccountOnly, canManageAdminCreation, createSubAdmin);
router.post('/staff', protect, clinicAccountOnly, canManageAdminCreation, createStaff);
router.get('/accounts', protect, clinicAccountOnly, listAccounts);

module.exports = router;
