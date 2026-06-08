import React, { useEffect, useState } from 'react'
import Login from './pages/Login'
import StaffPanel from './pages/StaffPanel'
import DoctorPanel from './pages/DoctorPanel'
import PatientPanel from './pages/PatientPanel'

export default function App() {
  const [user, setUser] = useState(null) // { userId, role }

  // 嘗試從 localStorage 保持登入狀態（只保存 token 與簡單 user 物件）
  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      const stored = localStorage.getItem('user')
      if (token && stored) {
        setUser(JSON.parse(stored))
      }
    } catch (e) {
      console.warn('Restore user failed', e)
    }
  }, [])

  const handleLogin = (u) => {
    setUser(u)
    try { localStorage.setItem('user', JSON.stringify(u)) } catch (e) {}
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <div className="app-container">
      <div className="topbar">
        <div className="brand">醫院預約系統</div>
        {user && (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{color:'#fff',opacity:0.9}}>角色：{user.role}</div>
            <button className="logout-btn" onClick={handleLogout}>登出</button>
          </div>
        )}
      </div>

      <div className="card">
        {!user ? (
          <div className="auth-card">
            <Login onLogin={handleLogin} />
          </div>
        ) : (
          <div className="grid">
            <div style={{flex: 1}}>
              {user.role === 'Patient' && <PatientPanel patientId={user.userId} />}
              {user.role === 'Doctor' && <DoctorPanel />}
              {user.role === 'Staff' && <StaffPanel />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

