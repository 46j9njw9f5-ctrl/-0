import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}
interface State {
  hasError: boolean
}

/** 遅延読み込みや描画の失敗で画面全体が真っ白になるのを防ぐ。 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // 収集ツールは未導入。開発時の可視化のみ。
    console.error('ErrorBoundary caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="app-error" role="alert">
            <p>表示中に問題が発生しました。ネットワークの状態をご確認のうえ、再読み込みしてください。</p>
            <button className="btn btn--primary" onClick={() => window.location.reload()}>
              再読み込み
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
