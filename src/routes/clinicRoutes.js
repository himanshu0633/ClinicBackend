const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { registerClinic } = require('../controllers/clinicController');

router.post(
  '/register',
  upload.fields([
    { name: 'licenseUpload', maxCount: 1 },
    { name: 'ownerId', maxCount: 1 },
    { name: 'logo', maxCount: 1 }
  ]),
  registerClinic
);

module.exports = router;
