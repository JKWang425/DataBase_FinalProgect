const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

/*
  建立 MySQL 連線池 (Pool)
  - 使用連線池可以重複利用底層 TCP 連線，避免每次查詢都建立/關閉連線，
    提升效能並減少資料庫資源消耗。
  - 常見參數說明：
    - host / user / password / database：資料庫連線資訊，建議從環境變數載入。
    - waitForConnections: 當達到 connectionLimit 時，是否等待可用連線 (true 表示等待)
    - connectionLimit: 同時允許的最大連線數（取決於系統與 DB 能力，預設設為 10）
    - queueLimit: 當達到 connectionLimit 時，最大排隊請求數（0 表示無上限）
*/
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clinic_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 匯出 pool 供其他模組使用（可直接呼叫 pool.execute / pool.getConnection 等方法）
module.exports = pool;
