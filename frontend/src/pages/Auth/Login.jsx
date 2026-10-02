/*
 * Đăng nhập.
 *
 * TODO: gọi API đăng nhập (services/api.js, lưu JWT vào authStore) khi backend có routes/auth.py.
 * Hiện chỉ kiểm tra đầu vào rồi chuyển sang Sảnh.
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogo, Sword, User } from '@phosphor-icons/react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import AuthLayout, { OrDivider } from './AuthLayout'
import PasswordField from './PasswordField'

export default function Login() {
  const navigate = useNavigate()
  const [identity, setIdentity] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [attempt, setAttempt] = useState(0)

  const submit = (event) => {
    event.preventDefault()
    const next = {}
    if (!identity.trim()) next.identity = 'Nhập email hoặc tên người dùng.'
    if (!password) next.password = 'Nhập mật khẩu.'
    setErrors(next)
    setAttempt((n) => n + 1)
    if (Object.keys(next).length === 0) navigate('/lobby')
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
        <Input
          key={`identity-${errors.identity ? attempt : 0}`}
          label="Email hoặc tên người dùng"
          icon={User}
          autoComplete="username"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          status={errors.identity ? 'error' : undefined}
          hint={errors.identity}
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
        <Button type="submit" size="lg" icon={Sword} fullWidth>
          Vào trận
        </Button>
        <OrDivider />
        {/* TODO: đăng nhập Google (OAuth) */}
        <Button variant="secondary" size="lg" icon={GoogleLogo} fullWidth>
          Tiếp tục với Google
        </Button>
      </form>
    </AuthLayout>
  )
}
