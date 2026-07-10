# 収益化（マネタイズ）ガイド

このアプリには **ID を差し込むだけで有効化できる収益化の仕組み**が組み込まれています。
何も設定しなければ広告・アフィリエイトは一切表示されません（偽リンクや空枠を公開しない安全な既定）。

対応している収益源:

- **Google AdSense**（ディスプレイ広告 / インフィード広告）
- **アフィリエイト**（転職・就活サービスへの紹介リンク）

---

## 1. アフィリエイト（すぐ始められる・単価が高い）

就活サイトと相性が良く、審査も比較的通りやすい方法です。

### 手順

1. ASP（アフィリエイト・サービス・プロバイダ）に無料登録する。おすすめ:
   - [A8.net](https://www.a8.net/) … 案件数最大手。審査ゆるめ。
   - [もしもアフィリエイト](https://af.moshimo.com/) … Amazon/楽天も一括。
   - [afb（アフィビー）](https://www.afi-b.com/) … 転職・人材系に強い。
2. 「転職エージェント」「スカウト」「適職診断」などの案件を検索し、提携申請する。
3. 承認されたら発行された **アフィリエイトリンク（URL）** をコピー。
4. `src/monetize/config.ts` の `affiliates[].url` を、その URL に差し替える。

```ts
// src/monetize/config.ts
affiliates: [
  {
    id: 'agent-1',
    provider: '転職エージェント',
    title: '将来性の高い業界へ、プロと一緒に',
    description: '成長業界の非公開求人を紹介。登録は無料、相談だけでもOK。',
    cta: '無料で相談してみる',
    url: 'https://px.a8.net/svt/ejp?a8mat=あなたのID', // ← ここを差し替え
    accent: 'var(--excellent)',
  },
  // ...
]
```

`url` が `example.com` のままの案件は**表示されません**。実リンクに変えた瞬間に表示されます。
案件は好きなだけ増やして構いません（`affiliates` 配列に足すだけ）。

> リンクには自動で `rel="sponsored nofollow"` が付き、カードには「PR」表示が出ます
> （景表法・ステマ規制対応）。

---

## 2. Google AdSense（サイト公開後に申請）

AdSense は「**公開済みサイトの審査通過**」が前提です。まず案 A でサイトを公開し、
その URL で申請してください。

### 手順

1. [Google AdSense](https://www.google.com/adsense/) に無料登録し、公開済みの
   サイト URL（例: `https://46j9njw9f5-ctrl.github.io/-0/`）を登録して審査に出す。
2. 審査通過後、AdSense 管理画面で **広告ユニット**（ディスプレイ広告）を作成。
3. 発行された 2 つの値を控える:
   - パブリッシャー ID … `ca-pub-XXXXXXXXXXXXXXXX`
   - 広告スロット ID … `1234567890`
4. どちらか好きな方法で設定する:

   **A) GitHub の Variables（コードを触らない・推奨）**
   リポジトリの `Settings → Secrets and variables → Actions → Variables → New variable` で登録:

   | 名前 | 値 |
   | --- | --- |
   | `VITE_ADSENSE_CLIENT` | `ca-pub-XXXXXXXXXXXXXXXX` |
   | `VITE_ADSENSE_SLOT` | `1234567890` |

   次回のデプロイから自動で広告が表示されます。

   **B) コードに直接書く**
   `src/monetize/config.ts` の `DEFAULTS` を書き換える:

   ```ts
   const DEFAULTS = {
     adsenseClient: 'ca-pub-XXXXXXXXXXXXXXXX',
     adsenseSlot: '1234567890',
   }
   ```

両方が設定されると、企業カードのグリッドに **6 件ごとにインフィード広告**が挿入されます。

### ローカルで試す

`.env.local` を作れば手元でも確認できます（このファイルは Git 管理外）:

```
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
VITE_ADSENSE_SLOT=1234567890
```

### ads.txt について

AdSense は `ads.txt` の設置を推奨します。GitHub Pages のプロジェクトページ
（`.../-0/`）ではドメイン直下に置けないため、独自ドメインを使う場合のみ
`public/ads.txt` に以下を置いてください（`pub-...` は自分の ID）:

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

---

## 表示の仕組み（安全設計）

- `hasAdsense()` … `ca-pub-` で始まる ID とスロットの**両方**が揃った時だけ広告枠を描画。
- `activeAffiliates()` … `example.com` を含まない実 URL の案件だけ表示。
- 未設定時は `null` を返すため、**空枠も偽リンクも一切出ません**。

コードは `src/monetize/`（`config.ts` = 設定、`Ad.tsx` = 表示部品）に集約しています。
