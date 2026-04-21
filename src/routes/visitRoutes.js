const express = require('express');
const router = express.Router();
const upload = require('../middlewares/uploadMiddleware');
const { protect, clinicAccountOnly } = require('../middlewares/authMiddleware');
const {
  bookVisit,
  getDateVisits,
  updateVisitStatus,
  updateOpdPayment,
  updateVitals,
  getVisitBySerial,
  saveConsultation,
  addTests,
  updateTestReport,
  addMedicines,
  updateMedicineBilling,
  updateCaseStatus,
  getRevisitDueList,
  getPatientTimeline,
  searchMedicineSuggestions,
  createOrUpdateTestCatalog,
  getLabQueue,
  getMedicalStoreQueue
} = require('../controllers/visitController');

router.use(protect, clinicAccountOnly);

router.post('/book', bookVisit);
router.get('/', getDateVisits);
router.get('/queue/by-serial', getVisitBySerial);
router.get('/revisits/due', getRevisitDueList);
router.get('/patient/:patientId/timeline', getPatientTimeline);

router.patch('/:visitId/status', updateVisitStatus);
router.patch('/:visitId/opd-payment', updateOpdPayment);
router.patch('/:visitId/vitals', updateVitals);

router.patch('/:visitId/consultation', saveConsultation);
router.post('/:visitId/tests', addTests);
router.patch('/:visitId/tests/:testId/report', upload.single('reportFile'), updateTestReport);

router.post('/:visitId/medicines', addMedicines);
router.patch('/:visitId/medicines/:medicineId/billing', updateMedicineBilling);
router.patch('/:visitId/case-status', updateCaseStatus);

router.get('/master/medicines/suggest', searchMedicineSuggestions);
router.post('/master/tests', createOrUpdateTestCatalog);

router.get('/queues/lab', getLabQueue);
router.get('/queues/medical-store', getMedicalStoreQueue);

module.exports = router;
