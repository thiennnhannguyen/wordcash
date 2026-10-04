/*
 * Đăng ký: tên hiển thị, tên người dùng (gợi ý quy tắc ngay dưới ô), email, mật khẩu, múi giờ.
 *
 * Gọi POST /auth/register qua authStore (gửi display_name, username, email, password, timezone).
 * Múi giờ tự lấy từ Intl.DateTimeFormat().resolvedOptions().timeZone (người dùng vẫn đổi được).
 * Client chỉ kiểm tra nhanh để báo sớm; server là nơi kiểm tra cuối cùng: lỗi theo từng ô lấy từ
 * VALIDATION_ERROR (details[].field) hoặc 409 EMAIL_TAKEN / USERNAME_TAKEN (details.field).
 * Thành công → /onboarding.
 */

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { At, EnvelopeSimple, GlobeHemisphereEast, Lightning, User, WarningCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Checkbox from '../../components/ui/Checkbox'
import Icon from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { useAuthStore } from '../../store/authStore'
import { fieldErrors, messageFor } from '../../utils/errorMessages'
import { MIN_PASSWORD_LENGTH } from '../../utils/password'
import { browserTimezone, TIMEZONES } from '../../utils/timezones'
import AuthLayout from './AuthLayout'
import PasswordField from './PasswordField'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Khớp backend: 3–20 ký tự chữ thường không dấu, số, dấu chấm, gạch dưới; không bắt đầu/kết thúc bằng dấu chấm
const USERNAME_PATTERN = /^(?!\.)[a-z0-9._]{3,20}(?<!\.)$/
const USERNAME_RULE = '3–20 ký tự: chữ thường không dấu, số, dấu chấm (.) và gạch dưới (_). Không bắt đầu hay kết thúc bằng dấu chấm.'

function validate(form) {
  const errors = {}
  if (!form.display_name.trim()) errors.display_name = 'Nhập tên hiển thị.'
  if (!USERNAME_PATTERN.test(form.username)) errors.username = USERNAME_RULE
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Email chưa đúng định dạng.'
  if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
  if (!form.agreed) errors.agreed = 'Bạn cần đồng ý với điều khoản để tiếp tục.'
  return errors
}

export default function Register() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [form, setForm] = useState(() => ({ display_name: '', username: '', email: '', password: '', timezone: browserTimezone(), agreed: false }))
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)

  // Múi giờ của trình duyệt chưa có trong danh sách thì thêm vào đầu để không bị đổi ngầm
  const timezones = useMemo(
    () => (TIMEZONES.some((t) => t.value === form.timezone) ? TIMEZONES : [{ value: form.timezone, label: `${form.timezone} (máy của bạn)` }, ...TIMEZONES]),
    [form.timezone],
  )

  const set = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((f) => ({ ...f, [field]: field === 'username' ? value.toLowerCase().replace(/\s/g, '') : value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    const next = validate(form)
    setErrors(next)
    setFormError(null)
    setAttempt((n) => n + 1)
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await register({
        display_name: form.display_name.trim(),
        username: form.username,
        email: form.email.trim(),
        password: form.password,
        timezone: form.timezone,
      })
      navigate('/onboarding', { replace: true })
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      if (!Object.keys(byField).length) setFormError(messageFor(err))
    } finally {
      setPending(false)
    }
  }

  // key đổi theo lần gửi để ô lỗi rung lại mỗi lần bấm
  const fieldKey = (name) => `${name}-${errors[name] ? attempt : 0}`

  return (
    <AuthLayout
      title="Tạo tài khoản chiến binh"
      subtitle="Miễn phí. Mất chưa tới một phút."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-bold text-primary underline decoration-2 underline-offset-4">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Input
          key={fieldKey('display_name')}
          label="Tên hiển thị"
          icon={User}
          autoComplete="nickname"
          maxLength={30}
          value={form.display_name}
          onChange={set('display_name')}
          status={errors.display_name ? 'error' : undefined}
          hint={errors.display_name ?? 'Tên bạn bè nhìn thấy, có dấu cũng được.'}
        />
        <Input
          key={fieldKey('username')}
          label="Tên người dùng"
          icon={At}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={20}
          value={form.username}
          onChange={set('username')}
          status={errors.username ? 'error' : form.username && USERNAME_PATTERN.test(form.username) ? 'success' : undefined}
          hint={errors.username ?? USERNAME_RULE}
        />
        <Input
          key={fieldKey('email')}
          label="Email"
          type="email"
          icon={EnvelopeSimple}
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          status={errors.email ? 'error' : undefined}
          hint={errors.email}
        />
        <PasswordField
          key={fieldKey('password')}
          label="Mật khẩu"
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          showStrength
          status={errors.password ? 'error' : undefined}
          hint={errors.password}
        />
        <Select
          label="Múi giờ"
          icon={GlobeHemisphereEast}
          options={timezones}
          value={form.timezone}
          onChange={set('timezone')}
          hint={errors.timezone ?? 'Tự lấy theo máy của bạn. Dùng để tính Cửa Ải và streak mỗi ngày.'}
        />
        <div className="flex flex-col gap-1">
          <Checkbox checked={form.agreed} onChange={set('agreed')} error={!!errors.agreed}>
            Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của WORDCLASH.
          </Checkbox>
          {errors.agreed && <p className="pl-10 text-caption font-medium text-danger-deep">{errors.agreed}</p>}
        </div>
        {formError && (
          <p role="alert" className="flex items-center gap-2 rounded-card border-2 border-danger bg-surface p-3 font-semibold text-danger-deep">
            <Icon icon={WarningCircle} size={22} className="shrink-0" />
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" icon={Lightning} fullWidth disabled={pending}>
          {pending ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
        </Button>
      </form>
    </AuthLayout>
  )
}
