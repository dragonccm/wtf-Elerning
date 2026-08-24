# ROADMAP — WTF E-learning

> Cập nhật: 24/08/2026 — sau khi ship classroom management, video chapters/resume, SRS flashcard drills (đã commit + QA E2E pass).
> Tham chiếu kiến trúc: [Canvas LMS](https://github.com/instructure/canvas-lms) (dữ liệu lấy 24/08/2026).

## Hiện trạng

- **Stack**: Next.js (server actions + Prisma trực tiếp) + Fastify sidecar (port 4000) + SQLite
- **Đã ship**: learn path (video/flashcard/quiz/essay/milestone), streak/XP/daily goal, classroom (announcements, assignments, sessions, materials), video chapters + resume position, SRS drills (Leitner stages 0–4)
- **Nợ kỹ thuật chính**: **split-brain data layer** — 2 hệ thống cùng viết 1 SQLite DB

## P0 — Nền móng

### 1. Thống nhất data layer

**Vấn đề**: Fastify vẫn sở hữu auth, daily/streak, learn path, node complete, quiz scoring, progress (frontend gọi qua `/api/proxy` + `/api/auth/*`). Logic streak/XP **trùng lặp** ở `backend/src/streak.ts` và `src/lib/streak.ts` — risk lệch logic. 2 process cùng giữ 1 DB.

**Kế hoạch**:
1. Khoanh vùng: enumerate mọi endpoint còn gọi sang backend (`src/lib/api-client.ts`, `src/app/api/auth/*`)
2. Port từng endpoint sang server actions + `src/lib/` — giữ đúng **1** bộ logic streak/XP
3. Fastify → loại bỏ (khuyến nghị) hoặc giữ làm API public tùy chọn

**Tham chiếu Canvas**: monolith 15 năm, 22.662 files, hàng triệu user — API là layer **trong-process** (`lib/api/v1/`, 152 resource files), không bao giờ tách thành service. Modular monolith qua 50+ gem nội bộ → bên mình: tách module rõ ràng trong `src/lib/`.

**Acceptance**: 1 nguồn truth cho auth + XP; `npm run dev` chỉ chạy 1 process; QA smoke pass.

### 2. Test + CI

**Kế hoạch**:
- **Vitest** (pure logic): SRS intervals (`drill.ts` — đủ 4 stage + lapse), quiz/essay scoring, streak/XP, deadline utils
- **Playwright smoke** (chuẩn hóa từ QA manual đã chạy): login → learn → complete node → submit quiz → drill session full SRS
- **GitHub Actions**: lint + typecheck + build + test trên mỗi push/PR

**Tham chiếu Canvas**: Jest + Vitest cho React islands; CI Gerrit + Jenkins nhiều commit/ngày.

**Acceptance**: push xanh/đỏ tự động; SRS logic không thể regress âm thầm.

## P1 — Phân biệt hóa sản phẩm

### 3. Luyện phát âm (pronunciation)

Ghi âm → chấm phát âm: Web Speech API (free, in-browser) hoặc Whisper API (chính xác hơn). Ghép vào video node + flashcard node (yêu cầu "đọc to" trước khi flip card).

**Vị thế**: feature mà **không LMS nào có** (kể cả Canvas) — moat thực sự của product. Định vị như "AI-assisted learning" cho đúng trend (migrations 2026 của Canvas: `ai_experiences`, `embeddings`).

### 4. Bulk import nội dung

Admin import CSV/XLSX từ HSK word list (hanzi, pinyin, nghĩa VI, ví dụ) → tự sinh flashcard deck + câu quiz. Hiện tại seed chỉ có 1 unit / 4 nodes; HSK1 thật ~500 từ.

**Tham chiếu Canvas SIS import**: 1 format chuẩn + validate nghiêm ngặt + báo lỗi từng dòng. Copy pattern này — không ad-hoc upload.

Mở rộng cho **bulk import học viên** (CSV: email, tên, mã lớp) — SIS import của Canvas là model cho việc sync dữ liệu học viên hàng loạt.

**Acceptance**: import 50 từ HSK1 trong 1 lần bấm; deck + quiz tạo đúng; file lỗi có thông báo từng dòng.

### 5. Retention loop (daily reminder)

Kênh: email (Resend) hoặc PWA push. Trigger: cards đến hạn + streak sắp gãy.

**Tham chiếu Canvas notification architecture** (bắt buộc áp, không hardcode 1 kênh):
- `CommunicationChannels` — abstract kênh (email/web/in-app)
- `NotificationPolicy` — ai nhận gì, khi nào
- `StreamItems` — feed thông báo bền vững

Kèm **cài đặt thông báo per-user** (bật/tắt email/in-app theo loại sự kiện — pattern "Account & Profile" của Canvas).

### 6. Rubric grading (essay)

Chấm essay theo rubric criterion-based (3–4 tiêu chí × điểm) thay vì chấm tổng.

**Tham chiếu Canvas**: rubrics + outcome rollups (SpeedGrader).

### 7. Deadline calendar + To-Do list

- **To-Do list** trên dashboard `/learn`: assignment/quiz/essay sắp đến hạn — data đã có sẵn (`Assignment.dueAt` + tiến độ node), chi phí thấp
- **Calendar view** (tháng/tuần, read-only): deadline + session đã schedule (`ClassSession.startsAt`)
- Tham chiếu Canvas: Calendar là 1 trong 4 trụ cột navigation toàn cục; To-Do list là phần sinh viên nhìn đầu tiên

**Acceptance**: học viên thấy deadline hôm nay ngay trên dashboard; click 1 To-Do item → vào thẳng bài.

## P2 — Production readiness

### 7. SQLite → Postgres + single service deploy

Prisma migration (đổi datasource gần như 1 dòng). Sau P0-1: deploy **1** Next.js service duy nhất (Railway/Fly/Vercel).

**Tham chiếu Canvas**: Postgres + job queue **Postgres-backed** (inst-jobs — fork delayed_job, không cần Redis/Sidekiq riêng) → pattern khả thi nếu cần background jobs (chấm essay, gửi reminder) mà không thêm hạ tầng.

### 8. Monitoring + security

- Sentry (free tier) cho frontend + server actions
- Rate-limit `/api/auth/*`
- Validate upload (mimetype/size) cho `/api/uploads`
- CSP headers

### 9. Accessibility pass (WCAG)

Checklist trước khi có thật user: form labels, contrast, keyboard navigation, focus states.

**Tham chiếu Canvas**: accessibility scanning tích hợp.

### 10. Teacher tools: Student View + quiz limits

- **Student View**: giáo viên chuyển UI sang góc nhìn học viên để test khóa học (pattern Canvas, chi phí thấp, giá trị cao khi teacher tự build content)
- **Quiz**: shuffle câu hỏi khi serve (data đã có) + giới hạn thời gian (thêm `timeLimitSec` vào `Assessment`)

## P3 — Để sau (chưa có value ở giai đoạn này)

| Item | Ghi chú |
|---|---|
| Live session thật | Model `ClassSession.roomKey` đã sẵn; Jitsi iframe. Value xuất hiện khi có lớp thật |
| Teacher analytics | At-risk students, retention per class |
| PWA install | Mobile learning, offline-first |
| i18n framework | Chỉ khi mở rộng audience ngoài UI tiếng Việt (Canvas có 87 locales — chưa cần) |
| AI: hints/examples per card | Embeddings — theo chiều hướng Canvas 2026 |
| Inbox: nhắn tin teacher ↔ student | Canvas Inbox; value khi có lớp thật |
| Discussions (diễn đàn) | Tương tác cộng đồng — sau khi có scale |
| Groups (làm việc nhóm) | Chỉ khi có yêu cầu group assignment |
| Parent dashboard (xem streak/tiến độ con) | Model Canvas Observer + Duolingo parents — niche hợp với language learning |
| Essay annotations (chú thích trên bài, feedback audio) | SpeedGrader pattern — sau rubric grading (P1-6) |

## Không làm (ý thức rõ — bài học từ Canvas)

- **Microservices / K8s** — monolith đủ cho 15 năm của họ, đủ cho mình
- **LTI server** — mình là product, không phải platform
- **GraphQL** — REST hiện tại đủ
- **Multi-tenancy sharding** — single-tenant product
- **Gradebook "What-If" / group trọng số điểm** — model XP + SRS của mình cố ý khác mô hình percentage-weighted grading của Canvas
- **Canvas Commons (kho học liệu chung), theme editor, terms/semesters** — feature của platform, không phải product
- **SSO SAML/LDAP** — Google OAuth + email/password đủ ở giai đoạn này
