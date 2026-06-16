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
    'https://maggi-tool-rentals.netlify.app'
  ).replace(/\/$/, '');
}

function generateBillViewUrl(bookingId) {
  const token = generateBillViewToken(bookingId);
  if (!token) return '';
  return `${getPublicFrontendBase()}/bill/${encodeURIComponent(token)}`;
}

function verifyBillViewToken(token) {
  if (!token) throw new Error('Invalid bill token');
  
  // Try to decode as legacy JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'bill' && decoded.bookingId) {
      return decoded;
    }
  } catch (err) {
    // If it fails to verify as JWT, check if it's a valid 24-char hex MongoDB ObjectId
    if (typeof token === 'string' && token.length === 24 && /^[0-9a-fA-F]{24}$/.test(token)) {
      return { bookingId: token, type: 'bill' };
    }
  }
  
  throw new Error('Invalid bill token');
}

module.exports = {
  generateBillViewUrl,
  verifyBillViewToken,
  getPublicFrontendBase
};
