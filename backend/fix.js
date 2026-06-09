const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

async function fixEncoding() {
  try {
    const db = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3307,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('Connected to DB');

    // First delete rows 7-15 that we just added with garbled text
    await db.execute('DELETE FROM Department WHERE department_id > 6');

    // Update existing
    await db.execute("UPDATE Department SET department_name = '內科' WHERE department_id IN (1, 4)");
    await db.execute("UPDATE Department SET department_name = '外科' WHERE department_id IN (2, 5)");
    await db.execute("UPDATE Department SET department_name = '兒科' WHERE department_id IN (3, 6)");

    // Insert new ones
    const newDepts = ['家醫科', '耳鼻喉科', '皮膚科', '眼科', '牙科', '骨科', '婦產科', '復健科', '泌尿科'];
    for (const name of newDepts) {
       await db.execute("INSERT INTO Department (department_name) VALUES (?)", [name]);
    }

    console.log('Departments updated');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixEncoding();