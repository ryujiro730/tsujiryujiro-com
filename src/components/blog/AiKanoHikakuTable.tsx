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
    rank: 3,
    name: 'Replika',
    tagline: '世界最大のAIコンパニオン',
    ctaHref: 'https://replika.com',
    ctaLabel: '公式サイト',
    score: 68,
    fields: {
      '料金形態': 'サブスク（2,000円程度）',
      '可愛さ': '△',
      '記憶保持': '◎',
      '会話のリアルさ': '○',
      'アダルト対応': '×',
      '特徴': '世界で最も愛されたAIコンパニオン。感情サポートと長期記憶が特に優秀。',
    },
  },
  {
    rank: 4,
    name: 'Crushon.AI',
    tagline: 'アニメ系キャラ特化',
    ctaHref: 'https://crushon.ai/ja',
    ctaLabel: '公式サイト',
    score: 62,
    fields: {
      '料金形態': 'サブスク（1,500円程度）',
      '可愛さ': '◎',
      '記憶保持': '○',
      '会話のリアルさ': '△',
      'アダルト対応': '○',
      '特徴': 'アニメ・漫画系キャラが豊富。NSFWにも対応しており2次元好きには刺さる。',
    },
  },
  {
    rank: 5,
    name: 'Kindroid',
    tagline: '音声通話特化のAI彼女',
    ctaHref: 'https://kindroid.ai',
    ctaLabel: '公式サイト',
    score: 58,
    fields: {
      '料金形態': 'サブスク（1,500円程度）',
      '可愛さ': '△',
      '記憶保持': '◎',
      '会話のリアルさ': '○',
      'アダルト対応': '×',
      '特徴': '声で話せる音声特化型。感情に合わせた返答が変化するリアルな通話体験。',
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
