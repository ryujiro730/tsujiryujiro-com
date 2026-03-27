import { redirect } from 'next/navigation'

// キャラクター詳細は廃止 → チャット画面に直接遷移
export default function CharacterDetailPage({ params }: { params: { id: string } }) {
  redirect(`/chat?character=${params.id}`)
}
