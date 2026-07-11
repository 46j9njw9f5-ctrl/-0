import { useEffect, useState } from 'react'

/**
 * 検索用の debounce。入力欄自体は即時反映し、絞り込み計算だけを遅らせる。
 * 空文字（クリア）は遅延せず即時反映する。IME入力中も入力欄の値は妨げない
 * （このフックはフィルタ用の値を遅らせるだけで、入力の value は制御しない）。
 */
export function useDebouncedSearch(query: string, delayMs = 200): string {
  const [debounced, setDebounced] = useState(query)
  useEffect(() => {
    if (query === '') {
      setDebounced('') // クリアは速やかに反映
      return
    }
    const t = setTimeout(() => setDebounced(query), delayMs)
    return () => clearTimeout(t)
  }, [query, delayMs])
  return debounced
}
