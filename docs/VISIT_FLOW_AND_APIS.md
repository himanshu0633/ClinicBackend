# Visit Management Flow + APIs (MongoDB)

## End-to-end Flow
1. **Patient register** (self/clinic).
2. **Visit book date-wise** and serial number generated automatically for that date.
3. **Reception/OPD** updates arrival, OPD payment status, BP/Temp/Weight.
4. **Doctor** opens patient by date + serial number and writes consultation details.
5. Doctor can add:
   - **Tests** (fee auto-fill from test catalog)
   - **Medicines** (auto-suggest from medicine master; new medicine auto-saved)
6. If clinic has `hasLab=true`, lab staff checks pending tests and uploads reports.
7. If clinic has `hasMedicalStore=true`, medical store staff updates medicine bill and payment status.
8. Doctor marks case as `in_progress` or `completed`.
9. Follow-up/revisit date is auto-calculated from medicine days and shown in revisit due list.
10. On revisit booking, previous in-progress visit is linked and visible.

---

## API List

### Visit Booking & Queue
- `POST /api/visits/book`
  - Books date-wise visit and creates serial number.
- `GET /api/visits?date=YYYY-MM-DD`
  - Shows all visits for selected date (with serial order).
- `GET /api/visits/queue/by-serial?date=YYYY-MM-DD&serialNo=1`
  - Fetches patient visit by date and serial number.
- `PATCH /api/visits/:visitId/status`
  - Updates visit status (`booked/arrived/with_doctor/done/cancelled`).

### OPD Desk
- `PATCH /api/visits/:visitId/opd-payment`
  - Updates OPD payment status/amount and audit actor.
- `PATCH /api/visits/:visitId/vitals`
  - Updates BP, temperature, weight.

### Doctor Consultation
- `PATCH /api/visits/:visitId/consultation`
  - Sets diagnosis title/description/parhej, medicine days, follow-up date.
- `PATCH /api/visits/:visitId/case-status`
  - Marks `in_progress` or `completed`.

### Tests / Lab
- `POST /api/visits/:visitId/tests`
  - Adds test list; fee auto-fills from test catalog.
- `PATCH /api/visits/:visitId/tests/:testId/report` (multipart/form-data)
  - Upload test report file and update test status.
- `GET /api/visits/queues/lab?date=YYYY-MM-DD`
  - Lab work queue for pending/processing/ready test entries.
- `POST /api/visits/master/tests`
  - Create/update test master and default fee.

### Medicines / Medical Store
- `POST /api/visits/:visitId/medicines`
  - Adds medicines with timing/frequency/days/start-end date.
  - New medicine auto-saves to medicine master for future suggestion.
- `PATCH /api/visits/:visitId/medicines/:medicineId/billing`
  - Updates unit price, quantity, total, payment status.
- `GET /api/visits/master/medicines/suggest?q=par`
  - Auto-suggest medicines.
- `GET /api/visits/queues/medical-store?date=YYYY-MM-DD`
  - Medical store pending queue.

### Revisit & Patient Timeline
- `GET /api/visits/revisits/due?date=YYYY-MM-DD`
  - Date-wise revisit due list for in-progress cases.
- `GET /api/visits/patient/:patientId/timeline`
  - Full timeline for patient with active case(s).

---

## Request/Response Notes
- All APIs need `Authorization: Bearer <token>`.
- APIs are clinic-scoped and only return current clinic data.
- Dates are normalized in UTC midnight for day-wise grouping.
- Serial number is generated as: `count(visits on date) + 1`.

## Key MongoDB Collections
- `patients`
- `visits`
- `testcatalogs`
- `medicinemasters`

