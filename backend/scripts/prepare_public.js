const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const publicDir = path.join(__dirname, '..', 'public');
const frontendFiles = [
    'admin.css', 'admin.html', 'admin.js', 'course.html', 'courses-api.js',
    'courses.html', 'dashboard.html', 'gold-trading.html', 'index.html',
    'lessons.html', 'profile.html', 'script.js', 'settings.html', 'style.css'
];

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const file of frontendFiles) {
    fs.copyFileSync(path.join(projectRoot, file), path.join(publicDir, file));
}
fs.cpSync(path.join(projectRoot, 'images'), path.join(publicDir, 'images'), { recursive: true });
console.log(`Prepared ${frontendFiles.length} frontend files for deployment`);
