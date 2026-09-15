const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

function generateBillViewToken(bookingId) {
  if (!bookingId) return null;
  // Return the raw booking ID to make the SMS link as short as possible
  return String(bookingId);
}

function getPublicFrontendBase() {
  return (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    'https://maggi-tools.netlify.app'
  ).replace(/\/$/, '');
}

function generateBillViewUrl(bookingId) {
  const token = generateBillViewToken(bookingId);
  if (!token) return '';
  return `${getPublicFrontendBase()}/bill/${encodeURIComponent(token)}`;
}

function verifyBillViewToken(token) {
  if (!token) throw new Error('Invalid bill token');
  const clean = String(token).trim();
  if (!clean) throw new Error('Invalid bill token');

  // 1. Direct MongoDB 24-char hex ObjectId
  if (clean.length === 24 && /^[0-9a-fA-F]{24}$/.test(clean)) {
    return { bookingId: clean, type: 'bill' };
  }

  // 2. Try verifying as JWT
  try {
    const decoded = jwt.verify(clean, JWT_SECRET);
    if (decoded && (decoded.bookingId || decoded.id)) {
      return { bookingId: decoded.bookingId || decoded.id, type: 'bill' };
    }
  } catch (_err) {
    // 3. If JWT verification failed (e.g. expired token), decode payload directly
    try {
      const decoded = jwt.decode(clean);
      if (decoded && (decoded.bookingId || decoded.id)) {
        return { bookingId: decoded.bookingId || decoded.id, type: 'bill' };
      }
    } catch (_decodeErr) {
      // ignore
    }
  }

  // 4. Return as raw identifier (e.g. invoiceNo or custom id)
  return { bookingId: clean, type: 'bill' };
}

module.exports = {
  generateBillViewUrl,
  verifyBillViewToken,
  getPublicFrontendBase
};

