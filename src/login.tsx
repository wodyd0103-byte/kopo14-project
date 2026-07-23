import { useState, type FormEvent } from 'react'
import { useAuth } from './auth-context'

// 로그인 화면 — 닉네임을 입력하면 앱으로 들어간다
function Login() {
  const { login } = useAuth()
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await login(nickname)
    } catch (err) {
      alert(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>내가 방문한 음식점</h1>
        <p className="login-sub">
          닉네임을 입력하고 시작하세요.
          <br />
          같은 닉네임으로 다시 오면 내 좋아요가 그대로 남아 있어요.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
            aria-label="닉네임"
            maxLength={20}
            autoFocus
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? '들어가는 중…' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
