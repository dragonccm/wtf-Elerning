<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Qwen3 AI Agent Operating Guidelines & Tool Matrix

You are powered by the **Qwen3.8-27B** ecosystem with native multimodal vision, 256K context, neural tool-calling parser, and specialized **Qwen3-Embedding-0.6B + Qwen3-Reranker-0.6B** RAG backend.

## 1. Tool Selection Decision Matrix (BẮT BUỘC TUÂN THỦ)

When gathering information or searching the codebase, choose your tool according to this decision tree:

| Mục đích tìm kiếm | Công cụ ưu tiên số 1 | Lý do |
|---|---|---|
| **Tìm tính năng / Logic nghiệp vụ / Ý niệm** (VD: "chỗ xử lý login", "tính toán giỏ hàng", "API thanh toán") | `semantic_code_search` *(Qwen RAG)* | Quét vector 1024-dim và Neural Rerank trong vài mili-giây, tìm đúng code ngay cả khi không biết tên hàm/file. |
| **Tìm chính xác chuỗi ký tự / Tên biến / Import cụ thể** (VD: `import { auth }`, `USER_STATUS_ACTIVE`) | `grep` / `glob` | Tìm kiếm chuỗi ký tự chuẩn xác qua regex. |
| **Kiểm tra kiểu dữ liệu (Types) / Định nghĩa hàm / Chẩn đoán lỗi Type** | `lsp` / LSP tools | Tận dụng TypeScript/Python Language Server để lấy type signature chuẩn xác 100%. |
| **Tra cứu tài liệu thư viện bên ngoài / Framework mới** | `context7` / `websearch` | Lấy documentation chuẩn xác và cập nhật nhất từ internet. |
| **Đọc mã nguồn** | `read` | Chỉ đọc các dải dòng cần thiết (slice reading), tránh đọc tràn lan các file quá lớn. |

## 2. Quy tắc Viết & Sửa Code

1. **Sửa code tối thiểu (Minimal Surgical Diffs)**: Luôn sử dụng lệnh chỉnh sửa (`edit`) để thay thế đúng đoạn code cần sửa, không viết lại toàn bộ file nếu không cần thiết.
2. **Thực thi song song (Batch Tooling)**: Khi cần đọc hoặc kiểm tra nhiều file liên quan, hãy gọi đồng thời các công cụ trong cùng một turn để tiết kiệm thời gian.
3. **Kiểm tra sau khi sửa (Verify)**: Luôn chạy build hoặc test liên quan sau khi hoàn tất chỉnh sửa để đảm bảo không phát sinh lỗi cú pháp hoặc lỗi logic.

## 3. Khai thác Thị giác (Multimodal Vision)

* Mô hình có khả năng phân tích hình ảnh bản địa (Native VLM).
* Khi giải quyết các vấn đề về giao diện người dùng (UI/UX), vỡ layout CSS, hoặc lỗi hiển thị: Bạn có thể chủ động gợi ý người dùng kéo-thả ảnh chụp màn hình (screenshot) hoặc bản thiết kế Figma vào khung chat để phân tích và sinh code chính xác.
