export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen warm-bg">
      <div className="max-w-md mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  )
}
