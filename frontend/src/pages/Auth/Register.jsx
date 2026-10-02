/*
 * Đăng ký.
 *
 * Kiểm tra đầu vào ở client; lỗi "Email này đã được dùng" sẽ do server trả về.
 * TODO: gọi API đăng ký (gửi kèm múi giờ) khi backend có routes/auth.py.
 * Tạm thời: email trong DEMO_TAKEN_EMAILS giả lập lỗi trùng email; `?demo=error` mở sẵn trạng thái lỗi.
 */

import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EnvelopeSimple, GlobeHemisphereEast, Lightning, User } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Checkbox from '../../components/ui/Checkbox'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { MIN_PASSWORD_LENGTH } from '../../utils/password'
import { detectTimezone, TIMEZONES } from '../../utils/timezones'
import AuthLayout from './AuthLayout'
import PasswordField from './PasswordField'

// Giả lập phản hồi server cho tới khi có API
const DEMO_TAKEN_EMAILS = ['nhan@wordclash.vn']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(form) {
  const errors = {}
  if (!form.displayName.trim()) errors.displayName = 'Nhập tên hiển thị.'
  if (!EMAIL_PATTERN.test(form.email)) errors.email = 'Email chưa đúng định dạng.'
  else if (DEMO_TAKEN_EMAILS.includes(form.email.trim().toLowerCase())) errors.email = 'Email này đã được dùng.'
  if (form.password.length < MIN_PASSWORD_LENGTH) errors.password = `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
  if (!form.agreed) errors.agreed = 'Bạn cần đồng ý với điều khoản để tiếp tục.'
  return errors
}

export default function Register() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const demoError = params.get('demo') === 'error'

  const [form, setForm] = useState(() => ({
    displayName: demoError ? 'Nhân' : '',
    email: demoError ? DEMO_TAKEN_EMAILS[0] : '',
    password: demoError ? 'Wordclash2026' : '',
    timezone: detectTimezone(),
    agreed: demoError,
  }))
  const [errors, setErrors] = useState(() => (demoError ? { email: 'Email này đã được dùng.' } : {}))
  const [attempt, setAttempt] = useState(0)

  const set = (field) => (event) =>
    setForm((f) => ({ ...f, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const submit = (event) => {
    event.preventDefault()
    const next = validate(form)
    setErrors(next)
    setAttempt((n) => n + 1)
    if (Object.keys(next).length === 0) navigate('/onboarding')
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
          key={fieldKey('displayName')}
          label="Tên hiển thị"
          icon={User}
          autoComplete="nickname"
          value={form.displayName}
          onChange={set('displayName')}
          status={errors.displayName ? 'error' : undefined}
          hint={errors.displayName}
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
          options={TIMEZONES}
          value={form.timezone}
          onChange={set('timezone')}
          hint="Dùng để tính Cửa Ải và streak mỗi ngày."
        />
        <div className="flex flex-col gap-1">
          <Checkbox checked={form.agreed} onChange={set('agreed')} error={!!errors.agreed}>
            Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật của WORDCLASH.
          </Checkbox>
          {errors.agreed && <p className="pl-10 text-caption font-medium text-danger-deep">{errors.agreed}</p>}
        </div>
        <Button type="submit" size="lg" icon={Lightning} fullWidth>
          Tạo tài khoản
        </Button>
      </form>
    </AuthLayout>
  )
}
