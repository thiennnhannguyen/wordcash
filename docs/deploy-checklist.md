# Checklist triển khai backend

Kiểm tra từng mục trước mỗi lần deploy lên Railway, Render hoặc VPS. Biến môi trường đặt trong bảng điều khiển của nền tảng, **không** commit file `.env`.

## Biến môi trường bắt buộc

- [ ] `ENV=production`.
- [ ] `JWT_SECRET_KEY` ngẫu nhiên, **dài ít nhất 32 ký tự**; app sẽ không khởi động nếu ngắn hơn. Tạo bằng `python -c "import secrets; print(secrets.token_urlsafe(48))"`. Đổi khóa thì mọi access token đang có mất hiệu lực.
- [ ] `COOKIE_SECURE=true`. Để trống thì cũng tự bật khi `ENV=production`; đặt rõ cho chắc.
- [ ] `TRUST_PROXY=true` trên Railway và Render (app chạy sau proxy của nền tảng). Không bật thì mọi người dùng có chung IP của proxy, và giới hạn đăng nhập sai sẽ chặn nhầm cả hệ thống.
- [ ] `TRUSTED_PROXY_HOPS` bằng số proxy đứng trước app: thường là `1`; thêm Cloudflare phía trước thì `2`.
- [ ] `DATABASE_URL` của PostgreSQL production. URL dạng `postgres://` được tự đổi sang asyncpg.
- [ ] `REDIS_URL` của Redis production.
- [ ] `FRONTEND_URL` đúng địa chỉ frontend (có `https://`, không có `/` cuối). Đây cũng là Origin duy nhất được gọi `/auth/refresh` và `/auth/logout`.
- [ ] `COOKIE_DOMAIN`: để trống nếu frontend và API cùng domain. Khác subdomain thì đặt domain gốc (ví dụ `.wordclash.vn`).

## Tài liệu API

- [ ] Tắt `/docs`, `/redoc`, `/openapi.json` ở production: mặc định đã tắt khi `ENV=production`. Chỉ đặt `ENABLE_DOCS=true` khi thật sự cần, và tắt lại ngay sau đó.

## Chạy app

- [ ] Lệnh chạy: `uvicorn app.main:asgi_app --host 0.0.0.0 --port $PORT`.
- [ ] Ban đầu chạy **1 worker**. Khi tăng số worker hoặc số instance: bật sticky session trên load balancer và đặt `SIO_USE_REDIS=true`.
- [ ] Không đặt `FORWARDED_ALLOW_IPS="*"` cho uvicorn. App đã tự đọc X-Forwarded-For khi `TRUST_PROXY=true`; cho uvicorn tin mọi nguồn thì client có thể giả IP.
- [ ] Nền tảng hỗ trợ WebSocket (Railway, Render đều có). Nếu dùng Nginx thì cấu hình `Upgrade`/`Connection` cho `/socket.io/`.

## Database

- [ ] **Sao lưu trước khi nâng migration:** `sh backend/scripts/backup_db.sh "$DATABASE_URL"` (pg_dump, file
  `backups/<tên-db>_<ngày-giờ>.dump`); kiểm tra file khác rỗng và chép ra nơi lưu trữ ngoài máy chủ. Cách khôi phục: README,
  mục "Sao lưu và khôi phục database".
- [ ] Chạy `alembic upgrade head` trước khi khởi động bản mới.
- [ ] **TUYỆT ĐỐI không chạy `alembic downgrade`** trên production hay trên DB dev có dữ liệu cần giữ (downgrade xóa bảng
  và dữ liệu). Thử nâng / hạ migration chỉ trên DB e2e (`wordclash_e2e`) hoặc DB test. Bản mới lỗi thì sửa bằng migration
  mới, hoặc khôi phục từ bản sao lưu.
- [ ] Không chạy nối tiếp `alembic upgrade … && alembic downgrade …` (hay lệnh nào hạ migration) trong cùng một câu lệnh
  hoặc script trên DB thật.
- [ ] Chạy `python -m seeds.seed_mascots` sau migration để nạp hồ sơ và hình dạng linh vật (migration chỉ ghi các trường gốc). Không có route `/api/v1/dev/*` ở production (ENV=production).
- [ ] Sau lần deploy đầu tiên: **không viết lại migration cũ**, chỉ thêm migration mới.
- [ ] Bật sao lưu tự động cho PostgreSQL.
- [ ] **Kho từ:** nội dung chỉ nạp từ `backend/content/` đã qua review. Sao lưu → `python -m data_pipeline.check_content` →
  `python -m data_pipeline.07_load_to_db --level A1 --dry-run` (xem bảng thêm / sửa / ngừng dùng) → chạy lại với `--yes`.
  Không sửa nội dung trực tiếp trong DB production. Router `/api/v1/dev/content` không tồn tại ở production (có test).
- [ ] **Không có dữ liệu mẫu dev:** database production phải có **0** mục từ `DEV_SAMPLE`. Không bao giờ chạy `seeds.seed_dev_entries` ở production (script tự từ chối). Kiểm tra:
  ```sql
  SELECT count(*) FROM entries WHERE exam_tags @> '["DEV_SAMPLE"]'::jsonb;  -- phải bằng 0
  ```
  hoặc `python -m seeds.purge_dev_entries --dry-run` (phải in `'entries': 0`). Nếu khác 0: `python -m seeds.purge_dev_entries --yes` (xóa mục từ cùng tiến độ, nhật ký, liên kết khóa học, phiên học đang mở và trừ lại `mastered_count`).
- [ ] **Không có tài khoản mẫu dev:** database production không có user nào có username bắt đầu bằng `dev_` (tài khoản do `seeds.seed_dev_accounts` tạo; script tự từ chối khi ENV khác development/e2e). Kiểm tra:
  ```sql
  SELECT count(*) FROM users WHERE username LIKE 'dev\_%' ESCAPE '\';  -- phải bằng 0 (`_` trong LIKE là ký tự đại diện nên phải thoát)
  ```
  Backend cũng tự kiểm tra lúc khởi động khi `ENV=production`: còn tài khoản `dev_` thì ghi log **ERROR** (logger `wordclash.startup`) kèm số lượng và username; app vẫn chạy. Xem log ngay sau khi deploy.
- [ ] Bản build frontend đã qua `postbuild` (`scripts/check-dist.mjs`): không chứa `__wcAuthStore` hay `DEV_SAMPLE`.

## Sau khi deploy

- [ ] `GET /api/v1/health` trả `{"status": "ok", "database": true, "redis": true}`.
- [ ] Đăng ký, đăng nhập thử; trong DevTools kiểm tra cookie `wc_refresh` có `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/v1/auth`.
- [ ] `/docs` trả 404 (trừ khi đang bật `ENABLE_DOCS`).
- [ ] Log không chứa mật khẩu, token hay body của request auth.
