"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Download } from "lucide-react"

interface ResultViewerProps {
  images: string[]
  currentIndex: number
  onPrev: () => void
  onNext: () => void
}

export default function ResultViewer({ images, currentIndex, onPrev, onNext }: ResultViewerProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // スワイプ検出のための最小距離
  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      onNext()
    }
    if (isRightSwipe) {
      onPrev()
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-gray-600">
          スワイプして他のスタイルを確認できます ({currentIndex + 1}/{images.length})
        </p>
      </div>

      <div
        className="relative h-[400px] w-full bg-gray-100 rounded-lg overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {images[currentIndex] ? (
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={images[currentIndex] || "/placeholder.svg"}
              alt={`Generated hairstyle ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p>画像を読み込めませんでした</p>
          </div>
        )}

        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
          onClick={onPrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Button
        className="w-full bg-[rgb(159,21,71)] hover:bg-[rgb(139,11,61)]"
        onClick={() => {
          // 実際のアプリでは画像をダウンロードする処理を実装
          alert("この機能は実際のアプリで実装されます")
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        この髪型を保存
      </Button>
    </div>
  )
}
