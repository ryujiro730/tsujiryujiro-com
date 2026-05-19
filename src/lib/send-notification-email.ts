/**
 * キャラクターからのメッセージ通知メール送信
 *
 * 環境変数:
 *   RESEND_API_KEY   — Resendのシークレットキー
 *   EMAIL_FROM       — 送信元アドレス (例: AiKano <noreply@yourdomain.com>)
 */

import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'AiKano <noreply@example.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://example.com'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export interface NotificationEmailOptions {
  toEmail: string
  characterName: string
  messageContent: string
  conversationId: string
}

/**
 * メール通知を送る。
 * 送信失敗はログのみ — メッセージ保存はすでに完了しているので致命的エラーにしない。
 */
export async function sendNotificationEmail(opts: NotificationEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // APIキー未設定なら無視（ローカル開発など）
    return
  }

  const chatUrl = `${APP_URL}/chat`
  const preview = opts.messageContent.slice(0, 60) + (opts.messageContent.length > 60 ? '…' : '')

  try {
    await getResend().emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: `${opts.characterName}からメッセージが届きました`,
      html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#fdf6f0;font-family:'Hiragino Kaku Gothic ProN','Hiragino Sans','Meiryo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6f0;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#fff8f5;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
          <!-- ヘッダー -->
          <tr>
            <td style="background:linear-gradient(135deg,#f9a8b8,#e879a0);padding:24px 32px;">
              <p style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:.04em;">AiKano</p>
            </td>
          </tr>
          <!-- 本文 -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:14px;color:#9b6f7a;">キャラクターからメッセージ</p>
              <p style="margin:0 0 24px;font-size:22px;font-weight:700;color:#3d1a26;">
                ${escapeHtml(opts.characterName)}<span style="font-weight:400;font-size:16px;color:#9b6f7a;">からメッセージが届きました</span>
              </p>
              <!-- メッセージプレビュー -->
              <div style="background:#fdf0f5;border-left:4px solid #e879a0;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0;font-size:15px;color:#3d1a26;line-height:1.7;white-space:pre-wrap;">${escapeHtml(preview)}</p>
              </div>
              <!-- CTA -->
              <div style="text-align:center;">
                <a href="${chatUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#f9a8b8,#e879a0);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:100px;letter-spacing:.04em;">
                  返信する
                </a>
              </div>
            </td>
          </tr>
          <!-- フッター -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f0dde5;">
              <p style="margin:0;font-size:11px;color:#c8a0a8;text-align:center;line-height:1.6;">
                このメールはAiKanoから自動送信されています。<br>
                心当たりのない場合は無視してください。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
    })
  } catch (err) {
    // 通知メール失敗は非クリティカル
    console.error('[sendNotificationEmail] error:', err instanceof Error ? err.message : err)
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
