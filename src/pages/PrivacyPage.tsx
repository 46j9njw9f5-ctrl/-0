import { PageShell } from '../components/PageShell'
import { PrivacyContent } from '../components/Legal'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function PrivacyPage() {
  useDocumentMeta({
    title: 'プライバシーポリシー | -0（ゼロ）',
    description:
      '当サイトが保存する情報、Cookie と広告、アフィリエイト、アクセス解析、免責事項についてのプライバシーポリシーです。',
    path: '/privacy',
    ogType: 'article',
  })
  return (
    <PageShell title="プライバシーポリシー">
      <PrivacyContent />
    </PageShell>
  )
}
