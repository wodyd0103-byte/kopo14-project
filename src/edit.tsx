import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { API_URL } from './types'
import { useAuth } from './auth-context'
import { useRestaurants } from './restaurant-context'
import type { MenuItem } from './types'
import DeleteRestaurant from './delete'
import ImageInput from './image-input'
import MenuEditor from './menu-editor'
import LoginForm from './login-form'

type FormState = {
  name: string
  category: string
  description: string
  address: string
  phone: string
  hours: string
  image: string
  link: string
  menu: MenuItem[]
}

const EMPTY_FORM: FormState = {
  name: '',
  category: '',
  description: '',
  address: '',
  phone: '',
  hours: '',
  image: '',
  link: '',
  menu: [],
}

// 수정 페이지(/edit/:id): useParams로 대상 id를 읽어 기존 항목을 수정/삭제
function EditRestaurant() {
  const { id } = useParams()
  const { restaurants, reload } = useRestaurants()
  const { user } = useAuth()
  const navigate = useNavigate()

  const restaurant = restaurants.find((r) => r.id === Number(id))

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // 대상 항목이 준비되면 폼을 기존 값으로 채움 (phone/hours는 null → 빈 문자열)
  useEffect(() => {
    if (restaurant) {
      setForm({
        name: restaurant.name,
        category: restaurant.category,
        description: restaurant.description,
        address: restaurant.address,
        phone: restaurant.phone ?? '',
        hours: restaurant.hours ?? '',
        image: restaurant.image,
        link: restaurant.link ?? '',
        menu: restaurant.menu ?? [],
      })
    }
  }, [restaurant])

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // 항목 수정 (PATCH) → 재조회 후 목록으로 이동
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!restaurant || submitting) return
    setSubmitting(true)

    // 설명 정보만 부분 수정 (평점/리뷰수/찜 상태는 기존 값 유지)
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      address: form.address.trim(),
      phone: form.phone.trim() === '' ? null : form.phone.trim(),
      hours: form.hours.trim() === '' ? null : form.hours.trim(),
      image: form.image.trim(),
      link: form.link.trim(),
      // 이름이 비어 있는 줄은 저장하지 않는다
      menu: form.menu
        .map((row) => ({ name: row.name.trim(), price: row.price.trim() }))
        .filter((row) => row.name !== ''),
    }

    try {
      const res = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('수정에 실패했습니다.')

      await reload() // 수정 후 다시 GET
      navigate('/') // 저장 후 목록으로 이동
    } catch (err) {
      alert(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // id에 해당하는 항목이 없으면 안내
  if (!restaurant) {
    return (
      <div className="edit-page">
        <p className="empty">해당 음식점을 찾을 수 없습니다.</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  // 주소를 직접 치고 들어온 경우까지 막는다
  if (!user) {
    return (
      <div className="edit-page">
        <LoginForm
          variant="panel"
          note="음식점을 수정하려면 닉네임을 입력해 주세요."
        />
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  // 등록자 본인만 수정 가능 (등록자 정보가 없는 공용/레거시 데이터는 허용)
  const canManage = !restaurant.ownerId || restaurant.ownerId === user.id
  if (!canManage) {
    return (
      <div className="edit-page">
        <p className="empty">내가 등록한 음식점만 수정할 수 있어요.</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  return (
    <form className="restaurant-form" onSubmit={handleSubmit}>
      <h2>음식점 수정</h2>

      <label>
        이름
        <input name="name" value={form.name} onChange={handleChange} required />
      </label>
      <label>
        카테고리
        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          required
        />
      </label>
      <label>
        설명
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
        />
      </label>
      <label>
        주소
        <input name="address" value={form.address} onChange={handleChange} />
      </label>
      <label>
        전화번호
        <input name="phone" value={form.phone} onChange={handleChange} />
      </label>
      <label>
        영업시간
        <input name="hours" value={form.hours} onChange={handleChange} />
      </label>
      <label>
        홈페이지·SNS 주소
        <input name="link" value={form.link} onChange={handleChange} />
      </label>

      <ImageInput value={form.image} onChange={handleChange} />

      <MenuEditor
        menu={form.menu}
        onChange={(menu) => setForm((prev) => ({ ...prev, menu }))}
      />

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? '저장 중…' : '저장'}
        </button>
        {/* 삭제(DELETE) → 재조회 후 목록으로 이동 */}
        <DeleteRestaurant
          restaurant={restaurant}
          onDeleted={async () => {
            await reload()
            navigate('/')
          }}
        />
        <button type="button" onClick={() => navigate('/')}>
          취소
        </button>
      </div>
    </form>
  )
}

export default EditRestaurant
