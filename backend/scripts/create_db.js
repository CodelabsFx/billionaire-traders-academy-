const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  const sqlPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('schema.sql not found at', sqlPath);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.tables
       WHERE table_schema = ? LIMIT 1`,
      [process.env.DB_NAME || 'billionaire_traders_academy']
    );
    if (tables.length) {
      const migrationDir = path.join(__dirname, '..', '..', 'database', 'migrations');
      const migrations = fs.readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort();
      const migrationSql = migrations.map(file => fs.readFileSync(path.join(migrationDir, file), 'utf8')).join('\n');
      await connection.query(`USE \`${process.env.DB_NAME || 'billionaire_traders_academy'}\`;${migrationSql}`);
      console.log('Existing database detected; applied safe migrations only');
    } else {
      console.log('New database detected; running schema.sql...');
      await connection.query(sql);
      console.log('Database schema applied successfully');
    }
  } catch (err) {
    console.error('Error applying schema:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
