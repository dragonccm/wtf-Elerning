# WTF E-learning

Hệ thống e-learning tiếng Trung — UI/UX-first, chuỗi học bài, phân tầng Admin > Giáo viên > Học viên.

## Kiến trúc

```
backend/          Fastify API (port 4000) — auth JWT, streak, học tập
src/              Next.js frontend (port 3000) — UI only + proxy /api/v1/*
prisma/           Database schema (SQLite dev)
```

Frontend gọi backend qua proxy: `/api/v1/*` → `http://localhost:4000/*`

## Chạy local

```bash
npm install
cd backend && npm install && cd ..
npx prisma migrate dev
npm run db:seed
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/health

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

## API endpoints (backend)

```
POST /auth/login, /auth/register
GET  /me, /daily, /learn/path
POST /nodes/:id/complete
POST /assessments/:id/submit
```
