import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { LatLng, MenuItem, Restaurant } from './types'
import { API_URL } from './types'
import { useAuth } from './auth-context'
import ImageInput from './image-input'
import MenuEditor from './menu-editor'
import AteEditor from './ate-editor'
import PlaceSearch, { type SelectedPlace } from './place-search'
import LoginForm from './login-form'

interface Props {
  onCreated: (restaurant: Restaurant) => void
  onClose?: () => void
}

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
  ate: string[]
  location: LatLng | null
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
  ate: [],
  location: null,
}

// 새 음식점 등록 폼 (POST /restaurants)
function CreateRestaurant({ onCreated, onClose }: Props) {
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // 등록한 사람이 누구인지 남겨야 나중에 본인만 수정할 수 있다
  if (!user) {
    return (
      <LoginForm
        variant="panel"
        note="음식점을 등록하려면 닉네임을 입력해 주세요."
      />
    )
  }

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // 검색 결과를 고르면 아는 값만 채우고 나머지는 그대로 둔다
  const handlePlaceSelect = (place: SelectedPlace) => {
    setForm((prev) => ({
      ...prev,
      name: place.name || prev.name,
      category: place.category || prev.category,
      address: place.address || prev.address,
      phone: place.phone || prev.phone,
      link: place.link || prev.link,
      location: place.location ?? prev.location,
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    // 설명을 굳이 안 적어도 상세 화면이 휑하지 않도록, 비어 있으면 누가 다녀온
    // 곳인지로 채운다. 직접 쓴 설명이 있으면 그대로 둔다.
    const description =
      form.description.trim() || `${user.nickname}님이 가본 가게`

    // 신규 등록: 평점/리뷰수는 0, 찜은 false로 시작, 등록자는 현재 로그인 사용자
    const payload: Omit<Restaurant, 'id'> = {
      name: form.name.trim(),
      category: form.category.trim(),
      description,
      address: form.address.trim(),
      location: form.location,
      phone: form.phone.trim() === '' ? null : form.phone.trim(),
      hours: form.hours.trim() === '' ? null : form.hours.trim(),
      image: form.image.trim(),
      link: form.link.trim(),
      // 이름이 비어 있는 줄은 저장하지 않는다
      menu: form.menu
        .map((row) => ({ name: row.name.trim(), price: row.price.trim() }))
        .filter((row) => row.name !== ''),
      ate: form.ate,
      rating: 0,
      reviewCount: 0,
      // 등록자를 반드시 남긴다. 없으면 나중에 아무도 고치거나 지울 수 없다.
      ownerId: user.id,
      ownerName: user.nickname,
    }

    try {
      const res = await fetch(`${API_URL}/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('등록에 실패했습니다.')

      const created: Restaurant = await res.json()
      onCreated(created)
      setForm(EMPTY_FORM)
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="restaurant-form" onSubmit={handleSubmit}>
      <h2>음식점 등록</h2>

      {/* 상호로 찾으면 이름·카테고리·주소·위치가 한 번에 채워진다 */}
      <PlaceSearch onSelect={handlePlaceSelect} />

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
          placeholder={`비워 두면 '${user.nickname}님이 가본 가게'로 들어갑니다`}
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

      <AteEditor
        ate={form.ate}
        onChange={(ate) => setForm((prev) => ({ ...prev, ate }))}
      />

      <MenuEditor
        menu={form.menu}
        onChange={(menu) => setForm((prev) => ({ ...prev, menu }))}
      />

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? '등록 중…' : '등록'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}>
            취소
          </button>
        )}
      </div>
    </form>
  )
}

export default CreateRestaurant
