# Clinic Management Backend

Clinic-only backend with:
- fixed super admin
- clinic registration
- clinic deactivate / auto login block
- separate models for clinic admins, staff, patients
- payment permissions by module (OPD, Lab, Medical Store)
- payment audit logs

## Setup

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Run `npm run seed:super-admin`
4. Run `npm run dev`

## Fixed Super Admin
- Email: `superadmin@clinicapp.com`
- Password: `Admin@123`

## Main APIs

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

### Payments
- `PATCH /api/payments/opd`
- `PATCH /api/payments/lab`
- `PATCH /api/payments/medical-store`
- `GET /api/payments/patient/:patientId`

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

## Permission idea
When creating staff/sub-admin, send permissions like:
```json
{
  "canCreateSubAdmins": true,
  "canRegisterPatient": true,
  "canUpdateOPDPayment": true,
  "canUpdateLabPayment": false,
  "canUpdateMedicalStorePayment": false,
  "paymentCollectionResponsibility": {
    "opd": true,
    "lab": false,
    "medicalStore": false
  }
}
```

## Notes
- Clinic login is blocked if clinic is suspended, inactive, login-blocked, or deactivate date has passed.
- Super admin can force close all logins by updating clinic status or `isLoginBlocked`.
# ClinicBackend
