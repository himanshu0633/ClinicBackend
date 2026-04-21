require('dotenv').config();
const connectDB = require('../config/db');
const SuperAdmin = require('../models/SuperAdmin');

(async () => {
  await connectDB();

  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@clinicapp.com').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

  const existing = await SuperAdmin.findOne({ email });
  if (existing) {
    console.log('Super admin already exists');
    process.exit(0);
  }

  await SuperAdmin.create({
    name: 'Super Admin',
    email,
    password,
    status: 'active'
  });

  console.log('Super admin seeded successfully');
  process.exit(0);
})();
