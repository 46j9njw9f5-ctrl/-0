import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 本番デプロイ（GitHub Pages）の発火条件を検証する。
const yml = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows', 'deploy.yml'),
  'utf8',
)

describe('GitHub Pages デプロイ設定', () => {
  it('main への push がトリガに含まれる', () => {
    expect(yml).toMatch(/on:[\s\S]*push:[\s\S]*branches:[\s\S]*-\s*main/)
  })

  it('deploy ジョブは pull_request では実行されない（PRではデプロイしない）', () => {
    expect(yml).toMatch(/deploy:[\s\S]*if:\s*github\.event_name\s*!=\s*'pull_request'/)
  })

  it('成果物アップロードも pull_request では行わない', () => {
    expect(yml).toMatch(/upload-pages-artifact[\s\S]*if:\s*github\.event_name\s*!=\s*'pull_request'/)
  })
})
