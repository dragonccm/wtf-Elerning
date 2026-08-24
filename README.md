# WTF E-learning

Hệ thống e-learning tiếng Trung — UI/UX-first, chuỗi học bài, phân tầng Admin > Giáo viên > Học viên.

## Kiến trúc

```
src/ — Next.js app (port 3000) — UI + server actions + Prisma + in-process routes /api/me, /api/daily, /api/auth/*, /api/uploads
prisma/           Database schema (SQLite dev)
```

## Chạy local

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

- Web: http://localhost:3000

### Tài khoản demo

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@wtf.edu | password123 |
| Giáo viên | teacher@wtf.edu | password123 |
| Học viên | student@wtf.edu | password123 |

## Daily habit (retention)

- **Streak** — đăng nhập + hoàn thành bài → giữ chuỗi ngày
- **Daily goal** — mục tiêu 20 XP/ngày (hiển thị trên path + sidebar PC)
- **XP** — cộng khi hoàn thành node / nộp quiz qua API

## API endpoints

Auth và learning actions chạy trong Next.js: server actions + in-process routes
(login/register qua form /login /register, /api/me, /api/daily, /api/auth/google*, /api/uploads).
