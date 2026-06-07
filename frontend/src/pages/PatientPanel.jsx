import React, { useState, useEffect } from 'react'
import api from '../api'
import AppointmentForm from '../components/AppointmentForm'

export default function PatientPanel({ patientId }) {
  const [activeTab, setActiveTab] = useState('book') // book, myAppts, records
  const [appointments, setAppointments] = useState([])
  const [records, setRecords] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (activeTab === 'myAppts') {
      fetchAppointments()
    } else if (activeTab === 'records') {
      fetchRecords()
    }
  }, [activeTab])

  async function fetchAppointments() {
    try {
      const resp = await api.get('/api/patients/me/appointments')
      setAppointments(resp.data || [])
    } catch (err) {
      console.error(err)
      setMsg('載入掛號紀錄失敗')
    }
  }

  async function fetchRecords() {
    try {
      const resp = await api.get('/api/patients/me/records')
      setRecords(resp.data || [])
    } catch (err) {
      console.error(err)
      setMsg('載入歷史病歷失敗')
    }
  }

  async function handleCancel(apptId) {
    if (!window.confirm('確定要取消此掛號？')) return
    try {
      await api.delete(`/api/appointments/${apptId}`)
      setMsg('取消成功')
      fetchAppointments()
    } catch (err) {
      console.error(err)
      setMsg('取消失敗')
    }
  }

  return (
    <div>
      <h3>病患面板</h3>
      <div style={{ marginBottom: '20px', display:'flex', gap:'10px' }}>
        <button className={activeTab === 'book' ? 'btn primary' : 'btn ghost'} onClick={() => setActiveTab('book')}>預約掛號</button>
        <button className={activeTab === 'myAppts' ? 'btn primary' : 'btn ghost'} onClick={() => setActiveTab('myAppts')}>我的掛號</button>
        <button className={activeTab === 'records' ? 'btn primary' : 'btn ghost'} onClick={() => setActiveTab('records')}>歷史紀錄</button>
      </div>

      {msg && <div className="status">{msg}</div>}

      {activeTab === 'book' && (
        <AppointmentForm patientId={patientId} />
      )}

      {activeTab === 'myAppts' && (
        <div className="card">
          <h4>我的掛號</h4>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>日期</th>
                <th>時段</th>
                <th>科別</th>
                <th>醫師</th>
                <th>號碼</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 && <tr><td colSpan="7">目前無預約掛號</td></tr>}
              {appointments.map(a => (
                <tr key={a.appt_id}>
                  <td>{new Date(a.work_date).toLocaleDateString()}</td>
                  <td>{a.time_slot}</td>
                  <td>{a.department_name}</td>
                  <td>{a.doctor_name}</td>
                  <td>{a.appt_no}</td>
                  <td>{a.status}</td>
                  <td>
                    {a.status !== 'Cancelled' && a.status !== 'Done' && (
                      <button className="btn ghost" onClick={() => handleCancel(a.appt_id)}>取消</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="card">
          <h4>歷史看診紀錄</h4>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>日期</th>
                <th>科別</th>
                <th>醫師</th>
                <th>診斷內容</th>
                <th>處置方式</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 && <tr><td colSpan="5">目前無歷史紀錄</td></tr>}
              {records.map(r => (
                <tr key={r.appt_id}>
                  <td>{new Date(r.work_date).toLocaleDateString()}</td>
                  <td>{r.department_name}</td>
                  <td>{r.doctor_name}</td>
                  <td>{r.diagnosis}</td>
                  <td>{r.treatment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
