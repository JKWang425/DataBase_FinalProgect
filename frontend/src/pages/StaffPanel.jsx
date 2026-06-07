import React, { useState } from 'react'
import ManageSchedules from './Staff/ManageSchedules'
import CheckIn from './Staff/CheckIn'
import ManageAppointments from './Staff/ManageAppointments'

export default function StaffPanel(){
  const [tab, setTab] = useState('schedules')
  return (
    <div>
      <h3>櫃台 / 後台 管理面板</h3>
      <div style={{display:'flex',gap:12,marginBottom:12}}>
        <button className={`btn ${tab==='schedules'?'primary':'ghost'}`} onClick={()=>setTab('schedules')}>Manage Schedules</button>
        <button className={`btn ${tab==='checkin'?'primary':'ghost'}`} onClick={()=>setTab('checkin')}>Check-in</button>
        <button className={`btn ${tab==='appts'?'primary':'ghost'}`} onClick={()=>setTab('appts')}>Manage Appointments</button>
      </div>

      {tab==='schedules' && <ManageSchedules />}
      {tab==='checkin' && <CheckIn />}
      {tab==='appts' && <ManageAppointments />}
    </div>
  )
}
