function sanitize(value = '') {
  return String(value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

async function generateEntityCode(Model, name, city, prefix) {
  const namePart = sanitize(name).slice(0, 4) || 'XXXX';
  const cityPart = sanitize(city).slice(0, 3) || 'CTY';
  const base = `${prefix}-${namePart}${cityPart}`;
  const count = await Model.countDocuments({ code: { $regex: `^${base}` } });
  const suffix = String(count + 1).padStart(3, '0');
  return `${base}-${suffix}`;
}

module.exports = { generateEntityCode };
