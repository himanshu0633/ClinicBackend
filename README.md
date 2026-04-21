# Clinic Management Backend (MongoDB + Express)

This backend now supports full date-wise OPD flow:
- patient registration
- visit booking (self/clinic)
- date-wise serial queue
- OPD payment + vitals
- doctor consultation
- tests + lab report upload
- medicines + medical store billing
- revisit due tracking + case completion

## Setup
1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Run `npm run seed:super-admin`
4. Run `npm run dev`

## Fixed Super Admin
- Email: `superadmin@clinicapp.com`
- Password: `Admin@123`

## Existing APIs

### Super Admin
- `POST /api/super-admin/login`
- `GET /api/super-admin/dashboard`
- `GET /api/super-admin/clinics`
- `GET /api/super-admin/clinics/:id`
- `PATCH /api/super-admin/clinics/:id/status`
- `POST /api/super-admin/clinics/register`

### Clinic Accounts
- `POST /api/clinic-admin/login`
- `POST /api/clinic-admin/admins`
- `POST /api/clinic-admin/staff`
- `GET /api/clinic-admin/accounts`

### Patients
- `POST /api/patients`
- `GET /api/patients`

### Payments (legacy module)
- `PATCH /api/payments/opd`
- `PATCH /api/payments/lab`
- `PATCH /api/payments/medical-store`
- `GET /api/payments/patient/:patientId`

## New Visit Flow APIs
All detailed docs are in:
- `docs/VISIT_FLOW_AND_APIS.md`

Postman collection:
- `docs/postman/Clinic-Visit-Flow.postman_collection.json`

## Registration fields
Common clinic fields:
- clinicName
- ownerName
- email
- phoneNumber
- registrationNumber
- address
- country
- state
- city
- fullAddress
- pincode
- adminName
- adminEmail
- password
- subscriptionPlan
- deactivateOn

Clinic-specific fields:
- clinicType
- doctorCount
- staffCount
- consultationFee
- openingHours
- hasOPD
- hasLab
- hasMedicalStore

Files:
- licenseUpload
- ownerId
- logo
