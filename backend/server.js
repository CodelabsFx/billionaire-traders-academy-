const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const adminManagement = require('./routes/adminManagement');
const learningRoutes = require('./routes/learning');
const activityRoutes = require('./routes/activity');
const path = require('path');

const app = express();

app.use(helmet());
app.use(express.json());
app.set('trust proxy', process.env.TRUST_PROXY === 'true');
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
    }
}));

const limiter = rateLimit({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10)) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
});
app.use(limiter);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', adminManagement);
app.use('/api', learningRoutes);
app.use('/api', activityRoutes);

// Serve the allowlisted frontend bundle prepared during deployment.
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// Serve uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/ping', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development' }));

const publicPages = ['/', '/index.html', '/courses.html', '/gold-trading.html', '/course.html'];
function publicSiteUrl() {
    return (process.env.PUBLIC_SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
}

app.get('/robots.txt', (req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /dashboard.html\nDisallow: /lessons.html\nDisallow: /profile.html\nDisallow: /settings.html\nDisallow: /api/\nDisallow: /uploads/\nSitemap: ${publicSiteUrl()}/sitemap.xml\n`);
});

app.get('/sitemap.xml', (req, res) => {
    const urls = publicPages.map(page => `<url><loc>${publicSiteUrl()}${page === '/' ? '/' : page}</loc></url>`).join('');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

app.use((err, req, res, next) => {
    console.error(err);
    const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : (err.message || 'Internal Server Error');
    res.status(err.status || 500).json({ error: message });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 API server running on port ${PORT}`);
    });
}

module.exports = app;
