const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const superAdminRoutes = require('./routes/superAdminRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const clinicAdminRoutes = require('./routes/clinicAdminRoutes');
const patientRoutes = require('./routes/patientRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const visitRoutes = require('./routes/visitRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Clinic backend API is working' });
});

app.use('/api/super-admin', superAdminRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/clinic-admin', clinicAdminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/visits', visitRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
