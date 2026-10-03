-- Chạy một lần khi volume PostgreSQL còn trống: tạo thêm database test riêng cho pytest.
CREATE DATABASE wordclash_test OWNER wordclash;
-- Database riêng cho kiểm thử đầu-cuối (Playwright, frontend/e2e). e2e/start-backend.sh cũng tự tạo nếu chưa có.
CREATE DATABASE wordclash_e2e OWNER wordclash;
