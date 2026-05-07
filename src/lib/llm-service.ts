/**
 * LLMサービス
 * 環境変数 LLM_PROVIDER で切り替え可能
 *   - claude: Anthropic Claude API（デフォルト）
 *   - ollama: ローカルOllama API（MythoMax等、英語特化モデル）
 *
 * Ollamaプロバイダー使用時は DeepL APIで自動翻訳する：
 *   ユーザーメッセージ（日本語）→ 英語 → LLM → 英語出力 → 日本語
 *
 * generate() メソッドの中身だけをプロバイダーごとに差し替える設計。
 * 呼び出し側のコードは変更不要。
 */

import Anthropic from '@anthropic-ai/sdk'

export interface LLMCharacter {
  name: string
  age?: number | null
  description: string
  personality: string
  system_prompt: string | null
}

export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

// -----------------------------------------------------------------------
// DeepL翻訳ヘルパー（Ollamaパスのみで使用）
// -----------------------------------------------------------------------

/**
 * DeepL APIでテキストを翻訳する
 * DEEPL_API_KEY が未設定の場合は原文をそのまま返す（フォールバック）
 */
async function deepLTranslate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey || apiKey === 'your_deepl_api_key_here') {
    console.warn('[llm-service] DEEPL_API_KEY未設定のため翻訳をスキップ')
    return text
  }

  // 無料プランは api-free.deepl.com、有料プランは api.deepl.com
  // キーが ":fx" で終わる場合は無料プラン
  const baseUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com'

  const params = new URLSearchParams({
    text,
    source_lang: sourceLang,
    target_lang: targetLang,
  })

  const res = await fetch(`${baseUrl}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`DeepL API error ${res.status}: ${errText}`)
  }

  const data = await res.json()
  return data.translations?.[0]?.text ?? text
}

// -----------------------------------------------------------------------
// システムプロンプト構築
// -----------------------------------------------------------------------

/**
 * キャラクターのシステムプロンプトを構築する
 * personality + system_prompt を組み合わせる
 * Ollamaパスでは英語で構築する（モデルが英語特化のため）
 */
function buildSystemPrompt(character: LLMCharacter, lang: 'ja' | 'en' = 'ja'): string {
  // Ollamaは英語モデルなので英語でプロンプトを組み立てる
  const base = lang === 'en'
    ? [
        `You are "${character.name}", chatting directly with a user on a messaging app.`,
        character.age ? `Age: ${character.age}` : '',
        `Profile: ${character.description}`,
        `Personality: ${character.personality}`,
        // ナレーション・メタ描写を抑止する指示
        ``,
        `IMPORTANT RULES:`,
        `- Write ONLY what ${character.name} says out loud. Never narrate actions or emotions.`,
        `- Do NOT use asterisks (*smiles*, *laughs*) or third-person descriptions.`,
        `- Do NOT start with "${character.name} said" or any story-format framing.`,
        `- Respond as if you are texting — short, natural, conversational.`,
        `- Stay fully in character at all times.`,
      ].filter(s => s !== undefined).join('\n')
    : [
        `あなたは「${character.name}」というキャラクターです。`,
        character.age ? `年齢: ${character.age}歳` : '',
        `プロフィール: ${character.description}`,
        `性格: ${character.personality}`,
      ].filter(Boolean).join('\n')

  // キャラクターごとの追加指示（system_prompt）をそのまま末尾に付加
  const extra = character.system_prompt?.trim() ?? ''
  return extra ? `${base}\n\n${extra}` : base
}

// -----------------------------------------------------------------------
// OpenRouter API（高品質モデルをAPI課金で使用）
// -----------------------------------------------------------------------

/**
 * OpenRouter APIを使ってテキスト生成
 * OpenAI互換APIなのでfetchで直接呼ぶ
 * 日本語のままで渡せる（70B以上のモデルは多言語対応）
 */
async function generateWithOpenRouter(
  character: LLMCharacter,
  history: LLMMessage[],
  userMessage: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')

  const model = process.env.OPENROUTER_MODEL ?? 'sao10k/l3.1-70b-euryale-v2.2'
  const systemPrompt = buildSystemPrompt(character, 'en')

  const messages = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://chatotp.app',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 512,
      // 検閲の少ないプロバイダーを優先指定
      provider: {
        order: ['Mancer', 'Together', 'Fireworks'],
        allow_fallbacks: true,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const raw: string = data.choices?.[0]?.message?.content ?? ''
  return cleanJaRpOutput(raw)
}

// -----------------------------------------------------------------------
// Claude API
// -----------------------------------------------------------------------

/**
 * Claude APIを使ってテキスト生成（日本語のまま渡す）
 */
async function generateWithClaude(
  systemPrompt: string,
  history: LLMMessage[],
  userMessage: string,
): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const messages: Anthropic.MessageParam[] = [
    ...history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages,
  })

  const block = response.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text
}

// -----------------------------------------------------------------------
// RP出力クリーナー
// -----------------------------------------------------------------------

/**
 * RPモデル特有のナレーション・メタ描写を除去する後処理
 *
 * 除去対象：
 *   - *action* や **action** （アスタリスク動作描写）
 *   - "Name said: ..." / "Name replied: ..." 形式の三人称冒頭
 *   - 括弧内の状態描写 (laughs), (smiles) など
 *   - 空行の正規化
 */
/**
 * 英語RP出力のナレーション除去
 * 翻訳前に適用する
 */
function cleanEnRpOutput(text: string, characterName: string): string {
  let out = text

  // *...* 閉じあり（動作描写）
  out = out.replace(/\*{1,2}[^*\n]+\*{1,2}/g, '')

  // * で始まる行（閉じアスタリスクなしのナレーション行ごと削除）
  out = out.replace(/^\*[^\n]+$/gm, '')

  // (laughs) / (smiles) 等の括弧描写
  out = out.replace(/\([^)\n]{1,60}\)/g, '')

  // "Name said/replied/..." 形式の三人称冒頭
  out = out.replace(
    new RegExp(`^\\s*${characterName}\\s*(said|replied|answered|whispered|responded|thought|felt)[^"\\n]*[":,]\\s*`, 'im'),
    '',
  )
  out = out.replace(/^\s*(She|He|They)\s+(said|replied|answered|whispered|responded|thought|felt)[^"\n]*[":,]\s*/im, '')

  // 行全体が "..." の形なら外側クォートだけ取る
  out = out.replace(/^"([\s\S]+)"$/m, '$1')

  out = out.replace(/\n{3,}/g, '\n\n').trim()
  return out
}

/**
 * 日本語訳後のナレーション除去
 * DeepL翻訳後に適用する（翻訳でパターンが変わるため日本語版が必要）
 */
function cleanJaRpOutput(text: string): string {
  let out = text

  // *〜* 閉じあり
  out = out.replace(/\*{1,2}[^*\n]+\*{1,2}/g, '')

  // * で始まる行をまるごと削除（「*葵は〜と思った。」のようなパターン）
  out = out.replace(/^\*[^\n]+$/gm, '')

  // （笑）（照）等の全角括弧描写
  out = out.replace(/（[^）\n]{1,30}）/g, '')

  // 〜は〜と思った / 〜と感じた / 〜と考えた などの地の文っぽい末尾表現を行ごと削除
  out = out.replace(/^[^「」\n]*(?:と思った|と感じた|と考えた|と気づいた|と呟いた|とつぶやいた|と言った|と答えた)。?\s*$/gm, '')

  // 「彼女は〜」「彼は〜」で始まる三人称行を削除
  out = out.replace(/^彼女は[^\n]+$/gm, '')
  out = out.replace(/^彼は[^\n]+$/gm, '')

  out = out.replace(/\n{3,}/g, '\n\n').trim()
  return out
}

// -----------------------------------------------------------------------
// Ollama API（英語モデル + DeepL翻訳）
// -----------------------------------------------------------------------

/**
 * Ollama APIを使ってテキスト生成
 *
 * OLLAMA_LANG=ja（日本語モデル、ELYZAなど）:
 *   日本語のままLLMに渡す → DeepL不要
 *
 * OLLAMA_LANG=en（英語モデル、MythoMaxなど）:
 *   日本語 → DeepL(EN) → LLM → DeepL(JA) → 日本語
 */
async function generateWithOllama(
  character: LLMCharacter,
  history: LLMMessage[],
  userMessage: string,
): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL ?? 'pakachan/elyza-llama3-8b'
  const isJaModel = (process.env.OLLAMA_LANG ?? 'ja') === 'ja'

  if (isJaModel) {
    // 日本語モデルパス：翻訳なしで直接やり取り
    const systemPrompt = buildSystemPrompt(character, 'ja')
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ]

    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
    })

    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`)
    const data = await res.json()
    const raw: string = data.message?.content ?? ''
    return cleanJaRpOutput(raw)
  }

  // 英語モデルパス：DeepL翻訳を挟む
  const systemPrompt = buildSystemPrompt(character, 'en')
  const userMessageEn = await deepLTranslate(userMessage, 'JA', 'EN')
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessageEn },
  ]

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  })

  if (!res.ok) throw new Error(`Ollama API error: ${res.status}`)
  const data = await res.json()
  const rawEn: string = data.message?.content ?? ''
  const cleanedEn = cleanEnRpOutput(rawEn, character.name)
  const replyJa = await deepLTranslate(cleanedEn, 'EN', 'JA')
  return cleanJaRpOutput(replyJa)
}

// -----------------------------------------------------------------------
// エントリーポイント
// -----------------------------------------------------------------------

/**
 * メインのgenerate関数
 * LLM_PROVIDER 環境変数によってバックエンドを切り替える
 */
export async function generateReply(
  character: LLMCharacter,
  history: LLMMessage[],
  userMessage: string,
): Promise<string> {
  const provider = process.env.LLM_PROVIDER ?? 'claude'

  // 履歴は直近30件に絞る（コンテキスト長管理）
  const recentHistory = history.slice(-30)

  if (provider === 'openrouter') {
    return generateWithOpenRouter(character, recentHistory, userMessage)
  }

  if (provider === 'ollama') {
    return generateWithOllama(character, recentHistory, userMessage)
  }

  // Claudeパス: 日本語のままで問題ない
  const systemPrompt = buildSystemPrompt(character, 'ja')
  return generateWithClaude(systemPrompt, recentHistory, userMessage)
}
