import React, { useState, useEffect } from 'react'
import api from '../api'

// 醫師專屬面板：今日待診名單與狀態更新、填寫看診備註與結果
export default function DoctorPanel(){
  const [queue, setQueue] = useState([])
  const [msg, setMsg] = useState('')
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')

  useEffect(()=>{ fetchQueue() }, [])

  async function fetchQueue(){
    try{
      const resp = await api.get('/api/doctor/today')
      setQueue(resp.data || [])
    }catch(err){
      console.error(err)
      setMsg('載入待診名單失敗')
    }
  }

  async function updateStatus(apptId, status){
    try{
      await api.post(`/api/appointments/${apptId}/status`, { status })
      setMsg(`狀態更新為 ${status} 成功`)
      fetchQueue()
    }catch(err){
      console.error(err)
      setMsg('狀態更新失敗')
    }
  }

  async function saveMedicalRecord(){
    if(!selectedAppt) return
    try{
      await api.post('/api/medical-records', {
        appt_id: selectedAppt,
        diagnosis,
        treatment
      })
      setMsg('看診紀錄儲存成功')
      setDiagnosis('')
      setTreatment('')
      setSelectedAppt(null)
      fetchQueue()
    }catch(err){
      console.error(err)
      setMsg('看診紀錄儲存失敗')
    }
  }

  return (
    <div>
      <h3>醫師面板：今日待診名單</h3>
      <div className="card">
        <table style={{width:'100%'}}>
          <thead><tr><th>appt_no</th><th>patient</th><th>status</th><th>action</th></tr></thead>
          <tbody>
            {queue.map(q=> (
              <tr key={q.appt_id}>
                <td>{q.appt_no}</td>
                <td>{q.patient_name || q.patient_id}</td>
                <td>{q.status}</td>
                <td>
                  <button className="btn ghost" onClick={()=>updateStatus(q.appt_id,'In Service')}>看診中</button>
                  <button className="btn ghost" onClick={()=>updateStatus(q.appt_id,'Done')}>看診完畢</button>
                  <button className="btn ghost" onClick={()=>setSelectedAppt(q.appt_id)}>填寫病歷</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {msg && <p className="status">{msg}</p>}
      </div>

      {selectedAppt && (
        <div className="card" style={{marginTop: '20px'}}>
          <h4>填寫病歷 (掛號單號: {queue.find(q=>q.appt_id === selectedAppt)?.appt_no})</h4>
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            <label>
              診斷紀錄:
              <textarea 
                value={diagnosis} 
                onChange={(e)=>setDiagnosis(e.target.value)} 
                style={{width:'100%', height:'80px', marginTop:'5px'}} 
              />
            </label>
            <label>
              處置方式/備註:
              <textarea 
                value={treatment} 
                onChange={(e)=>setTreatment(e.target.value)} 
                style={{width:'100%', height:'80px', marginTop:'5px'}} 
              />
            </label>
            <div style={{display:'flex', gap:'10px'}}>
              <button className="btn primary" onClick={saveMedicalRecord}>儲存病歷</button>
              <button className="btn ghost" onClick={()=>setSelectedAppt(null)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

