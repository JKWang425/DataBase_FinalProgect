USE clinicdb;

-- 範例科別
INSERT INTO Department (department_name) VALUES ('內科'), ('外科'), ('兒科')
ON DUPLICATE KEY UPDATE department_name = department_name;

-- IMPORTANT: 移除 seed 中的明文密碼與直接建立帳號的動作，
-- 建議使用下列步驟建立使用者與關聯資料：
-- 1) 使用 API (`POST /auth/register`) 建立 `Users`（會自動使用 bcrypt 產生安全雜湊密碼）。
-- 2) 用 INSERT 或透過管理介面建立 Patients/Staffs/Doctors，並將 `user_id` 指向剛建立的 Users。
-- 3) 建立 Schedules 時，請先查詢對應的 doctor_id 與 staff_id。

-- 為避免在公開 repo 洩漏密碼，seed 檔只保留非敏感的資料或操作說明。
-- 範例：只建立科別，實際帳號請透過註冊 API 建立。

-- 範例科別（保留）
INSERT INTO Department (department_name) VALUES ('內科'), ('外科'), ('兒科')
ON DUPLICATE KEY UPDATE department_name = department_name;

-- 若你需要自動化建立測試帳號，建議改用後端 script（使用 bcrypt.hash）或透過 API 呼叫。
