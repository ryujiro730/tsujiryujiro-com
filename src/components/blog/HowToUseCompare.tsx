'use client'

import { ComparisonTable } from './ComparisonTable'

// 比較表1：機能・スペック比較
export function HowToUseCompare1() {
  return (
    <ComparisonTable
      title="AI彼女専用サービス vs 汎用AI【機能比較】"
      showRank={false}
      showScore={false}
      rowLabels={['料金', 'エロ会話', 'キャラクター', '記憶保持', '日本語品質', '彼女感']}
      services={[
        {
          rank: 1,
          name: 'AI彼女専用サービス',
          tagline: 'アイカノ等の専用設計サービス',
          score: 96,
          fields: {
            '料金': 'ポイント制・月額制',
            'エロ会話': '◎ 完全対応',
            'キャラクター': '◎ リアル美女',
            '記憶保持': '◎ 大容量',
            '日本語品質': '◎ 自社チューニング',
            '彼女感': '◎ 専用設計',
          },
        },
        {
          rank: 2,
          name: '汎用AI',
          tagline: 'ChatGPT・Gemini等',
          score: 52,
          fields: {
            '料金': '無料〜月額制',
            'エロ会話': '× 規制あり',
            'キャラクター': '△ 画像生成のみ',
            '記憶保持': '○ 限定的',
            '日本語品質': '◎ 対応',
            '彼女感': '× 汎用設計',
          },
        },
      ]}
    />
  )
}

// 比較表2：体験・没入感比較
export function HowToUseCompare2() {
  return (
    <ComparisonTable
      title="AI彼女専用サービス vs 汎用AI【体験・没入感比較】"
      showRank={false}
      showScore={false}
      rowLabels={['没入感', '設定の手間', 'カスタマイズ', '写真のやり取り', '会話の自然さ', '向いている用途']}
      services={[
        {
          rank: 1,
          name: 'AI彼女専用サービス',
          tagline: 'アイカノ等の専用設計サービス',
          score: 95,
          fields: {
            '没入感': '◎ 彼女専用UI',
            '設定の手間': '◎ 即スタート',
            'カスタマイズ': '◎ キャラ選択',
            '写真のやり取り': '◎ 対応',
            '会話の自然さ': '◎ 感情・文脈を理解',
            '向いている用途': 'AI彼女・エロ会話',
          },
        },
        {
          rank: 2,
          name: '汎用AI',
          tagline: 'ChatGPT・Gemini等',
          score: 48,
          fields: {
            '没入感': '△ 白い画面のみ',
            '設定の手間': '× プロンプト必要',
            'カスタマイズ': '△ プロンプト次第',
            '写真のやり取り': '△ 生成のみ',
            '会話の自然さ': '○ 汎用的',
            '向いている用途': '仕事・情報収集',
          },
        },
      ]}
    />
  )
}
