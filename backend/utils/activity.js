const pool = require('../config/database');

async function recordActivity(req, activityType, description, relatedEntity, relatedEntityId) {
    if (!req.user || !req.user.id) return;
    await pool.execute(
        `INSERT INTO activity_log
            (user_id, activity_type, description, related_entity, related_entity_id, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            req.user.id,
            activityType,
            description || null,
            relatedEntity || null,
            relatedEntityId || null,
            req.ip || null,
            String(req.get('user-agent') || '').slice(0, 500) || null
        ]
    );
}

module.exports = { recordActivity };
