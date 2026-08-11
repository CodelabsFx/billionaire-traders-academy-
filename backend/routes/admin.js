const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

function ensureAdmin(req, res, next) {
    if (req.user && ['super_admin', 'admin', 'support'].includes(req.user.role || (req.user.is_admin ? 'admin' : 'user'))) return next();
    return res.status(403).json({ error: 'Forbidden: admin only' });
}

router.get('/users', auth, ensureAdmin, async (req, res, next) => {
    try {
        const search = String(req.query.search || '').trim();
        const values = [];
        let where = '';
        if (search) {
            where = 'WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?';
            values.push(...Array(4).fill(`%${search}%`));
        }
        const [rows] = await pool.execute(
            `SELECT id, first_name, last_name, email, username, role, is_admin, account_type, is_active, created_at
             FROM users ${where} ORDER BY created_at DESC LIMIT 250`,
            values
        );
        res.json({ users: rows });
    } catch (err) {
        next(err);
    }
});

router.get('/overview', auth, ensureAdmin, async (req, res, next) => {
    try {
        const [[users]] = await pool.query('SELECT COUNT(*) AS total FROM users');
        const [[activeUsers]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE is_active = 1');
        const [[courses]] = await pool.query('SELECT COUNT(*) AS total FROM courses');
        const [[publishedCourses]] = await pool.query('SELECT COUNT(*) AS total FROM courses WHERE is_published = 1');
        const [[lessons]] = await pool.query('SELECT COUNT(*) AS total FROM lessons');
        const [[enrollments]] = await pool.query('SELECT COUNT(*) AS total FROM enrollments');
        res.json({
            metrics: {
                users: users.total,
                activeUsers: activeUsers.total,
                courses: courses.total,
                publishedCourses: publishedCourses.total,
                lessons: lessons.total,
                enrollments: enrollments.total
            }
        });

    } catch (err) {
        next(err);
    }
});

router.get('/analytics/activity', auth, ensureAdmin, async (req, res, next) => {
    try {
        const days = Math.min(Math.max(parseInt(req.query.days || '30', 10), 1), 90);
        const [events] = await pool.execute(
            `SELECT activity_type AS event, COUNT(*) AS total
             FROM activity_log
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
             GROUP BY activity_type ORDER BY total DESC`
        );
        const [daily] = await pool.execute(
            `SELECT DATE(created_at) AS day, COUNT(*) AS total, COUNT(DISTINCT user_id) AS active_users
             FROM activity_log
             WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
             GROUP BY DATE(created_at) ORDER BY day ASC`
        );
        res.json({ days, events, daily });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
