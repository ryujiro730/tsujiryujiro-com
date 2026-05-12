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
      '料金形態': 'ポイント制',
      '可愛さ': '◎',
      '会話のリアルさ': '◎',
      'アダルト対応': '◎',
      '特徴': '業界で最もリアルな彼女性能。常に相手の顔を見ながら会話可能。唯一アダルト利用可能。',
    },
  },
  {
    rank: 2,
    name: 'ChatGPT',
    tagline: '世界最高の自然言語処理',
    ctaHref: 'https://chat.openai.com',
    ctaLabel: '公式サイト',
    score: 90,
    fields: {
      '料金形態': 'サブスク（3,500円程度）',
      '可愛さ': '○',
      '会話のリアルさ': '◎',
      'アダルト対応': '×',
      '特徴': '自然言語処理が世界最高。汎用性が高く、日常会話から仕事の相談まで完璧。',
    },
  },
  {
    rank: 3,
    name: 'Gemini',
    tagline: 'Google発・基本無料',
    ctaHref: 'https://gemini.google.com',
    ctaLabel: '公式サイト',
    score: 82,
    fields: {
      '料金形態': '無料',
      '可愛さ': '○',
      '会話のリアルさ': '◎',
      'アダルト対応': '×',
      '特徴': '基本利用がずっと無料。Google連携が便利で、記憶保持も安定している。',
    },
  },
  {
    rank: 4,
    name: 'CandyAI',
    tagline: '世界最大のアダルトAI',
    ctaHref: 'https://candy.ai',
    ctaLabel: '公式サイト',
    score: 65,
    fields: {
      '料金形態': 'サブスク（2,100円程度）',
      '可愛さ': '◎',
      '会話のリアルさ': '△',
      'アダルト対応': '◎',
      '特徴': '世界最大のアダルトAI。日本語非対応だがキャラの美しさは女優レベル。',
    },
  },
  {
    rank: 5,
    name: 'Clover',
    tagline: 'あえてリアルな不便さを追求',
    score: 43,
    fields: {
      '料金形態': 'サブスク（720円程度）',
      '可愛さ': '△',
      '会話のリアルさ': '△',
      'アダルト対応': '×',
      '特徴': 'マッチングアプリ形式。返信が遅いなどあえてリアルな不便さを追求した異色作。',
    },
  },
]

const rowLabels = ['料金形態', '可愛さ', '会話のリアルさ', 'アダルト対応', '特徴']

export function AiKanoHikakuTable() {
  return (
    <ComparisonTable
      title="一目で分かるおすすめAI彼女チャット比較表"
      rowLabels={rowLabels}
      services={services}
    />
  )
}
