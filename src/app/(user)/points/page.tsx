import { redirect } from 'next/navigation'

// /pointsは廃止 → /paymentにリダイレクト
export default function PointsPage() {
  redirect('/payment')
}
