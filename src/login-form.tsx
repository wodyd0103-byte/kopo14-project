import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from './auth-context'
import { registerLoginForm } from './login-focus'

// 좁은 화면에서는 입력칸이 제목과 자리를 다툰다. 이 폭 아래에서는 버튼만 둔다.
// App.css의 같은 값과 짝이다 — 한쪽만 바꾸면 어긋난다.
const NARROW_QUERY = '(max-width: 480px)'

interface Props {
  // 'bar'   = 헤더 구석에 놓는 한 줄짜리 (좁은 화면에서는 접힌다)
  // 'panel' = 리뷰 폼·등록 화면 자리에 놓는, 안내가 딸린 블록 (항상 펼쳐져 있다)
  variant?: 'bar' | 'panel'
  note?: string
}

// 닉네임 하나로 들어가는 로그인 폼. 화면을 가리지 않고 필요한 자리에 놓는다.
function LoginForm({ variant = 'bar', note }: Props) {
  const { login } = useAuth()
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [flash, setFlash] = useState(false)
  const [open, setOpen] = useState(false)
  // 첫 렌더부터 정확해야 한다. 나중에 고치면 넓은 폼이 한 프레임 비친다.
  const [narrow, setNarrow] = useState(
    () => window.matchMedia(NARROW_QUERY).matches,
  )
  // 쓰기 버튼을 눌러 불려 온 횟수. 펼쳐서 그려진 뒤에 포커스하려고 쓴다.
  const [prompted, setPrompted] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const collapsed = variant === 'bar' && narrow && !open

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY)
    const sync = () => setNarrow(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // 쓰기 동작이 로그인을 요구할 때 불린다.
  // 접혀 있으면 펼치기만 하고, 포커스는 아래 effect가 그려진 뒤에 맡는다.
  useEffect(() => {
    const unregister = registerLoginForm(() => {
      setOpen(true)
      setPrompted((n) => n + 1)
    })
    return () => {
      window.clearTimeout(timer.current)
      unregister()
    }
  }, [])

  useEffect(() => {
    if (!prompted) return
    inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    inputRef.current?.focus()
    // 눌렀는데 아무 일도 안 일어난 것처럼 보이지 않도록 잠깐 강조한다
    setFlash(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFlash(false), 1200)
  }, [prompted])

  // 직접 펼쳤을 때도 바로 입력할 수 있게 커서를 둔다
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // 펼쳐 놓고 마음이 바뀌면 Esc로 접는다
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      await login(nickname)
      setNickname('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        className={`login-toggle${flash ? ' flash' : ''}`}
        onClick={() => setOpen(true)}
      >
        로그인
      </button>
    )
  }

  return (
    <form
      className={`login-form ${variant}${flash ? ' flash' : ''}`}
      onSubmit={handleSubmit}
    >
      {note && <p className="login-note">{note}</p>}
      <div className="login-row">
        <input
          ref={inputRef}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임"
          aria-label="닉네임"
          maxLength={20}
          required
        />
        <button type="submit" disabled={submitting}>
          {submitting ? '…' : variant === 'bar' ? '시작' : '시작하기'}
        </button>
      </div>
    </form>
  )
}

export default LoginForm
