import { useState } from 'react'
import type { Restaurant } from './types'
import { API_URL } from './types'
import ConfirmModal from './confirm-modal'

interface Props {
  restaurant: Restaurant
  onDeleted: (id: number) => void
}

// 음식점 삭제 버튼 (DELETE /restaurants/:id) — 삭제 전 확인 모달 표시
function DeleteRestaurant({ restaurant, onDeleted }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setConfirming(false)
    setDeleting(true)
    try {
      const res = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('삭제에 실패했습니다.')

      onDeleted(restaurant.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="delete-btn"
        onClick={() => setConfirming(true)}
        disabled={deleting}
      >
        {deleting ? '삭제 중…' : '삭제'}
      </button>

      {confirming && (
        <ConfirmModal
          message={`'${restaurant.name}'을(를) 삭제할까요?`}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  )
}

export default DeleteRestaurant
