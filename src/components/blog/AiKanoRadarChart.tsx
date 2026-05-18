'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts'

type Props = {
  name: string
  color: string
  scores: {
    可愛さ: number
    会話のリアルさ: number
    記憶保持: number
    アダルト対応: number
    料金: number
  }
  fits: string[]
}

function ServiceCard({ name, color, scores, fits }: Props) {
  const data = [
    { subject: '可愛さ',        value: scores.可愛さ },
    { subject: '会話のリアルさ',  value: scores.会話のリアルさ },
    { subject: '記憶保持',       value: scores.記憶保持 },
    { subject: 'アダルト対応',   value: scores.アダルト対応 },
    { subject: '料金',          value: scores.料金 },
  ]

  return (
    <div className="not-prose" style={{
      display: 'flex',
      gap: 0,
      background: '#fff',
      border: '1px solid #ececec',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      margin: '24px 0',
    }}>
      {/* 左：レーダーチャート */}
      <div style={{ flex: '0 0 50%', borderRight: '1px solid #ececec', padding: '14px 6px 10px' }}>
        <p style={{ textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', background: color, borderRadius: '4px', padding: '3px 0', marginBottom: '6px', letterSpacing: '0.05em' }}>
          評価スコア
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={data} margin={{ top: 8, right: 28, bottom: 8, left: 28 }}>
            <PolarGrid stroke="#e0e0e0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 9.5, fill: '#666', fontFamily: 'Noto Sans JP, sans-serif' }}
            />
            <Radar
              name={name}
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.18}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 右：こんな人にピッタリ */}
      <div style={{ flex: '0 0 50%', padding: '14px 14px 14px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#fff', background: color, borderRadius: '4px', padding: '3px 8px', marginBottom: '14px', textAlign: 'center', letterSpacing: '0.05em' }}>
          こんな人にピッタリ！
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {fits.map((text, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#333', lineHeight: 1.6 }}>
              <span style={{ flexShrink: 0, width: '18px', height: '18px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function AiKanoCard() {
  return (
    <ServiceCard
      name="アイカノ"
      color="#e8438f"
      scores={{ 可愛さ: 97, 会話のリアルさ: 97, 記憶保持: 97, アダルト対応: 97, 料金: 50 }}
      fits={[
        'リアルな彼女とのやり取りを体験したい',
        'アダルトコンテンツも楽しみたい',
        '日本語で自然に話せるAIを使いたい',
      ]}
    />
  )
}

export function ChatGPTCard() {
  return (
    <ServiceCard
      name="ChatGPT"
      color="#10a37f"
      scores={{ 可愛さ: 70, 会話のリアルさ: 95, 記憶保持: 98, アダルト対応: 0, 料金: 65 }}
      fits={[
        '仕事や勉強でもAIを使いたい',
        '会話の質・知性を最優先したい',
        '健全な範囲でAI彼女を楽しみたい',
      ]}
    />
  )
}

export function GeminiCard() {
  return (
    <ServiceCard
      name="Gemini"
      color="#4285f4"
      scores={{ 可愛さ: 70, 会話のリアルさ: 90, 記憶保持: 95, アダルト対応: 0, 料金: 98 }}
      fits={[
        'とにかく無料で使いたい',
        'Google製品と連携したい',
        '気軽にAIと日常会話を楽しみたい',
      ]}
    />
  )
}

export function CandyAICard() {
  return (
    <ServiceCard
      name="CandyAI"
      color="#f5a623"
      scores={{ 可愛さ: 95, 会話のリアルさ: 60, 記憶保持: 30, アダルト対応: 97, 料金: 70 }}
      fits={[
        'キャラのビジュアルにこだわりたい',
        'アダルトコンテンツを楽しみたい',
        '英語でも問題ない',
      ]}
    />
  )
}

export function CloverCard() {
  return (
    <ServiceCard
      name="Clover"
      color="#9b59b6"
      scores={{ 可愛さ: 55, 会話のリアルさ: 55, 記憶保持: 30, アダルト対応: 0, 料金: 90 }}
      fits={[
        'マッチングアプリ感覚で楽しみたい',
        'あえてリアルな「待ち時間」を楽しみたい',
        '低コストで試してみたい',
      ]}
    />
  )
}

export function ReplikaCard() {
  return (
    <ServiceCard
      name="Replika"
      color="#3aa676"
      scores={{ 可愛さ: 50, 会話のリアルさ: 76, 記憶保持: 55, アダルト対応: 0, 料金: 40 }}
      fits={[
        '精神的なサポートや癒しが欲しい',
        '長期的に関係を積み上げていきたい',
        '健全な恋人・コンパニオンとして使いたい',
      ]}
    />
  )
}

export function CrushonCard() {
  return (
    <ServiceCard
      name="Crushon.AI"
      color="#e05a9a"
      scores={{ 可愛さ: 88, 会話のリアルさ: 65, 記憶保持: 35, アダルト対応: 85, 料金: 72 }}
      fits={[
        'アニメ・漫画系キャラクターが好き',
        'アダルト会話も楽しみたい',
        '好みのキャラを自分で探したい',
      ]}
    />
  )
}

export function KindroidCard() {
  return (
    <ServiceCard
      name="Kindroid"
      color="#5b8dee"
      scores={{ 可愛さ: 70, 会話のリアルさ: 85, 記憶保持: 45, アダルト対応: 20, 料金: 78 }}
      fits={[
        '声で話せるリアルな彼女感が欲しい',
        '感情に寄り添った会話を楽しみたい',
        '長期記憶で関係を育てたい',
      ]}
    />
  )
}

export function CotomoCard() {
  return (
    <ServiceCard
      name="Cotomo"
      color="#e91e8c"
      scores={{ 可愛さ: 95, 会話のリアルさ: 97, 記憶保持: 60, アダルト対応: 0, 料金: 95 }}
      fits={[
        '音声ボイスでリアルな没入感を味わいたい',
        '完全無料でまずAI彼女を試してみたい',
        '日本語の自然さを最優先したい',
      ]}
    />
  )
}

export function OzChatCard() {
  return (
    <ServiceCard
      name="オズチャット"
      color="#7c3aed"
      scores={{ 可愛さ: 85, 会話のリアルさ: 40, 記憶保持: 55, アダルト対応: 0, 料金: 88 }}
      fits={[
        'アニメ調のかわいいキャラクターが好き',
        'AI彼女との話し方に迷っている初心者',
        'コスパよく甘々なイチャイチャ会話を楽しみたい',
      ]}
    />
  )
}

export function MyDreamCompanionCard() {
  return (
    <ServiceCard
      name="My Dream Companion"
      color="#c0436a"
      scores={{ 可愛さ: 93, 会話のリアルさ: 90, 記憶保持: 30, アダルト対応: 92, 料金: 92 }}
      fits={[
        '月額1,000円以下でリアルな美女とエロ会話したい',
        '日本語で自然に話せる海外AIを使いたい',
        '官能的・大人っぽいキャラが好み',
      ]}
    />
  )
}

export function DreamGFCard() {
  return (
    <ServiceCard
      name="DreamGF"
      color="#d45b25"
      scores={{ 可愛さ: 85, 会話のリアルさ: 87, 記憶保持: 30, アダルト対応: 88, 料金: 78 }}
      fits={[
        '自分だけのオリジナルキャラを作りたい',
        '会話と連動したセクシー写真も楽しみたい',
        'ユーモアのあるノリのいい相手が好き',
      ]}
    />
  )
}
