// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('遅延読み込み（コード分割）', () => {
  it('企業詳細は遅延チャンクだが、URLを開くと最終的に表示される', async () => {
    renderApp('/')
    // 一覧が読み込まれるまで待つ
    const openBtns = await screen.findAllByRole('button', { name: /の詳細を見る$/ }, { timeout: 8000 })
    fireEvent.click(openBtns[0])
    // 遅延ロードされた CompanyDetail が表示される
    expect(await screen.findByRole('dialog', {}, { timeout: 8000 })).toBeInTheDocument()
  }, 20000)

  it('データ分析タブを開くと遅延ロードの Dashboard が表示される', async () => {
    renderApp('/')
    const tab = await screen.findByRole('tab', { name: /データ分析/ }, { timeout: 8000 })
    fireEvent.click(tab)
    // Dashboard は React.lazy 分割。読み込み後に見出しが現れる。
    expect(
      await screen.findByRole('heading', { name: /全国の労働実態/ }, { timeout: 8000 }),
    ).toBeInTheDocument()
  }, 20000)
})
