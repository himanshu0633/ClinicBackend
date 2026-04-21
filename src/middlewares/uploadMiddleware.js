const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '..', 'uploads', 'clinics');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${base}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExt = /jpg|jpeg|png|pdf/;
  const ext = allowedExt.test(path.extname(file.originalname).toLowerCase());
  const mime = /image\/jpeg|image\/jpg|image\/png|application\/pdf/.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only jpg, jpeg, png, pdf files are allowed'));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});
