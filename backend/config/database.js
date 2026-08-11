const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'billionaire_traders_academy',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
});

// Test connection
pool.getConnection().then(connection => {
    console.log('✅ MySQL Database Connected Successfully');
    connection.release();
}).catch(error => {
    console.error('❌ Database Connection Error:', error.message);
    process.exit(1);
});

module.exports = pool;
