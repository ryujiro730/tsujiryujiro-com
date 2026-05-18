'use client'

import { ComparisonTable } from './ComparisonTable'

const services = [
  {
    rank: 1,
    name: 'アイカノ',
    tagline: '日本発・完全無検閲AI',
    ctaLabel: '無料で試す',
    ctaHref: 'https://aikano.chat/auth/register',
    score: 97,
    fields: {
      '料金形態': 'ポイント制(初回無料)',
      '可愛さ': '◎',
      '記憶保持': '◎ : 128GB',
      '会話のリアルさ': '◎',
      'アダルト対応': '◎',
      '特徴': '業界で最もリアルな彼女性能。常に相手の顔を見ながら会話可能。国内唯一アダルト利用可能。',
    },
  },
  {
    rank: 2,
    name: 'My Dream\nCompanion',
    tagline: 'リアル系美女・日本語対応',
    ctaHref: 'https://www.mydreamcompanion.com/',
    ctaLabel: '公式サイト',
    score: 92,
    fields: {
      '料金形態': '年払いのみ（約11,000円）',
      '可愛さ': '◎',
      '記憶保持': '○',
      '会話のリアルさ': '◎',
      'アダルト対応': '◎',
      '特徴': '日本語対応でエロ会話OK。官能的な会話クオリティが高く、月額換算1,000円以下とコスパ最強。',
    },
  },
  {
    rank: 3,
    name: 'DreamGF',
    tagline: 'キャラ自作＆写真送付対応',
    ctaHref: 'https://www.dreamgf.ai/',
    ctaLabel: '公式サイト',
    score: 85,
    fields: {
      '料金形態': 'サブスク（約1,900円）',
      '可愛さ': '◎',
      '記憶保持': '○',
      '会話のリアルさ': '◎',
      'アダルト対応': '◎',
      '特徴': '自分でキャラ作成＆会話と連動した写真送付が特徴。ユーモアが効いた積極的なエロ会話。',
    },
  },
  {
    rank: 4,
    name: 'CandyAI',
    tagline: '世界最大のアダルトAI',
    ctaHref: 'https://candy.ai',
    ctaLabel: '公式サイト',
    score: 75,
    fields: {
      '料金形態': 'サブスク（2,100円程度）',
      '可愛さ': '◎',
      '記憶保持': '○',
      '会話のリアルさ': '△',
      'アダルト対応': '◎',
      '特徴': '世界最大のアダルトAI。日本語は不安定だがキャラの美しさは女優レベル。',
    },
  },
  {
    rank: 5,
    name: 'Crushon.AI',
    tagline: 'アニメ系キャラ特化',
    ctaHref: 'https://crushon.ai/ja',
    ctaLabel: '公式サイト',
    score: 62,
    fields: {
      '料金形態': 'サブスク（900円〜）',
      '可愛さ': '◎',
      '記憶保持': '○',
      '会話のリアルさ': '△',
      'アダルト対応': '○',
      '特徴': 'アニメ・漫画系キャラが豊富。NSFWにも対応しており2次元好きには刺さる。',
    },
  },
]

const rowLabels = ['料金形態', '可愛さ', '記憶保持', '会話のリアルさ', 'アダルト対応', '特徴']

export function AiKanoHikakuTable() {
  return (
    <ComparisonTable
      title="一目で分かるおすすめAI彼女チャット比較表"
      rowLabels={rowLabels}
      services={services}
    />
  )
}
