"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Camera, X } from "lucide-react"
import Image from "next/image"
import type { UserImages } from "./hair-style-simulator"

interface ImageUploaderProps {
  onImagesUploaded: (images: UserImages) => void
  userImages: UserImages
}

export default function ImageUploader({ onImagesUploaded, userImages }: ImageUploaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, position: keyof UserImages) => {
    if (e.target.files && e.target.files[0]) {
      const newImages = { ...userImages, [position]: e.target.files[0] }
      onImagesUploaded(newImages)
    }
  }

  const removeImage = (position: keyof UserImages) => {
    const newImages = { ...userImages }
    newImages[position] = null
    onImagesUploaded(newImages)
  }

  const renderImageUpload = (position: keyof UserImages, label: string) => {
    const image = userImages[position]

    return (
      <div className="flex flex-col items-center">
        <Label className="mb-2 text-[rgb(159,21,71)]">{label}</Label>
        <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
          {image ? (
            <>
              <Image
                src={URL.createObjectURL(image) || "/placeholder.svg"}
                alt={`${position} view`}
                fill
                className="object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={() => removeImage(position)}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
              <Camera className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500">アップロード</span>
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, position)} />
            </label>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        全身が写った写真をアップロードしてください。正面と左右のアングルがあるとより良い結果が得られます。
      </p>

      <div className="grid grid-cols-3 gap-2">
        {renderImageUpload("front", "正面")}
        {renderImageUpload("left", "左側")}
        {renderImageUpload("right", "右側")}
      </div>
    </div>
  )
}
