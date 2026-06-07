const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_this_secret_in_production';

// 驗證 JWT 並把 user 資訊附加到 req.user
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // user:{ user_id, role }
    next();
  });
}

// 檢查使用者 role 是否包含在允許清單內
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowedRoles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { authenticateToken, requireRole };
