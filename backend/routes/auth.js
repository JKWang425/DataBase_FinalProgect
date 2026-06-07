const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await conn.execute(
      'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)',
      [username, hashed, role]
    );
    const newUserId = result.insertId;

    // 根據角色自動建立對應的 Profile
    if (role === 'Patient') {
      await conn.execute('INSERT INTO Patients (user_id, name) VALUES (?, ?)', [newUserId, username]);
    } else if (role === 'Doctor') {
      // 假設預設科別為 1 (請確保 Department 表中有 ID 為 1 的紀錄)
      await conn.execute('INSERT INTO Doctors (user_id, doctor_name, department_id) VALUES (?, ?, 1)', [newUserId, username]);
    } else if (role === 'Staff') {
      await conn.execute('INSERT INTO Staffs (user_id, staff_name) VALUES (?, ?)', [newUserId, username]);
    }

    await conn.commit();
    conn.release();
    return res.json({ user_id: newUserId });
  } catch (err) {
    if (conn) {
      await conn.rollback().catch(() => {});
      conn.release();
    }
    console.error(err);
    return res.status(500).json({ error: 'DB error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [rows] = await pool.execute('SELECT * FROM Users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    // 同時回傳 user_id 與 role，讓前端可以直接根據 role 顯示不同介面
    return res.json({ token, user_id: user.user_id, role: user.role });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;

