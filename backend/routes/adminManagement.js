const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const rolePermissions = {
    super_admin: ['users:read', 'users:write', 'courses:write', 'lessons:write', 'uploads:write'],
    admin: ['users:read', 'courses:write', 'lessons:write', 'uploads:write'],
    instructor: ['courses:write', 'lessons:write', 'uploads:write'],
    support: ['users:read']
};

function requirePermission(permission) {
    return (req, res, next) => {
        const role = req.user && (req.user.role || (req.user.is_admin ? 'admin' : 'user'));
        if (rolePermissions[role] && rolePermissions[role].includes(permission)) return next();
        return res.status(403).json({ error: 'Forbidden: insufficient role permissions' });
    };
}

function ensureAdmin(req, res, next) {
    if (req.user && rolePermissions[req.user.role || (req.user.is_admin ? 'admin' : 'user')]) return next();
    return res.status(403).json({ error: 'Forbidden: admin only' });
}

// Storage for uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.random().toString(36).slice(2,8) + ext;
        cb(null, name);
    }
});
const allowedTypes = new Set((process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,mp4,webm,mov,m4v')
    .split(',').map(type => type.trim().toLowerCase()).filter(Boolean));
const upload = multer({
    storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10) },
    fileFilter: (req, file, cb) => {
        const extension = path.extname(file.originalname).slice(1).toLowerCase();
        if (!allowedTypes.has(extension)) return cb(new Error('File type is not allowed'));
        const videoExtensions = new Set(['mp4', 'webm', 'mov', 'm4v']);
        if (videoExtensions.has(extension) && !file.mimetype.startsWith('video/')) {
            return cb(new Error('Uploaded video has an invalid content type'));
        }
        cb(null, true);
    }
});

// Courses CRUD
router.get('/courses', auth, requirePermission('courses:write'), async (req, res, next) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM courses ORDER BY created_at DESC LIMIT 500');
        res.json({ courses: rows });
    } catch (err) { next(err); }
});

router.post('/courses', auth, requirePermission('courses:write'), async (req, res, next) => {
    try {
        const { title, slug, description, price, is_published } = req.body;
        const [result] = await pool.execute('INSERT INTO courses (title, slug, description, price, is_published) VALUES (?, ?, ?, ?, ?)', [title, slug, description, price || 0, is_published ? 1 : 0]);
        res.json({ id: result.insertId });
    } catch (err) { next(err); }
});

router.put('/courses/:id', auth, requirePermission('courses:write'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const fields = ['title','slug','description','price','is_published'];
        const updates = [];
        const values = [];
        fields.forEach(f => { if (f in req.body) { updates.push(`${f}=?`); values.push(req.body[f]); } });
        if (!updates.length) return res.status(400).json({ error: 'No fields' });
        values.push(id);
        await pool.execute(`UPDATE courses SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.delete('/courses/:id', auth, requirePermission('courses:write'), async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM courses WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

// Lessons CRUD
router.get('/lessons', auth, requirePermission('lessons:write'), async (req, res, next) => {
    try {
        const { course_id } = req.query;
        if (course_id) {
            const [rows] = await pool.execute('SELECT * FROM lessons WHERE course_id = ? ORDER BY lesson_order ASC', [course_id]);
            return res.json({ lessons: rows });
        }
        const [rows] = await pool.execute('SELECT * FROM lessons ORDER BY created_at DESC LIMIT 500');
        res.json({ lessons: rows });
    } catch (err) { next(err); }
});

router.post('/lessons', auth, requirePermission('lessons:write'), async (req, res, next) => {
    try {
        const { course_id, title, slug, description, content, lesson_order, video_url, video_duration } = req.body;
        const [result] = await pool.execute(
            `INSERT INTO lessons (course_id, title, slug, description, content, lesson_order, video_url, video_duration)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [course_id, title, slug, description, content, lesson_order || 0, video_url || null, video_duration || null]
        );
        res.json({ id: result.insertId });
    } catch (err) { next(err); }
});

router.put('/lessons/:id', auth, requirePermission('lessons:write'), async (req, res, next) => {
    try {
        const { id } = req.params;
        const fields = ['title','slug','description','content','lesson_order','course_id','video_url','video_duration'];
        const updates = [];
        const values = [];
        fields.forEach(f => { if (f in req.body) { updates.push(`${f}=?`); values.push(req.body[f]); } });
        if (!updates.length) return res.status(400).json({ error: 'No fields' });
        values.push(id);
        await pool.execute(`UPDATE lessons SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.delete('/lessons/:id', auth, requirePermission('lessons:write'), async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.execute('DELETE FROM lessons WHERE id = ?', [id]);
        res.json({ ok: true });
    } catch (err) { next(err); }
});

// File upload for lesson resources / badges / images
router.post('/upload', auth, requirePermission('uploads:write'), upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ ok: true, filename: req.file.filename, url: fileUrl, originalname: req.file.originalname });
    } catch (err) { next(err); }
});

router.patch('/users/:id/role', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Only super administrators can change roles' });
        const allowedRoles = new Set(['user', 'super_admin', 'admin', 'instructor', 'support']);
        if (!allowedRoles.has(req.body.role)) return res.status(400).json({ error: 'Invalid role' });
        await pool.execute('UPDATE users SET role = ?, is_admin = ? WHERE id = ?', [
            req.body.role,
            req.body.role === 'super_admin' || req.body.role === 'admin' ? 1 : 0,
            req.params.id
        ]);
        res.json({ ok: true, role: req.body.role });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
