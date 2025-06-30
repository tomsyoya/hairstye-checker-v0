import { Suspense } from "react"
import HairStyleSimulator from "@/components/hair-style-simulator"
import { Loader2 } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-[rgb(191,179,171)] p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center text-[rgb(159,21,71)] mb-6">ヘアスタイルシミュレーター</h1>
        <Suspense fallback={<Loader2 className="animate-spin mx-auto" />}>
          <HairStyleSimulator />
        </Suspense>
      </div>
    </main>
  )
}
