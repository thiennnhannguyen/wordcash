/*
 * Đăng nhập bằng email hoặc tên người dùng (gửi `identifier`) qua authStore → POST /auth/login.
 *
 * Thành công: quay lại trang người dùng định vào trước khi bị chuyển tới đây (`location.state.from`), mặc định Sảnh;
 * route guard tự đưa người chưa xong onboarding sang /onboarding. Phiên vừa hết hạn thì hiện thông báo phía trên form.
 */

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GoogleLogo, Info, Sword, User, WarningCircle } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import Input from '../../components/ui/Input'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { fieldErrors, messageFor } from '../../utils/errorMessages'
import AuthLayout, { OrDivider } from './AuthLayout'
import PasswordField from './PasswordField'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAuthStore((s) => s.login)
  const expired = useAuthStore((s) => s.expired)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [pending, setPending] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const next = {}
    if (!identifier.trim()) next.identifier = 'Nhập email hoặc tên người dùng.'
    if (!password) next.password = 'Nhập mật khẩu.'
    setErrors(next)
    setFormError(null)
    setAttempt((n) => n + 1)
    if (Object.keys(next).length) return
    setPending(true)
    try {
      await login({ identifier: identifier.trim(), password })
      const from = location.state?.from
      navigate(from ? `${from.pathname}${from.search ?? ''}` : '/lobby', { replace: true })
    } catch (err) {
      const byField = fieldErrors(err)
      setErrors(byField)
      if (!Object.keys(byField).length) setFormError(messageFor(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthLayout
      title="Mừng chiến binh trở lại!"
      subtitle="Đăng nhập để giữ streak và vào trận."
      footer={
        <>
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-bold text-primary underline decoration-2 underline-offset-4">
            Đăng ký
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {expired && !formError && (
          <p role="status" className="flex items-center gap-2 rounded-card border-2 border-line bg-raised p-3 font-semibold">
            <Icon icon={Info} size={22} color="primary" className="shrink-0" />
            Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại nhé.
          </p>
        )}
        <Input
          key={`identifier-${errors.identifier ? attempt : 0}`}
          label="Email hoặc tên người dùng"
          icon={User}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          status={errors.identifier ? 'error' : undefined}
          hint={errors.identifier}
        />
        <div className="flex flex-col gap-2">
          <PasswordField
            key={`password-${errors.password ? attempt : 0}`}
            label="Mật khẩu"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            status={errors.password ? 'error' : undefined}
            hint={errors.password}
          />
          <Link to="/forgot-password" className="inline-flex h-11 items-center self-end font-semibold text-primary hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        {formError && (
          <p role="alert" className="flex items-center gap-2 rounded-card border-2 border-danger bg-surface p-3 font-semibold text-danger-deep">
            <Icon icon={WarningCircle} size={22} className="shrink-0" />
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" icon={Sword} fullWidth disabled={pending}>
          {pending ? 'Đang vào…' : 'Vào trận'}
        </Button>
        <OrDivider />
        {/* TODO: đăng nhập Google (OAuth) */}
        <Button
          variant="secondary"
          size="lg"
          icon={GoogleLogo}
          fullWidth
          onClick={() => useToastStore.getState().push({ variant: 'info', title: 'Sắp ra mắt', message: 'Đăng nhập Google sẽ có ở giai đoạn sau.' })}
        >
          Tiếp tục với Google
        </Button>
      </form>
    </AuthLayout>
  )
}
