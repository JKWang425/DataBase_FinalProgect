const express = require('express');
const router = express.Router();
const pool = require('../db');

// List schedules (simple)
router.get('/schedules', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, d.doctor_name, dep.department_name
       FROM Schedules s
       JOIN Doctors d ON s.doctor_id = d.doctor_id
       JOIN Department dep ON d.department_id = dep.department_id
       ORDER BY s.work_date, s.time_slot`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Book appointment
router.post('/appointments/book', async (req, res) => {
  const { patient_id, schedule_id, is_first_visit } = req.body;
  if (!patient_id || !schedule_id) return res.status(400).json({ error: 'Missing fields' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [schedules] = await conn.execute('SELECT max_limit, current_count FROM Schedules WHERE schedule_id = ? FOR UPDATE', [schedule_id]);
    const sched = schedules[0];
    if (!sched) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Schedule not found' });
    }
    if (sched.current_count >= sched.max_limit) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Schedule full' });
    }
    // generate appt_no as current_count + 1
    const appt_no = sched.current_count + 1;
    const [ins] = await conn.execute(
      'INSERT INTO Appointments (patient_id, schedule_id, appt_no, is_first_visit, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [patient_id, schedule_id, appt_no, is_first_visit ? 1 : 0, 'Booked']
    );
    await conn.execute('UPDATE Schedules SET current_count = current_count + 1 WHERE schedule_id = ?', [schedule_id]);
    await conn.commit();
    conn.release();
    res.json({ appt_id: ins.insertId, appt_no });
  } catch (err) {
    await conn.rollback().catch(() => {});
    conn.release();
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
