Backend quick start

1. Copy `.env.example` to `.env` and edit database credentials.
2. Run `npm install` in the `backend` folder.
3. Load `sql/schema.sql` into your MySQL server:

```sql
mysql -u root -p < sql/schema.sql
```

4. (選用) 匯入測試資料：

```sql
mysql -u root -p < sql/seed.sql
```

5. Start server: `npm run start` (or `npm run dev` with nodemon).

APIs:
- `POST /auth/register` { username, password, role }
- `POST /auth/login` { username, password }
- `GET /schedules`
- `POST /api/appointments` { patient_id, schedule_id } (需登入，Patient 角色)
- `GET /admin/reports/doctor-count` (需登入，Staff 角色)

Notes:
- 登入後請將回傳的 JWT 放入前端 localStorage 或 cookie，並在後續請求 header `Authorization: Bearer <token>`。

