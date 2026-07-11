import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SiteFooter } from './Legal'

/** 固定ページ（methodology / privacy / contact / 404）共通の枠。 */
export function PageShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="app">
      <header className="header">
        <div className="header__top">
          <Link to="/" className="brand brand--link">
            <span className="brand__logo">-0</span>
            <span className="brand__tag">就職者のための企業評価プラットフォーム</span>
          </Link>
        </div>
      </header>

      <nav className="page-back" aria-label="パンくず">
        <Link to="/">← 企業一覧へ戻る</Link>
      </nav>

      <main className="page" id="main">
        <h1 className="page__title">{title}</h1>
        {lead && <p className="page__lead">{lead}</p>}
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}
