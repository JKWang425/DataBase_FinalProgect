import React, { useState, useEffect } from 'react';
import api from '../api';

/*
  病患線上預約掛號元件
  - props:
    - patientId: 目前病患的 patient_id
*/
export default function AppointmentForm({ patientId }) {
  const [schedules, setSchedules] = useState([]); 
  const [departments, setDepartments] = useState([]); 
  const [doctors, setDoctors] = useState([]); 
  
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchSchedules() {
      try {
        const resp = await api.get('/schedules');
        if (!mounted) return;
        const data = resp.data || [];
        setSchedules(data);

        const deps = [];
        const docs = [];
        data.forEach((s) => {
          if (s.department_name && !deps.includes(s.department_name)) {
            deps.push(s.department_name);
          }
          if (s.doctor_name && !docs.find(d => d.doctor_id === s.doctor_id)) {
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

  // 當科別改變時，清空已選醫師與排班
  useEffect(() => {
    setSelectedDoctor('');
    setSelectedScheduleId('');
  }, [selectedDept]);

  // 當醫師改變時，清空已選排班
  useEffect(() => {
    setSelectedScheduleId('');
  }, [selectedDoctor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    if (!patientId) {
      setStatusMessage('缺少 patientId，請先登入');
      return;
    }
    if (!selectedScheduleId) {
      setStatusMessage('請選擇看診時段');
      return;
    }

    setLoading(true);
    try {
      const resp = await api.post('/api/appointments', {
        patient_id: patientId,
        schedule_id: selectedScheduleId,
      });
      if (resp.data && resp.data.appt_id) {
        setStatusMessage('預約成功！號碼：' + resp.data.appt_no);
        window.alert('預約成功！號碼：' + resp.data.appt_no);
        // 重置表單
        setSelectedDept('');
      } else {
        setStatusMessage('預約成功（回傳格式非預期）');
      }
    } catch (err) {
      console.error(err);
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

  // 過濾出的醫師與排班
  const filteredDoctors = doctors.filter(doc => !selectedDept || doc.department_name === selectedDept);
  const availableSchedules = schedules.filter(s => String(s.doctor_id) === String(selectedDoctor));

  if (schedules.length === 0) {
    return (
      <div>
        <h3>線上預約掛號</h3>
        <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          目前沒有任何可預約的門診排班。<br />
          (提示：請先使用 Staff (櫃台) 帳號登入，並建立「門診排班」後，病患才能進行掛號)
        </div>
        {statusMessage && <p className="status">{statusMessage}</p>}
      </div>
    );
  }

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
          <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)} disabled={!selectedDept && filteredDoctors.length === 0}>
            <option value="">請選擇醫師</option>
            {filteredDoctors.map(doc => (
              <option key={doc.doctor_id} value={doc.doctor_id}>{doc.doctor_name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label>看診時段：</label>
          <select value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)} disabled={!selectedDoctor}>
            <option value="">請選擇日期與時段</option>
            {availableSchedules.map(s => {
              const dateStr = new Date(s.work_date).toLocaleDateString();
              const isFull = s.current_count >= s.max_limit;
              return (
                <option key={s.schedule_id} value={s.schedule_id} disabled={isFull}>
                  {dateStr} - {s.time_slot} (診間 {s.room_no}) {isFull ? '- 已額滿' : `(已預約: ${s.current_count}/${s.max_limit})`}
                </option>
              );
            })}
          </select>
        </div>

        <div className="appointment-actions">
          <button className="btn primary" type="submit" disabled={loading || !selectedScheduleId}>{loading ? '送出中...' : '送出預約'}</button>
        </div>
      </form>

      {statusMessage && <p className="status">{statusMessage}</p>}
    </div>
  );
}
