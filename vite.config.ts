/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// GitHub Pages（プロジェクトサイト）では base を `/<repo>/` にする必要がある。
// 環境変数 VITE_BASE で上書き可能（カスタムドメインや独自ホスティング時は '/'）。
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: {
    globals: true,
    // 既定は node（エンジンの純粋関数テスト）。コンポーネントテストは
    // 各ファイル先頭の `// @vitest-environment jsdom` で jsdom を使う。
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
})
