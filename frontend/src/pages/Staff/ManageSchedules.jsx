import React, { useState, useEffect } from 'react'
import api from '../../api'

// 櫃台：管理醫師門診排班
export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([])
  const [form, setForm] = useState({ doctor_id:'', staff_id:'', work_date:'', time_slot:'', room_no:'', max_limit:10 })
  const [msg, setMsg] = useState('')
  const [doctors, setDoctors] = useState([])
  const [staffs, setStaffs] = useState([])

  useEffect(() => { 
    fetchSchedules() 
    fetchUsers()
  }, [])

  async function fetchSchedules(){
    try{
      const resp = await api.get('/schedules') // 注意: /schedules 為不需要 auth 就能存取的路徑 (在 appointments.js)
      setSchedules(resp.data || [])
    }catch(err){
      console.error(err)
      setMsg('載入排班失敗')
    }
  }

  async function fetchUsers(){
    try {
      const resp = await api.get('/api/users')
      const data = resp.data || []
      setDoctors(data.filter(u => u.role === 'Doctor'))
      setStaffs(data.filter(u => u.role === 'Staff'))
    } catch(err){
      console.error(err)
    }
  }

  async function handleCreate(e){
    e.preventDefault(); setMsg('')
    if(!form.doctor_id || !form.staff_id || !form.work_date || !form.time_slot || !form.room_no || !form.max_limit) {
      setMsg('請填寫所有欄位')
      return
    }
    try{
      await api.post('/api/schedules', form)
      setMsg('建立成功')
      fetchSchedules()
    }catch(err){
      console.error(err)
      setMsg(err?.response?.data?.error || '建立失敗')
    }
  }

  return (
    <div>
      <h4>管理門診排班</h4>
      <div className="card">
        <form onSubmit={handleCreate} className="form-row">
          <select value={form.doctor_id} onChange={e=>setForm({...form,doctor_id:e.target.value})}>
            <option value="">選擇醫師...</option>
            {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name} (ID:{d.doctor_id})</option>)}
          </select>
          <select value={form.staff_id} onChange={e=>setForm({...form,staff_id:e.target.value})}>
            <option value="">選擇櫃台人員...</option>
            {staffs.map(s => <option key={s.staff_id} value={s.staff_id}>{s.staff_name} (ID:{s.staff_id})</option>)}
          </select>
          <input type="date" value={form.work_date} onChange={e=>setForm({...form,work_date:e.target.value})} />
          <input placeholder="時間 (例如: 09:00-12:00)" value={form.time_slot} onChange={e=>setForm({...form,time_slot:e.target.value})} />
          <input placeholder="診間號碼" value={form.room_no} onChange={e=>setForm({...form,room_no:e.target.value})} />
          <input type="number" placeholder="最大人數限制" value={form.max_limit} onChange={e=>setForm({...form,max_limit:Number(e.target.value)})} />
          <div>
            <button className="btn primary" type="submit">建立排班</button>
          </div>
        </form>
        {msg && <p className="status" style={{color: msg==='建立成功'?'green':'red'}}>{msg}</p>}
      </div>

      <h5 style={{marginTop:12}}>現有排班</h5>
      <div className="card">
        <table style={{width:'100%', textAlign: 'left'}}>
          <thead><tr><th>排班 ID</th><th>醫師</th><th>日期</th><th>時間</th><th>診間</th><th>限額</th><th>已預約</th></tr></thead>
          <tbody>
            {schedules.map(s=> (
              <tr key={s.schedule_id}>
                <td>{s.schedule_id}</td>
                <td>{s.doctor_name || s.doctor_id}</td>
                <td>{new Date(s.work_date).toLocaleDateString()}</td>
                <td>{s.time_slot}</td>
                <td>{s.room_no}</td>
                <td>{s.max_limit}</td>
                <td>{s.current_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
