const Patient = require('../models/Patient');
const Visit = require('../models/Visit');
const Staff = require('../models/Staff');
const TestCatalog = require('../models/TestCatalog');
const MedicineMaster = require('../models/MedicineMaster');

function parseVisitDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function getDayRange(dateValue) {
  const start = parseVisitDate(dateValue);
  if (!start) return null;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function bookVisit(req, res) {
  const { patientId, visitDate, doctorId, bookingSource = 'clinic', visitType = 'new' } = req.body;
  if (!patientId || !visitDate) {
    return res.status(400).json({ success: false, message: 'patientId and visitDate are required' });
  }

  const patient = await Patient.findOne({ _id: patientId, clinicId: req.clinic._id });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  const range = getDayRange(visitDate);
  if (!range) return res.status(400).json({ success: false, message: 'Invalid visitDate' });

  const existingCount = await Visit.countDocuments({
    clinicId: req.clinic._id,
    visitDate: { $gte: range.start, $lt: range.end }
  });

  let previousOpenVisitId = null;
  if (visitType === 'revisit') {
    const previousOpenVisit = await Visit.findOne({
      clinicId: req.clinic._id,
      patientId: patient._id,
      'consultation.caseStatus': 'in_progress'
    }).sort({ visitDate: -1 });
    previousOpenVisitId = previousOpenVisit?._id || null;
  }

  let selectedDoctor = null;
  if (doctorId) {
    selectedDoctor = await Staff.findOne({
      _id: doctorId,
      clinicId: req.clinic._id,
      designation: 'doctor',
      status: 'active'
    });
    if (!selectedDoctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
  }

  const visit = await Visit.create({
    clinicId: req.clinic._id,
    patientId: patient._id,
    visitDate: range.start,
    serialNo: existingCount + 1,
    bookingSource,
    visitType,
    bookedBy: req.user._id,
    bookedByModel: req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff',
    opdPayment: {
      amount: selectedDoctor ? (Number(selectedDoctor.consultationFee) || 0) : (Number(req.clinic?.clinicDetails?.consultationFee) || 0),
      status: 'pending'
    },
    consultation: selectedDoctor ? {
      doctor: selectedDoctor._id,
      doctorName: selectedDoctor.name
    } : undefined,
    previousOpenVisitId
  });

  res.status(201).json({ success: true, message: 'Visit booked successfully', data: visit });
}

async function getDateVisits(req, res) {
  const date = req.query.date;
  if (!date) return res.status(400).json({ success: false, message: 'date query is required' });

  const range = getDayRange(date);
  if (!range) return res.status(400).json({ success: false, message: 'Invalid date' });

  const visits = await Visit.find({
    clinicId: req.clinic._id,
    visitDate: { $gte: range.start, $lt: range.end }
  })
    .populate('patientId', 'name age gender phone patientId code')
    .sort({ serialNo: 1 });

  res.json({ success: true, data: visits });
}

async function updateVisitStatus(req, res) {
  const { status } = req.body;
  const allowed = ['booked', 'arrived', 'with_doctor', 'done', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const visit = await Visit.findOneAndUpdate(
    { _id: req.params.visitId, clinicId: req.clinic._id },
    { status },
    { new: true }
  );
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  res.json({ success: true, message: 'Visit status updated', data: visit });
}

async function updateOpdPayment(req, res) {
  const { status, amount } = req.body;

  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  visit.opdPayment.status = status || visit.opdPayment.status;
  visit.opdPayment.amount = amount !== undefined ? Number(amount) : visit.opdPayment.amount;
  visit.opdPayment.updatedBy = req.user._id;
  visit.opdPayment.updatedByModel = req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff';
  visit.opdPayment.updatedByName = req.user.name;
  visit.opdPayment.updatedAt = new Date();

  await visit.save();

  res.json({ success: true, message: 'OPD payment updated', data: visit });
}

async function updateVitals(req, res) {
  const { bp, temperature, weight } = req.body;

  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  visit.vitals.bp = bp || visit.vitals.bp;
  visit.vitals.temperature = temperature !== undefined ? Number(temperature) : visit.vitals.temperature;
  visit.vitals.weight = weight !== undefined ? Number(weight) : visit.vitals.weight;
  visit.vitals.filledBy = req.user._id;
  visit.vitals.filledByModel = req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff';
  visit.vitals.filledAt = new Date();
  await visit.save();

  res.json({ success: true, message: 'Vitals updated', data: visit });
}

async function getVisitBySerial(req, res) {
  const date = req.query.date;
  const serialNo = Number(req.query.serialNo);
  if (!date || !serialNo) {
    return res.status(400).json({ success: false, message: 'date and serialNo query are required' });
  }
  const range = getDayRange(date);
  if (!range) return res.status(400).json({ success: false, message: 'Invalid date' });

  const visit = await Visit.findOne({
    clinicId: req.clinic._id,
    visitDate: { $gte: range.start, $lt: range.end },
    serialNo
  }).populate('patientId');

  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found for serial number' });

  let previousOpenVisit = null;
  if (visit.previousOpenVisitId) {
    previousOpenVisit = await Visit.findOne({ _id: visit.previousOpenVisitId, clinicId: req.clinic._id }).populate('patientId');
  }

  res.json({ success: true, data: { visit, previousOpenVisit } });
}

async function saveConsultation(req, res) {
  const { title, description, parhej, medicineDays } = req.body;

  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  const days = Number(medicineDays) || 0;
  let followUpDate = null;
  if (days > 0) {
    followUpDate = new Date(visit.visitDate);
    followUpDate.setUTCDate(followUpDate.getUTCDate() + days);
  }

  visit.consultation.title = title || visit.consultation.title;
  visit.consultation.description = description || visit.consultation.description;
  visit.consultation.parhej = parhej || visit.consultation.parhej;
  visit.consultation.medicineDays = days;
  visit.consultation.followUpDate = followUpDate;
  visit.consultation.doctor = req.user._id;
  visit.consultation.doctorName = req.user.name || '';

  await visit.save();

  res.json({ success: true, message: 'Consultation saved', data: visit });
}

async function addTests(req, res) {
  const { tests = [] } = req.body;
  if (!Array.isArray(tests) || !tests.length) {
    return res.status(400).json({ success: false, message: 'tests array is required' });
  }

  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  const names = tests.map((item) => item.name).filter(Boolean);
  const catalogs = await TestCatalog.find({ clinicId: req.clinic._id, name: { $in: names }, isActive: true });
  const catalogMap = new Map(catalogs.map((item) => [item.name.toLowerCase(), item]));

  tests.forEach((item) => {
    const catalog = catalogMap.get(String(item.name || '').toLowerCase());
    visit.tests.push({
      name: item.name,
      fee: item.fee !== undefined ? Number(item.fee) : (catalog ? catalog.defaultFee : 0),
      status: 'pending',
      notes: item.notes || '',
      updatedBy: req.user._id,
      updatedByModel: req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff',
      updatedByName: req.user.name,
      updatedAt: new Date()
    });
  });

  await visit.save();

  res.json({ success: true, message: 'Tests added', data: visit.tests });
}

async function updateTestReport(req, res) {
  const { status, notes } = req.body;
  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  const test = visit.tests.id(req.params.testId);
  if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

  if (status) test.status = status;
  if (notes !== undefined) test.notes = notes;
  if (req.file) test.reportFile = `/uploads/clinics/${req.file.filename}`;
  test.updatedBy = req.user._id;
  test.updatedByModel = req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff';
  test.updatedByName = req.user.name;
  test.updatedAt = new Date();

  await visit.save();

  res.json({ success: true, message: 'Test report updated', data: test });
}

function buildMedicineDates(startDateValue, days) {
  const startDate = parseVisitDate(startDateValue) || parseVisitDate(new Date());
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + Math.max(days - 1, 0));
  return { startDate, endDate };
}

async function addMedicines(req, res) {
  const { medicines = [] } = req.body;
  if (!Array.isArray(medicines) || !medicines.length) {
    return res.status(400).json({ success: false, message: 'medicines array is required' });
  }

  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  for (const item of medicines) {
    const days = Number(item.days) || 1;
    const { startDate, endDate } = buildMedicineDates(item.startDate || visit.visitDate, days);

    visit.medicines.push({
      name: item.name,
      timing: item.timing || 'after_food',
      frequencyPerDay: Number(item.frequencyPerDay) || 1,
      days,
      startDate,
      endDate
    });

    if (item.name) {
      await MedicineMaster.updateOne(
        { clinicId: req.clinic._id, name: item.name },
        {
          $setOnInsert: {
            clinicId: req.clinic._id,
            name: item.name,
            createdBy: req.user._id,
            createdByModel: req.userType === 'clinic_admin' ? 'ClinicAdmin' : 'Staff'
          }
        },
        { upsert: true }
      );
    }
  }

  await visit.save();

  res.json({ success: true, message: 'Medicines added', data: visit.medicines });
}

async function updateMedicineBilling(req, res) {
  const { unitPrice, quantity, paymentStatus, storeStatus } = req.body;

  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  const medicine = visit.medicines.id(req.params.medicineId);
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

  if (unitPrice !== undefined) medicine.unitPrice = Number(unitPrice);
  if (quantity !== undefined) medicine.quantity = Number(quantity);
  medicine.total = Number(medicine.unitPrice) * Number(medicine.quantity);

  if (paymentStatus) medicine.paymentStatus = paymentStatus;
  if (storeStatus) medicine.storeStatus = storeStatus;

  await visit.save();

  res.json({ success: true, message: 'Medicine billing updated', data: medicine });
}

async function updateCaseStatus(req, res) {
  const { caseStatus } = req.body;
  if (!['in_progress', 'completed'].includes(caseStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid caseStatus' });
  }

  const visit = await Visit.findOne({ _id: req.params.visitId, clinicId: req.clinic._id });
  if (!visit) return res.status(404).json({ success: false, message: 'Visit not found' });

  visit.consultation.caseStatus = caseStatus;
  visit.consultation.completedAt = caseStatus === 'completed' ? new Date() : null;

  await visit.save();

  res.json({ success: true, message: 'Case status updated', data: visit.consultation });
}

async function getRevisitDueList(req, res) {
  const date = req.query.date;
  if (!date) return res.status(400).json({ success: false, message: 'date query is required' });

  const range = getDayRange(date);
  if (!range) return res.status(400).json({ success: false, message: 'Invalid date' });

  const visits = await Visit.find({
    clinicId: req.clinic._id,
    'consultation.caseStatus': 'in_progress',
    'consultation.followUpDate': { $gte: range.start, $lt: range.end }
  }).populate('patientId', 'name phone patientId');

  res.json({ success: true, data: visits });
}

async function getPatientTimeline(req, res) {
  const patient = await Patient.findOne({ _id: req.params.patientId, clinicId: req.clinic._id });
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  const visits = await Visit.find({ clinicId: req.clinic._id, patientId: patient._id }).sort({ visitDate: -1 });
  const activeCases = visits.filter((v) => v.consultation?.caseStatus === 'in_progress');

  res.json({ success: true, data: { patient, activeCases, visits } });
}

async function searchMedicineSuggestions(req, res) {
  const q = (req.query.q || '').trim();
  const filter = { clinicId: req.clinic._id };
  if (q) filter.name = { $regex: q, $options: 'i' };

  const medicines = await MedicineMaster.find(filter).sort({ name: 1 }).limit(20);
  res.json({ success: true, data: medicines });
}

async function createOrUpdateTestCatalog(req, res) {
  const { name, defaultFee } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'name is required' });

  const test = await TestCatalog.findOneAndUpdate(
    { clinicId: req.clinic._id, name },
    { defaultFee: Number(defaultFee) || 0, isActive: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, message: 'Test catalog saved', data: test });
}

async function getLabQueue(req, res) {
  const date = req.query.date;
  const range = date ? getDayRange(date) : null;

  const filter = {
    clinicId: req.clinic._id,
    tests: { $elemMatch: { status: { $in: ['pending', 'processing', 'ready'] } } }
  };

  if (range) filter.visitDate = { $gte: range.start, $lt: range.end };

  const visits = await Visit.find(filter).populate('patientId', 'name patientId phone').sort({ visitDate: -1, serialNo: 1 });
  res.json({ success: true, data: visits });
}

async function getMedicalStoreQueue(req, res) {
  const date = req.query.date;
  const range = date ? getDayRange(date) : null;

  const filter = {
    clinicId: req.clinic._id,
    medicines: { $elemMatch: { storeStatus: { $in: ['pending', 'processing'] } } }
  };

  if (range) filter.visitDate = { $gte: range.start, $lt: range.end };

  const visits = await Visit.find(filter).populate('patientId', 'name patientId phone').sort({ visitDate: -1, serialNo: 1 });
  res.json({ success: true, data: visits });
}

module.exports = {
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
};
