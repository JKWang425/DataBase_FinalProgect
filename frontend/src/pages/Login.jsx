import React, { useState } from 'react'
import api from '../api'

// 簡單登入/註冊頁面：提供登入與切換註冊功能，註冊成功會自動登入並儲存 token
export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Patient')
  const [msg, setMsg] = useState('')
  const [isRegister, setIsRegister] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      const resp = await api.post('/auth/login', { username, password })
      const token = resp.data.token
      localStorage.setItem('token', token)
      // 從後端回傳的 user_id 與 role 建立 user 物件，傳回父元件
      const userObj = { userId: resp.data.user_id || 1, role: resp.data.role || 'Patient' }
      onLogin(userObj)
    } catch (err) {
      console.error(err)
      setMsg(err?.response?.data?.error || '登入失敗')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      await api.post('/auth/register', { username, password, role })
      // 註冊成功後自動登入
      const resp = await api.post('/auth/login', { username, password })
      const token = resp.data.token
      localStorage.setItem('token', token)
      const userObj = { userId: resp.data.user_id || 1, role: resp.data.role || role || 'Patient' }
      onLogin(userObj)
    } catch (err) {
      console.error(err)
      setMsg(err?.response?.data?.error || '註冊或登入失敗')
    }
  }

  return (
    <div>
      {!isRegister ? (
        <div className="card">
          <h3>登入</h3>
          <form onSubmit={handleLogin}>
            <div className="form-row">
              <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="form-row">
              <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="form-row">
              <button className="btn primary" type="submit">登入</button>
            </div>
          </form>
          <p>
            沒有帳號？ <button className="btn ghost" onClick={() => { setIsRegister(true); setMsg('') }}>註冊</button>
          </p>
        </div>
      ) : (
        <div className="card">
          <h3>註冊</h3>
          <form onSubmit={handleRegister}>
            <div className="form-row">
              <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div className="form-row">
              <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="form-row">
              <label>
                角色：
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="Patient">Patient (病患)</option>
                  <option value="Doctor">Doctor (醫師)</option>
                  <option value="Staff">Staff (櫃台)</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <button className="btn primary" type="submit">註冊並登入</button>
              <button className="btn ghost" type="button" onClick={() => { setIsRegister(false); setMsg('') }}>取消</button>
            </div>
          </form>
        </div>
      )}

      {msg && <p>{msg}</p>}
    </div>
  )
}
