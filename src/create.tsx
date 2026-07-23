import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { LatLng, MenuItem, Restaurant } from './types'
import { API_URL } from './types'
import { useAuth } from './auth-context'
import ImageInput from './image-input'
import MenuEditor from './menu-editor'
import PlaceSearch, { type SelectedPlace } from './place-search'

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
  location: null,
}

// 새 음식점 등록 폼 (POST /restaurants)
function CreateRestaurant({ onCreated, onClose }: Props) {
  const { user } = useAuth()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

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

    // 신규 등록: 평점/리뷰수는 0, 찜은 false로 시작, 등록자는 현재 로그인 사용자
    const payload: Omit<Restaurant, 'id'> = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
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
      rating: 0,
      reviewCount: 0,
      isFavorite: false,
      ownerId: user?.id ?? null,
      ownerName: user?.nickname ?? '',
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
