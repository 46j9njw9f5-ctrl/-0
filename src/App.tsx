import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'

// 固定ページ・企業詳細は遅延読み込み（初期バンドルから分離）。
const CompanyDetailRoute = lazy(() => import('./pages/CompanyDetailRoute'))
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomePage />}>
          <Route index element={null} />
          <Route path="company/:id" element={<CompanyDetailRoute />} />
        </Route>
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
