import React, { useState } from 'react'
import api from '../../api'

// 櫃台：現場報到功能（以身分證或掛號號碼報到）
export default function CheckIn(){
  const [idNumber, setIdNumber] = useState('')
  const [apptNo, setApptNo] = useState('')
  const [msg, setMsg] = useState('')

  const handleCheckin = async (e)=>{
    e.preventDefault(); setMsg('')
    try{
      // 假設後端有 /api/checkin 的 endpoint
      const resp = await api.post('/api/checkin', { id_number: idNumber, appt_no: apptNo })
      setMsg('報到成功')
    }catch(err){
      console.error(err)
      setMsg(err?.response?.data?.error || '報到失敗')
    }
  }

  return (
    <div>
      <h4>現場報到 (Check-in)</h4>
      <div className="card">
        <form onSubmit={handleCheckin} className="form-row">
          <input placeholder="身分證字號 (id_number)" value={idNumber} onChange={e=>setIdNumber(e.target.value)} />
          <input placeholder="掛號號碼 (appt_no)" value={apptNo} onChange={e=>setApptNo(e.target.value)} />
          <div>
            <button className="btn primary" type="submit">報到</button>
          </div>
        </form>
        {msg && <p className="status">{msg}</p>}
      </div>
    </div>
  )
}
