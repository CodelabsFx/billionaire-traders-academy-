const crypto = require('crypto');

const PASSWORD_MIN_LENGTH = 12;

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}

function validatePassword(password) {
    const value = String(password || '');
    if (value.length < PASSWORD_MIN_LENGTH) return 'Password must be at least 12 characters';
    if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter';
    if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter';
    if (!/\d/.test(value)) return 'Password must include a number';
    if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include a special character';
    return null;
}

function createRefreshToken() {
    return crypto.randomBytes(48).toString('base64url');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { normalizeEmail, normalizeUsername, validatePassword, createRefreshToken, hashToken, PASSWORD_MIN_LENGTH };
