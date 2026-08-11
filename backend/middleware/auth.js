const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const pool = require('../config/database');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev_secret_changeme');

module.exports = async function (req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        if (!JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET is not configured' });
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.sid) return res.status(401).json({ error: 'Session is no longer valid' });
        const [sessions] = await pool.execute(
            `SELECT id FROM user_sessions
             WHERE id = ? AND user_id = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
            [decoded.sid, decoded.id]
        );
        if (!sessions.length) return res.status(401).json({ error: 'Session is no longer valid' });
        await pool.execute('UPDATE user_sessions SET last_seen_at = NOW() WHERE id = ?', [decoded.sid]);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
