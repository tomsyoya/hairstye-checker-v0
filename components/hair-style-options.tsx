"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Scissors, Palette, Waves } from "lucide-react"
import type { HairStyle } from "./hair-style-simulator"

interface HairStyleOptionsProps {
  hairStyle: HairStyle
  onChange: (style: Partial<HairStyle>) => void
}

export default function HairStyleOptions({ hairStyle, onChange }: HairStyleOptionsProps) {
  const hairLengths = [
    { value: "short", label: "ショート" },
    { value: "medium", label: "ミディアム" },
    { value: "long", label: "ロング" },
    { value: "bows", label: "ボウズ" },
  ]

  const hairColors = [
    { value: "black", label: "黒", color: "#000000" },
    { value: "brown", label: "茶", color: "#8B4513" },
    { value: "blonde", label: "金髪", color: "#FFD700" },
    { value: "red", label: "赤", color: "#B22222" },
    { value: "blue", label: "青", color: "#4169E1" },
    { value: "pink", label: "ピンク", color: "#FF69B4" },
  ]

  const hairStyles = [
    { value: "straight", label: "ストレート" },
    { value: "wavy", label: "ゆるふわ" },
    { value: "curly", label: "巻き髪" },
    { value: "permed", label: "パーマ" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center mb-2">
          <Scissors className="mr-2 h-4 w-4 text-[rgb(159,21,71)]" />
          <h3 className="font-medium text-[rgb(159,21,71)]">髪の長さ</h3>
        </div>
        <RadioGroup
          value={hairStyle.length}
          onValueChange={(value) => onChange({ length: value })}
          className="grid grid-cols-2 gap-2"
        >
          {hairLengths.map((length) => (
            <div key={length.value} className="flex items-center space-x-2">
              <RadioGroupItem value={length.value} id={`length-${length.value}`} className="text-[rgb(159,21,71)]" />
              <Label htmlFor={`length-${length.value}`}>{length.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <div className="flex items-center mb-2">
          <Palette className="mr-2 h-4 w-4 text-[rgb(159,21,71)]" />
          <h3 className="font-medium text-[rgb(159,21,71)]">髪の色</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {hairColors.map((color) => (
            <div
              key={color.value}
              className={`
                flex flex-col items-center p-2 rounded-lg cursor-pointer border-2
                ${hairStyle.color === color.value ? "border-[rgb(159,21,71)]" : "border-transparent"}
              `}
              onClick={() => onChange({ color: color.value })}
            >
              <div className="w-8 h-8 rounded-full mb-1" style={{ backgroundColor: color.color }} />
              <span className="text-xs">{color.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center mb-2">
          <Waves className="mr-2 h-4 w-4 text-[rgb(159,21,71)]" />
          <h3 className="font-medium text-[rgb(159,21,71)]">パーマのかかり具合</h3>
        </div>
        <RadioGroup
          value={hairStyle.style}
          onValueChange={(value) => onChange({ style: value })}
          className="grid grid-cols-2 gap-2"
        >
          {hairStyles.map((style) => (
            <div key={style.value} className="flex items-center space-x-2">
              <RadioGroupItem value={style.value} id={`style-${style.value}`} className="text-[rgb(159,21,71)]" />
              <Label htmlFor={`style-${style.value}`}>{style.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
