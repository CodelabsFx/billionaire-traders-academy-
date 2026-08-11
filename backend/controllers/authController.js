const crypto = require('crypto');
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { normalizeEmail, normalizeUsername, validatePassword, createRefreshToken, hashToken } = require('../utils/security');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev_secret_changeme');
const ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || '15m';
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);

function clientMetadata(req) {
    return { ip: req.ip || null, userAgent: String(req.get('user-agent') || '').slice(0, 500) || null };
}

async function createSession(user, req) {
    if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    const sessionId = crypto.randomUUID();
    const refreshToken = createRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_DAYS * 86400000);
    const payload = { id: user.id, role: user.role || 'user', is_admin: !!user.is_admin, sid: sessionId };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRE });
    const metadata = clientMetadata(req);
    await pool.execute(
        `INSERT INTO user_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, user.id, hashToken(refreshToken), metadata.userAgent, metadata.ip, expiresAt]
    );
    return { accessToken, refreshToken, expiresAt };
}

function safeUser(user) {
    return { id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, username: user.username, role: user.role || 'user' };
}

async function register(req, res, next) {
    try {
        const { first_name, last_name, password, phone, country_code, trading_experience } = req.body;
        const email = normalizeEmail(req.body.email);
        const username = normalizeUsername(req.body.username);
        if (!first_name || !last_name || !email || !username || !password) return res.status(400).json({ error: 'All required fields must be provided' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
        if (!/^[a-z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-30 characters using letters, numbers, or underscores' });
        const passwordError = validatePassword(password);
        if (passwordError) return res.status(400).json({ error: passwordError });
        const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1', [email, username]);
        if (existing.length) return res.status(409).json({ error: 'Email or username already exists' });
        const passwordHash = await bcrypt.hash(password, 12);
        const [result] = await pool.execute(
            `INSERT INTO users (first_name, last_name, email, username, password_hash, password_changed_at, phone, country_code, trading_experience)
             VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
            [String(first_name).trim(), String(last_name).trim(), email, username, passwordHash, phone || null, country_code || null, trading_experience || null]
        );
        const user = { id: result.insertId, first_name, last_name, email, username, role: 'user', is_admin: 0 };
        const session = await createSession(user, req);
        req.user = user;
        await pool.execute('INSERT INTO activity_log (user_id, activity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [user.id, 'register', 'Account created', clientMetadata(req).ip, clientMetadata(req).userAgent]);
        res.status(201).json({ token: session.accessToken, accessToken: session.accessToken, refreshToken: session.refreshToken, user: safeUser(user) });
    } catch (err) { next(err); }
}

async function login(req, res, next) {
    try {
        const identifier = String(req.body.identifier || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        if (!identifier || !password) return res.status(400).json({ error: 'Email/username and password are required' });
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1', [identifier, identifier]);
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.is_active) return res.status(403).json({ error: 'This account is inactive' });
        if (user.locked_until && new Date(user.locked_until) > new Date()) return res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            const attempts = Number(user.failed_login_attempts || 0) + 1;
            await pool.execute('UPDATE users SET failed_login_attempts = ?, locked_until = CASE WHEN ? >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE locked_until END WHERE id = ?', [attempts, attempts, user.id]);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        await pool.execute('UPDATE users SET last_login = NOW(), failed_login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);
        const session = await createSession(user, req);
        await pool.execute('INSERT INTO activity_log (user_id, activity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
            [user.id, 'login', 'Successful login', clientMetadata(req).ip, clientMetadata(req).userAgent]);
        res.json({ token: session.accessToken, accessToken: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt, user: safeUser(user) });
    } catch (err) { next(err); }
}

async function refresh(req, res, next) {
    try {
        const token = String(req.body.refreshToken || '');
        if (!token) return res.status(401).json({ error: 'Refresh token is required' });
        const [rows] = await pool.execute(
            `SELECT s.*, u.id, u.role, u.is_admin FROM user_sessions s JOIN users u ON u.id = s.user_id
             WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW() LIMIT 1`,
            [hashToken(token)]
        );
        if (!rows.length) return res.status(401).json({ error: 'Invalid or expired session' });
        await pool.execute('UPDATE user_sessions SET revoked_at = NOW() WHERE id = ?', [rows[0].id]);
        const session = await createSession(rows[0], req);
        res.json({ accessToken: session.accessToken, token: session.accessToken, refreshToken: session.refreshToken, expiresAt: session.expiresAt });
    } catch (err) { next(err); }
}

async function logout(req, res, next) {
    try {
        if (req.user && req.user.sid) await pool.execute('UPDATE user_sessions SET revoked_at = NOW() WHERE id = ?', [req.user.sid]);
        const refreshToken = req.body && req.body.refreshToken;
        if (refreshToken) await pool.execute('UPDATE user_sessions SET revoked_at = NOW() WHERE token_hash = ?', [hashToken(refreshToken)]);
        res.json({ ok: true });
    } catch (err) { next(err); }
}

async function me(req, res, next) {
    try {
        const [rows] = await pool.execute('SELECT id, first_name, last_name, email, username, role, is_admin, account_type, last_login FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (!rows.length) return res.status(404).json({ error: 'User not found' });
        res.json({ user: rows[0] });
    } catch (err) { next(err); }
}

module.exports = { register, login, refresh, logout, me };
