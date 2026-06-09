import React, { useState, useEffect } from 'react'
import api from '../../api'

export default function UserList() {
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const resp = await api.get('/api/users')
      setUsers(resp.data || [])
    } catch (err) {
      console.error(err)
      setMsg('載入使用者名單失敗')
    }
  }

  return (
    <div>
      <h4>使用者名單 (所有人的 ID)</h4>
      <div className="card">
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th>User ID</th>
              <th>帳號 (Username)</th>
              <th>角色 (Role)</th>
              <th>詳細 ID (Patient/Doctor/Staff)</th>
              <th>身分證字號</th>
              <th>姓名</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              let detailId = ''
              let idNumber = ''
              let name = ''

              if (u.role === 'Patient') {
                detailId = `Patient ID: ${u.patient_id || 'N/A'}`
                idNumber = u.id_number || 'N/A'
                name = u.patient_name || 'N/A'
              } else if (u.role === 'Doctor') {
                detailId = `Doctor ID: ${u.doctor_id || 'N/A'}`
                name = u.doctor_name || 'N/A'
              } else if (u.role === 'Staff') {
                detailId = `Staff ID: ${u.staff_id || 'N/A'}`
                name = u.staff_name || 'N/A'
              }

              return (
                <tr key={u.user_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td>{u.user_id}</td>
                  <td>{u.username}</td>
                  <td>{u.role}</td>
                  <td>{detailId}</td>
                  <td>{idNumber}</td>
                  <td>{name}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {msg && <p className="status" style={{ color: 'red' }}>{msg}</p>}
      </div>
    </div>
  )
}
