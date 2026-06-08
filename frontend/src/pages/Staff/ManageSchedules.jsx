import React, { useState, useEffect } from 'react'
import api from '../../api'

// 櫃台：管理醫師門診排班
export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([])
  const [form, setForm] = useState({ doctor_id:'', staff_id:'', work_date:'', time_slot:'', room_no:'', max_limit:10 })
  const [msg, setMsg] = useState('')

  useEffect(() => { fetchSchedules() }, [])

  async function fetchSchedules(){
    try{
      const resp = await api.get('/schedules')
      setSchedules(resp.data || [])
    }catch(err){
      console.error(err)
      setMsg('載入排班失敗')
    }
  }

  async function handleCreate(e){
    e.preventDefault(); setMsg('')
    try{
      // 假設後端支持 POST /api/schedules
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
          <input placeholder="doctor_id" value={form.doctor_id} onChange={e=>setForm({...form,doctor_id:e.target.value})} />
          <input placeholder="staff_id" value={form.staff_id} onChange={e=>setForm({...form,staff_id:e.target.value})} />
          <input type="date" value={form.work_date} onChange={e=>setForm({...form,work_date:e.target.value})} />
          <input placeholder="time_slot" value={form.time_slot} onChange={e=>setForm({...form,time_slot:e.target.value})} />
          <input placeholder="room_no" value={form.room_no} onChange={e=>setForm({...form,room_no:e.target.value})} />
          <input type="number" placeholder="max_limit" value={form.max_limit} onChange={e=>setForm({...form,max_limit:Number(e.target.value)})} />
          <div>
            <button className="btn primary" type="submit">建立排班</button>
          </div>
        </form>
        {msg && <p className="status">{msg}</p>}
      </div>

      <h5 style={{marginTop:12}}>現有排班</h5>
      <div className="card">
        <table style={{width:'100%'}}>
          <thead><tr><th>schedule_id</th><th>doctor</th><th>date</th><th>time</th><th>room</th><th>max</th><th>current</th></tr></thead>
          <tbody>
            {schedules.map(s=> (
              <tr key={s.schedule_id}>
                <td>{s.schedule_id}</td>
                <td>{s.doctor_name || s.doctor_id}</td>
                <td>{s.work_date}</td>
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
