/**
 * POST /api/login
 * - 接收 JSON { username, password }
 * - 使用參數化查詢防止 SQL Injection
 * - 驗證密碼後回傳 JWT（payload 含 user_id, role）
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole } = require('../middleware/auth');

// JWT 設定：從環境變數取得 secret，若未設定則使用預設值（生產環境請務必設定強密鑰）
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret_in_production';

/*
  登入流程說明（中文註解）
  1. 前端將 username 與 password 以 HTTPS POST 傳到 /api/login
  2. 後端使用參數化查詢從 Users 表撈出對應的使用者紀錄（只撈必要欄位）
  3. 使用 bcrypt.compare 驗證密碼（安全比對已加鹽的雜湊值）
  4. 驗證成功後，用 jwt.sign 產生 Token，Token payload 含 user_id 與 role，
     並回傳給前端；前端之後可將此 Token 放在 Authorization header 使用
  5. 伺服器端僅在需要時驗證 JWT（透過 jwt.verify）來判斷使用者身份與角色
*/
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
  try {
    // 使用參數化查詢，避免 SQL Injection
    const [rows] = await pool.execute('SELECT user_id, password, role FROM Users WHERE username = ?', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // 使用 bcrypt 比對密碼，password 欄位為雜湊值
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // 產生 JWT：payload 可包含必要的識別資訊，避免放入敏感資料
    const payload = { user_id: user.user_id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    // 回傳 token 給前端，前端可儲存在 memory、secure cookie 或 localStorage（視安全性需求）
    return res.json({ token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

  /**
   * POST /api/medical-records
   * 醫師填寫看診診斷與備註
   */
  router.post('/medical-records', authenticateToken, requireRole(['Doctor']), async (req, res) => {
    const { appt_id, diagnosis, treatment } = req.body;
    if (!appt_id) return res.status(400).json({ error: 'Missing appt_id' });
    try {
      // 檢查此 appt_id 是否屬於該醫師
      const userId = req.user.user_id;
      const [docRows] = await pool.execute('SELECT doctor_id FROM Doctors WHERE user_id = ? LIMIT 1', [userId]);
      const doc = docRows[0];
      if (!doc) return res.status(403).json({ error: 'Not authorized' });

      const [apptRows] = await pool.execute('SELECT s.doctor_id FROM Appointments a JOIN Schedules s ON a.schedule_id = s.schedule_id WHERE a.appt_id = ?', [appt_id]);
      if (apptRows.length === 0 || apptRows[0].doctor_id !== doc.doctor_id) {
        return res.status(403).json({ error: 'Not authorized for this appointment' });
      }

      // 新增或更新病歷紀錄 (使用 ON DUPLICATE KEY UPDATE)
      await pool.execute(
        'INSERT INTO MedicalRecord (appt_id, diagnosis, treatment, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE diagnosis = ?, treatment = ?, updated_at = NOW()',
        [appt_id, diagnosis || '', treatment || '', diagnosis || '', treatment || '']
      );
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/users/:id
   * 櫃台刪除使用者帳號
   */
  router.delete('/users/:id', authenticateToken, requireRole(['Staff']), async (req, res) => {
    const userId = req.params.id;
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // 先查出該使用者的角色
      const [uRows] = await conn.execute('SELECT role FROM Users WHERE user_id = ? FOR UPDATE', [userId]);
      const user = uRows[0];
      if (!user) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ error: 'User not found' });
      }

      // 若為 Patient，需確保刪除其 Appointments 與 MedicalRecords (如果有設定 Foreign Key Cascade 就不用，但保險起見手動刪或讓 DB 處理)
      // 若 DB 有設定 ON DELETE CASCADE，則只需刪除 Users 即可
      // 我們直接嘗試刪除 Users，讓 ON DELETE CASCADE 處理關聯表，或手動刪除角色表
      if (user.role === 'Patient') {
        await conn.execute('DELETE FROM Patients WHERE user_id = ?', [userId]);
      } else if (user.role === 'Doctor') {
        await conn.execute('DELETE FROM Doctors WHERE user_id = ?', [userId]);
      } else if (user.role === 'Staff') {
        await conn.execute('DELETE FROM Staffs WHERE user_id = ?', [userId]);
      }

      await conn.execute('DELETE FROM Users WHERE user_id = ?', [userId]);

      await conn.commit();
      conn.release();
      return res.json({ ok: true });
    } catch (err) {
      try { if (conn) await conn.rollback(); } catch (rb) { console.error(rb); }
      if (conn) conn.release();
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

module.exports = router;

/**
 * POST /api/appointments
 * 建立新的預約掛號（使用 Transaction 確保資料一致性）
 * 接收 JSON body: { schedule_id }
 */
router.post('/appointments', authenticateToken, requireRole(['Patient']), async (req, res) => {
  const { schedule_id } = req.body;
  if (!schedule_id) return res.status(400).json({ error: 'Missing schedule_id' });

  let conn;
  try {
    // 1) 取得一個專用連線，準備手動管理交易
    conn = await pool.getConnection();

    // 先查詢真正的 patient_id
    const [pRows] = await conn.execute('SELECT patient_id FROM Patients WHERE user_id = ?', [req.user.user_id]);
    if (pRows.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Patient not found' });
    }
    const real_patient_id = pRows[0].patient_id;

    /*
      2) 開啟交易（Transaction）
      - beginTransaction() 開始一個資料庫交易，之後的查詢/寫入都在同一個交易上下文中
      - 只有在呼叫 commit() 後，所有變更才會永久寫入資料庫；若發生錯誤，呼叫 rollback() 可還原變更
    */
    await conn.beginTransaction();

    // 3) 鎖定該排班的紀錄以供檢查（FOR UPDATE）以避免 race condition
    const [rows] = await conn.execute(
      'SELECT max_limit, current_count FROM Schedules WHERE schedule_id = ? FOR UPDATE',
      [schedule_id]
    );
    const sched = rows[0];
    if (!sched) {
      // 若找不到排班，rollback 並回傳 404
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // 4) 檢查名額
    if (sched.current_count >= sched.max_limit) {
      // 名額已滿，rollback 並回應
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'Schedule full' });
    }

    // 5) 插入新的預約紀錄，並將 Schedules.current_count +1
    const appt_no = sched.current_count + 1; // 排隊號碼
    const [ins] = await conn.execute(
      'INSERT INTO Appointments (patient_id, schedule_id, appt_no, status, created_at) VALUES (?, ?, ?, ?, NOW())',
      [real_patient_id, schedule_id, appt_no, 'Pending']
    );

    await conn.execute('UPDATE Schedules SET current_count = current_count + 1 WHERE schedule_id = ?', [schedule_id]);

    /*
      6) Commit 交易
      - 所有在此交易中對資料庫的變更，會在 commit() 呼叫後一次性寫入並對其他連線可見
    */
    await conn.commit();
    conn.release();

    return res.json({ appt_id: ins.insertId, appt_no });
  } catch (err) {
    // 發生例外時，嘗試 rollback 確保資料不會處於不一致狀態
    try {
      if (conn) await conn.rollback();
    } catch (rbErr) {
      console.error('Rollback error:', rbErr);
    }
    if (conn) conn.release();
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

  /**
   * GET /api/admin/reports/doctor-count
   * 回傳各科別的醫師人數統計
   * 說明：此查詢會把 Department 與 Doctors 做 JOIN，並使用 GROUP BY 及 COUNT 彙總每個科別的醫師數量
   */
  router.get('/admin/reports/doctor-count', authenticateToken, requireRole(['Staff']), async (req, res) => {
    try {
      // SQL 語句說明（以多行字串呈現，並在旁邊用中文註解說明 JOIN 與 GROUP BY 的效果）
      const sql = `
        /*
          JOIN 說明：
          - 使用 Department dep LEFT JOIN Doctors d ON d.department_id = dep.department_id
          - LEFT JOIN 可以保留所有科別（即使某科別沒有醫師也會被列出），若改用 INNER JOIN 則只會列出有醫師的科別

          GROUP BY 與 COUNT 說明：
          - GROUP BY dep.department_name 將資料依科別分組
          - COUNT(d.doctor_id) 計算每個科別所對應的醫師數量
        */
        SELECT dep.department_name, COUNT(d.doctor_id) AS doctor_count
        FROM Department dep
        LEFT JOIN Doctors d ON d.department_id = dep.department_id
        GROUP BY dep.department_name
        ORDER BY doctor_count DESC
      `;

      // 執行查詢（無參數），回傳 JSON 給前端報表使用
      const [rows] = await pool.execute(sql);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/schedules
   * 櫃台建立新的門診排班
   * 欄位: { doctor_id, staff_id, work_date, time_slot, room_no, max_limit }
   */
  router.post('/schedules', authenticateToken, requireRole(['Staff']), async (req, res) => {
    const { doctor_id, staff_id, work_date, time_slot, room_no, max_limit } = req.body;
    if (!doctor_id || !staff_id || !work_date || !time_slot || !room_no || !max_limit) return res.status(400).json({ error: 'Missing fields' });
    try {
      const [ins] = await pool.execute(
        'INSERT INTO Schedules (doctor_id, staff_id, work_date, time_slot, room_no, max_limit, current_count) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [doctor_id, staff_id, work_date, time_slot, room_no, max_limit]
      );
      return res.json({ schedule_id: ins.insertId });
    } catch (err) {
      console.error(err);
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({ error: '指定的醫生或櫃台人員不存在 (Foreign Key 錯誤)' });
      }
      return res.status(500).json({ error: 'DB error' });
    }
  });

  /**
   * POST /api/checkin
   * 櫃台現場報到：可以使用 id_number 或 appt_no
   */
  router.post('/checkin', authenticateToken, requireRole(['Staff']), async (req, res) => {
    const { id_number, appt_no } = req.body;
    try {
      if (appt_no) {
        // 用掛號號碼找 appointment
        const [rows] = await pool.execute('SELECT * FROM Appointments WHERE appt_no = ? LIMIT 1', [appt_no]);
        const appt = rows[0];
        if (!appt) return res.status(404).json({ error: 'Appointment not found' });
        await pool.execute('UPDATE Appointments SET status = ? WHERE appt_id = ?', ['CheckedIn', appt.appt_id]);
        return res.json({ ok: true });
      } else if (id_number) {
        // 用身分證找到 patient，再找最近一筆 Pending 的 appointment
        const [pRows] = await pool.execute('SELECT patient_id FROM Patients WHERE id_number = ? LIMIT 1', [id_number]);
        const p = pRows[0];
        if (!p) return res.status(404).json({ error: 'Patient not found' });
        const [aRows] = await pool.execute('SELECT * FROM Appointments WHERE patient_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1', [p.patient_id, 'Pending']);
        const appt = aRows[0];
        if (!appt) return res.status(404).json({ error: 'No pending appointment for patient' });
        await pool.execute('UPDATE Appointments SET status = ? WHERE appt_id = ?', ['CheckedIn', appt.appt_id]);
        return res.json({ ok: true });
      } else {
        return res.status(400).json({ error: 'Provide id_number or appt_no' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/users
   * 櫃台查詢所有使用者（含角色與各自身分ID）
   */
  router.get('/users', authenticateToken, requireRole(['Staff']), async (req, res) => {
    try {
      const sql = `
        SELECT u.user_id, u.username, u.role, 
               p.patient_id, p.id_number, p.name AS patient_name,
               d.doctor_id, d.doctor_name,
               s.staff_id, s.staff_name
        FROM Users u
        LEFT JOIN Patients p ON u.user_id = p.user_id
        LEFT JOIN Doctors d ON u.user_id = d.user_id
        LEFT JOIN Staffs s ON u.user_id = s.user_id
        ORDER BY u.user_id ASC
      `;
      const [rows] = await pool.execute(sql);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/appointments
   * 櫃台查詢所有預約（含病患與排班資訊）
   */
  router.get('/appointments', authenticateToken, requireRole(['Staff']), async (req, res) => {
    try {
      const sql = `SELECT a.*, p.name AS patient_name, s.work_date, s.time_slot, s.room_no
        FROM Appointments a
        LEFT JOIN Patients p ON a.patient_id = p.patient_id
        LEFT JOIN Schedules s ON a.schedule_id = s.schedule_id
        ORDER BY s.work_date DESC, a.appt_no ASC`;
      const [rows] = await pool.execute(sql);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/appointments/:id
   * 取消預約：採用 transaction 檢查並更新 Schedules.current_count
   */
  router.delete('/appointments/:id', authenticateToken, requireRole(['Staff', 'Patient']), async (req, res) => {
    const apptId = req.params.id;
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [rows] = await conn.execute('SELECT * FROM Appointments WHERE appt_id = ? FOR UPDATE', [apptId]);
      const appt = rows[0];
      if (!appt) {
        await conn.rollback(); conn.release();
        return res.status(404).json({ error: 'Appointment not found' });
      }

      // 如果是 Patient，必須確認這筆預約是他的
      if (req.user.role === 'Patient') {
        const [pRows] = await conn.execute('SELECT patient_id FROM Patients WHERE user_id = ? LIMIT 1', [req.user.user_id]);
        if (!pRows[0] || pRows[0].patient_id !== appt.patient_id) {
          await conn.rollback(); conn.release();
          return res.status(403).json({ error: 'Not authorized' });
        }
      }

      // 若非已取消狀態，將其標記為 Cancelled 並將 Schedules.current_count -1
      if (appt.status !== 'Cancelled') {
        await conn.execute('UPDATE Appointments SET status = ? WHERE appt_id = ?', ['Cancelled', apptId]);
        await conn.execute('UPDATE Schedules SET current_count = GREATEST(current_count - 1, 0) WHERE schedule_id = ?', [appt.schedule_id]);
      }
      await conn.commit(); conn.release();
      return res.json({ ok: true });
    } catch (err) {
      try { if (conn) await conn.rollback(); } catch (rb) { console.error(rb); }
      if (conn) conn.release();
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/patients/me/appointments
   * 病患查詢自己的預約紀錄
   */
  router.get('/patients/me/appointments', authenticateToken, requireRole(['Patient']), async (req, res) => {
    try {
      const [pRows] = await pool.execute('SELECT patient_id FROM Patients WHERE user_id = ? LIMIT 1', [req.user.user_id]);
      if (!pRows[0]) return res.status(404).json({ error: 'Patient not found' });
      const patientId = pRows[0].patient_id;

      const sql = `SELECT a.*, s.work_date, s.time_slot, s.room_no, d.doctor_name, dep.department_name
        FROM Appointments a
        JOIN Schedules s ON a.schedule_id = s.schedule_id
        JOIN Doctors d ON s.doctor_id = d.doctor_id
        JOIN Department dep ON d.department_id = dep.department_id
        WHERE a.patient_id = ?
        ORDER BY s.work_date DESC, s.time_slot ASC`;
      const [rows] = await pool.execute(sql, [patientId]);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/patients/me/records
   * 病患查詢自己的看診歷史紀錄
   */
  router.get('/patients/me/records', authenticateToken, requireRole(['Patient']), async (req, res) => {
    try {
      const [pRows] = await pool.execute('SELECT patient_id FROM Patients WHERE user_id = ? LIMIT 1', [req.user.user_id]);
      if (!pRows[0]) return res.status(404).json({ error: 'Patient not found' });
      const patientId = pRows[0].patient_id;

      const sql = `SELECT m.*, a.appt_no, s.work_date, d.doctor_name, dep.department_name
        FROM MedicalRecord m
        JOIN Appointments a ON m.appt_id = a.appt_id
        JOIN Schedules s ON a.schedule_id = s.schedule_id
        JOIN Doctors d ON s.doctor_id = d.doctor_id
        JOIN Department dep ON d.department_id = dep.department_id
        WHERE a.patient_id = ?
        ORDER BY s.work_date DESC`;
      const [rows] = await pool.execute(sql, [patientId]);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });


  /**
   * GET /api/doctor/today
   * 醫師取得當日自己的待診名單
   */
  router.get('/doctor/today', authenticateToken, requireRole(['Doctor']), async (req, res) => {
    try {
      // 先根據 Users.user_id 找到對應的 Doctors.doctor_id
      const userId = req.user && req.user.user_id;
      const [docRows] = await pool.execute('SELECT doctor_id FROM Doctors WHERE user_id = ? LIMIT 1', [userId]);
      const docRow = docRows[0];
      const doctorId = docRow ? docRow.doctor_id : null;
      if (!doctorId) return res.status(404).json({ error: 'Doctor profile not found' });
      const sql = `SELECT a.appt_id, a.appt_no, a.status, a.patient_id, p.name AS patient_name, s.work_date, s.time_slot
        FROM Appointments a
        JOIN Schedules s ON a.schedule_id = s.schedule_id
        LEFT JOIN Patients p ON a.patient_id = p.patient_id
        WHERE s.doctor_id = ? AND s.work_date = CURDATE()
        ORDER BY a.appt_no ASC`;
      const [rows] = await pool.execute(sql, [doctorId]);
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  /**
   * POST /api/appointments/:id/status
   * 更新單筆預約狀態 (醫師或櫃台可用，醫師需檢查是否為自己門診)
   */
  router.post('/appointments/:id/status', authenticateToken, requireRole(['Doctor','Staff']), async (req, res) => {
    const apptId = req.params.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Missing status' });
    let conn;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();
      const [rows] = await conn.execute('SELECT a.*, s.doctor_id FROM Appointments a JOIN Schedules s ON a.schedule_id = s.schedule_id WHERE a.appt_id = ? FOR UPDATE', [apptId]);
      const appt = rows[0];
      if (!appt) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Appointment not found' }); }
      // 若是 doctor 身份，確認該醫師為此排班的負責醫師
      if (req.user.role === 'Doctor') {
        const userId = req.user.user_id;
        const [docRows] = await conn.execute('SELECT doctor_id FROM Doctors WHERE user_id = ? LIMIT 1', [userId]);
        const doc = docRows[0];
        if (!doc || doc.doctor_id !== appt.doctor_id) {
          await conn.rollback(); conn.release();
          return res.status(403).json({ error: 'Not authorized for this appointment' });
        }
      }
      await conn.execute('UPDATE Appointments SET status = ? WHERE appt_id = ?', [status, apptId]);
      await conn.commit(); conn.release();
      return res.json({ ok: true });
    } catch (err) {
      try { if (conn) await conn.rollback(); } catch (rb) { console.error(rb); }
      if (conn) conn.release();
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
