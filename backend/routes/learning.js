const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/courses', async (req, res, next) => {
    try {
        const { level, category, search } = req.query;
        const clauses = ['is_published = 1'];
        const values = [];
        if (level) {
            clauses.push('level = ?');
            values.push(level);
        }
        if (category) {
            clauses.push('category = ?');
            values.push(category);
        }
        if (search) {
            clauses.push('(title LIKE ? OR description LIKE ?)');
            values.push(`%${search}%`, `%${search}%`);
        }
        const [rows] = await pool.execute(
            `SELECT id, title, slug, description, long_description, course_image, category,
                    level, price, currency, duration_hours, total_lessons, rating, rating_count,
                    is_featured, created_at
             FROM courses WHERE ${clauses.join(' AND ')}
             ORDER BY is_featured DESC, created_at DESC LIMIT 100`,
            values
        );
        res.json({ courses: rows });
    } catch (err) {
        next(err);
    }
});

router.get('/courses/:id', async (req, res, next) => {
    try {
        const [courses] = await pool.execute(
            'SELECT * FROM courses WHERE id = ? AND is_published = 1 LIMIT 1',
            [req.params.id]
        );
        if (!courses.length) return res.status(404).json({ error: 'Course not found' });
        const [lessons] = await pool.execute(
            `SELECT id, course_id, title, slug, description, video_url, video_duration,
                    lesson_order, module_number, learning_objectives
             FROM lessons WHERE course_id = ? AND is_published = 1 ORDER BY lesson_order ASC`,
            [req.params.id]
        );
        res.json({ course: courses[0], lessons });
    } catch (err) {
        next(err);
    }
});

router.post('/courses/:id/enroll', auth, async (req, res, next) => {
    try {
        const [courses] = await pool.execute(
            'SELECT id, price FROM courses WHERE id = ? AND is_published = 1 LIMIT 1',
            [req.params.id]
        );
        if (!courses.length) return res.status(404).json({ error: 'Course not found' });
        await pool.execute(
            `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE status = 'active', updated_at = CURRENT_TIMESTAMP`,
            [req.user.id, req.params.id]
        );
        res.status(201).json({ ok: true, course_id: Number(req.params.id) });
    } catch (err) {
        next(err);
    }
});

router.get('/me/enrollments', auth, async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT e.*, c.title, c.slug, c.course_image, c.level
             FROM enrollments e JOIN courses c ON c.id = e.course_id
             WHERE e.user_id = ? ORDER BY e.updated_at DESC`,
            [req.user.id]
        );
        res.json({ enrollments: rows });
    } catch (err) {
        next(err);
    }
});

router.put('/lessons/:id/progress', auth, async (req, res, next) => {
    try {
        const { course_id, is_completed = false, time_spent_minutes = 0 } = req.body;
        if (!course_id) return res.status(400).json({ error: 'course_id is required' });
        await pool.execute(
            `INSERT INTO lesson_progress
                (user_id, lesson_id, course_id, is_completed, time_spent_minutes, completed_at)
             VALUES (?, ?, ?, ?, ?, CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END)
             ON DUPLICATE KEY UPDATE
                is_completed = VALUES(is_completed),
                time_spent_minutes = VALUES(time_spent_minutes),
                completed_at = CASE WHEN VALUES(is_completed) THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END`,
            [req.user.id, req.params.id, course_id, is_completed ? 1 : 0, time_spent_minutes, is_completed ? 1 : 0]
        );
        await pool.execute(
            `UPDATE enrollments e
             SET lessons_completed = (
                    SELECT COUNT(*) FROM lesson_progress lp
                    WHERE lp.user_id = e.user_id AND lp.course_id = e.course_id AND lp.is_completed = 1
                 ),
                 progress_percentage = (
                    SELECT COALESCE(ROUND(100 * SUM(lp.is_completed) / NULLIF(COUNT(*), 0), 2), 0)
                    FROM lesson_progress lp
                    WHERE lp.user_id = e.user_id AND lp.course_id = e.course_id
                 )
             WHERE e.user_id = ? AND e.course_id = ?`,
            [req.user.id, course_id]
        );
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
