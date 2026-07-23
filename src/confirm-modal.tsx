import { useEffect } from 'react'

interface Props {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

// 공용 삭제 확인 모달 (배경 클릭 / ESC로 취소)
function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    // 모양은 App.css가 정한다. 여기서 배경을 흰색으로 박아 두었더니
    // 다크 모드에서 글자색만 밝아져 흰 바탕에 흰 글씨가 됐다.
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-content" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-ok" onClick={onConfirm}>
            삭제
          </button>
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
