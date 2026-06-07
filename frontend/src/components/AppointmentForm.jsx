import React, { useState, useEffect } from 'react';
import api from '../api';

/*
  病患線上預約掛號元件
  - props:
    - patientId: 目前病患的 patient_id（由上層登入流程或 context 提供）
  功能：載入可用的排班（從 /schedules），讓使用者選擇科別、醫師、日期，送出後呼叫 /api/appointments
*/
export default function AppointmentForm({ patientId }) {
  // 元件狀態宣告
  const [schedules, setSchedules] = useState([]); // 原始排班資料
  const [departments, setDepartments] = useState([]); // 科別清單（字串陣列）
  const [doctors, setDoctors] = useState([]); // 醫師清單（依科別過濾）

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // componentDidMount: 載入 /schedules
  useEffect(() => {
    // 使用 useEffect 執行一次的非同步載入
    let mounted = true;
    async function fetchSchedules() {
      try {
        const resp = await api.get('/schedules');
        if (!mounted) return;
        setSchedules(resp.data || []);

        // 從 schedules 中提取唯一的 department 與 doctor
        const deps = [];
        const docs = [];
        (resp.data || []).forEach((s) => {
          if (s.department_name && !deps.includes(s.department_name)) deps.push(s.department_name);
          if (s.doctor_name && !docs.find(d => d.doctor_name === s.doctor_name && d.department_name === s.department_name)) {
            docs.push({ doctor_name: s.doctor_name, doctor_id: s.doctor_id, department_name: s.department_name });
          }
        });
        setDepartments(deps);
        setDoctors(docs);
      } catch (err) {
        console.error(err);
        setStatusMessage('載入排班失敗');
      }
    }
    fetchSchedules();
    return () => { mounted = false; };
  }, []);

  // 當選擇科別時，過濾醫師選單
  useEffect(() => {
    if (!selectedDept) return;
    const filtered = doctors.filter(d => d.department_name === selectedDept);
    // 如果只有一位醫師也自動選取
    setDoctors(prev => prev); // 保持 doctors 原始清單（state 已存），此處不覆寫
    if (filtered.length === 1) setSelectedDoctor(filtered[0].doctor_id);
  }, [selectedDept]);

  // 送出預約表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    if (!patientId) {
      setStatusMessage('缺少 patientId，請先登入');
      return;
    }
    if (!selectedDoctor || !selectedDate) {
      setStatusMessage('請選擇醫師與日期');
      return;
    }

    // 在 schedules 中尋找符合醫師與日期的 schedule_id
    const matched = schedules.find(s => String(s.doctor_id) === String(selectedDoctor) && s.work_date === selectedDate);
    if (!matched) {
      setStatusMessage('該日期無可用排班');
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post('/api/appointments', {
        patient_id: patientId,
        schedule_id: matched.schedule_id,
      });
      // 成功回應時範例格式: { appt_id, appt_no }
      if (resp.data && resp.data.appt_id) {
        setStatusMessage('預約成功！號碼：' + resp.data.appt_no);
        window.alert('預約成功！號碼：' + resp.data.appt_no);
      } else {
        setStatusMessage('預約成功（回傳格式非預期）');
      }
    } catch (err) {
      console.error(err);
      // 偵測常見錯誤訊息
      const msg = err?.response?.data?.error || err.message || '發生錯誤';
      if (msg === 'Schedule full') {
        setStatusMessage('該時段名額已滿');
        window.alert('該時段名額已滿');
      } else {
        setStatusMessage('預約失敗：' + msg);
        window.alert('預約失敗：' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>線上預約掛號</h3>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-row">
          <label>科別：</label>
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
            <option value="">請選擇科別</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>醫師：</label>
          <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}>
            <option value="">請先選擇科別</option>
            {doctors.filter(doc => !selectedDept || doc.department_name === selectedDept).map(doc => (
              <option key={doc.doctor_id} value={doc.doctor_id}>{doc.doctor_name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>看診日期：</label>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>

        <div className="appointment-actions">
          <button className="btn primary" type="submit" disabled={loading}>{loading ? '送出中...' : '送出預約'}</button>
        </div>
      </form>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}
