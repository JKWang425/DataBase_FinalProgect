import React, { useState, useEffect } from 'react'
import api from '../../api'

export default function ManageAppointments(){
  const [appts, setAppts] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(()=>{ fetchAppts() }, [])

  async function fetchAppts(){
    try{
      const resp = await api.get('/api/appointments')
      setAppts(resp.data || [])
    }catch(err){
      console.error(err)
      setMsg('載入預約失敗')
    }
  }

  async function handleCancel(id){
    try{
      await api.delete(`/api/appointments/${id}`)
      setMsg('已取消')
      fetchAppts()
    }catch(err){
      console.error(err)
      setMsg('取消失敗')
    }
  }

  return (
    <div>
      <h4>管理掛號</h4>
      <div className="card">
        <table style={{width:'100%'}}>
          <thead><tr><th>appt_id</th><th>patient</th><th>schedule</th><th>no</th><th>status</th><th>actions</th></tr></thead>
          <tbody>
            {appts.map(a=> (
              <tr key={a.appt_id}>
                <td>{a.appt_id}</td>
                <td>{a.patient_id}</td>
                <td>{a.schedule_id}</td>
                <td>{a.appt_no}</td>
                <td>{a.status}</td>
                <td><button className="btn ghost" onClick={()=>handleCancel(a.appt_id)}>取消</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {msg && <p className="status">{msg}</p>}
      </div>
    </div>
  )
}
