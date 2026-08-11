const express = require('express');
const auth = require('../middleware/auth');
const { recordActivity } = require('../utils/activity');

const router = express.Router();
const allowedEvents = new Set(['page_view', 'course_view', 'lesson_start', 'lesson_complete', 'course_search', 'video_play', 'download', 'cta_click']);

router.post('/events', auth, async (req, res, next) => {
    try {
        const { event, description, relatedEntity, relatedEntityId } = req.body;
        if (!allowedEvents.has(event)) return res.status(400).json({ error: 'Unsupported activity event' });
        await recordActivity(req, event, String(description || '').slice(0, 255), relatedEntity, relatedEntityId);
        res.status(202).json({ ok: true });
    } catch (err) { next(err); }
});

module.exports = router;
