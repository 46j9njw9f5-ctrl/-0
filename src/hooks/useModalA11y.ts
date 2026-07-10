import { useEffect, useRef } from 'react'

// モーダルのアクセシビリティ制御をまとめたフック。
//  - 開いた直後に先頭要素へフォーカス
//  - Tab フォーカストラップ（末尾→先頭 / 先頭→末尾で循環）
//  - Esc で閉じる
//  - 閉じた後に、開く前のフォーカス位置へ復帰
//  - 背景スクロールを停止
// 返り値の ref をモーダルのコンテナ要素に付与する。

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useModalA11y<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const container = ref.current
    const previouslyFocused = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null

    // 背景スクロール停止
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusables = () =>
      container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)) : []

    // 初期フォーカス
    const first = focusables()[0]
    if (first) first.focus()
    else container?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab' && container) {
        const f = focusables()
        if (!f.length) {
          e.preventDefault()
          container.focus()
          return
        }
        const firstEl = f[0]
        const lastEl = f[f.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === firstEl || active === container)) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && active === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      // フォーカス復元
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [onClose])

  return ref
}
