"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Camera, FileText, Loader2, Copy, Download, X, Zap } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"

// Tesseract.js の型定義を安全にする
declare global {
  interface Window {
    Tesseract?: {
      createWorker?: () => any
      recognize?: (image: File | string, lang: string) => Promise<{ data: { text: string; confidence: number } }>
    }
  }
}

interface OCRReaderProps {
  onTextExtracted?: (text: string) => void
}

// OCR設定の型定義
interface OCRSettings {
  language: string
  psm: number // Page Segmentation Mode
  oem: number // OCR Engine Mode
  dpi: number
  contrast: number
  brightness: number
  enablePreprocessing: boolean
  enablePostprocessing: boolean
  whitelist: string
  blacklist: string
}

// デフォルト設定
const DEFAULT_SETTINGS: OCRSettings = {
  language: "jpn+eng",
  psm: 6, // Uniform block of text
  oem: 3, // Default, based on what is available
  dpi: 300,
  contrast: 100,
  brightness: 100,
  enablePreprocessing: true,
  enablePostprocessing: true,
  whitelist: "",
  blacklist: "",
}

// 言語オプション
const LANGUAGE_OPTIONS = [
  { value: "jpn+eng", label: "日本語 + 英語" },
  { value: "jpn", label: "日本語のみ" },
  { value: "eng", label: "英語のみ" },
  { value: "chi_sim+eng", label: "中国語(簡体) + 英語" },
  { value: "kor+eng", label: "韓国語 + 英語" },
]

// PSM (Page Segmentation Mode) オプション
const PSM_OPTIONS = [
  { value: 0, label: "0: 向きとスクリプト検出のみ" },
  { value: 1, label: "1: 自動ページ分割（OSD付き）" },
  { value: 3, label: "3: 完全自動ページ分割" },
  { value: 4, label: "4: 単一列の可変サイズテキスト" },
  { value: 6, label: "6: 統一されたテキストブロック（推奨）" },
  { value: 7, label: "7: 単一テキスト行" },
  { value: 8, label: "8: 単一単語" },
  { value: 10, label: "10: 単一文字" },
  { value: 11, label: "11: スパースなテキスト" },
  { value: 13, label: "13: 生のライン（テキスト順序なし）" },
]

// OEM (OCR Engine Mode) オプション
const OEM_OPTIONS = [
  { value: 0, label: "0: レガシーエンジンのみ" },
  { value: 1, label: "1: ニューラルネットワークLSTMのみ" },
  { value: 2, label: "2: レガシー + LSTM" },
  { value: 3, label: "3: デフォルト（利用可能なものに基づく）" },
]

export default function OCRReader({ onTextExtracted }: OCRReaderProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processedImagePreview, setProcessedImagePreview] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<string>("")
  const [confidence, setConfidence] = useState<number | null>(null)
  const [error, setError] = useState<string>("")
  const [tesseractLoaded, setTesseractLoaded] = useState(false)
  const [ocrSettings, setOcrSettings] = useState<OCRSettings>(DEFAULT_SETTINGS)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* ------------ 安全な関数チェック ------------ */
  const safeCall = async (fn: any, ...args: any[]): Promise<any> => {
    if (typeof fn === "function") {
      return await fn(...args)
    }
    return null
  }

  const hasMethod = (obj: any, method: string): boolean => {
    return obj && typeof obj[method] === "function"
  }

  /* ------------ Tesseract.js ローダ ------------ */
  const loadTesseract = () => {
    if (window.Tesseract) {
      setTesseractLoaded(true)
      return
    }

    try {
      const script = document.createElement("script")
      script.src = "https://unpkg.com/tesseract.js@5/dist/tesseract.min.js"
      script.onload = () => {
        setTimeout(() => {
          if (window.Tesseract) {
            setTesseractLoaded(true)
          } else {
            setError("Tesseract.js の初期化に失敗しました")
          }
        }, 100)
      }
      script.onerror = () => setError("Tesseract.js の読み込みに失敗しました")
      document.head.appendChild(script)
    } catch (err) {
      setError("スクリプトの読み込み中にエラーが発生しました")
    }
  }

  /* ------------ 画像前処理 ------------ */
  const preprocessImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current
      if (!canvas) {
        reject(new Error("Canvas not available"))
        return
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context not available"))
        return
      }

      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        try {
          // キャンバスサイズを設定（高解像度化）
          const scale = Math.max(1, ocrSettings.dpi / 150) // 150 DPIを基準とする
          canvas.width = img.width * scale
          canvas.height = img.height * scale

          // 高品質スケーリング
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"

          // 画像を描画
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // 画像データを取得
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data

          // 前処理の適用
          if (ocrSettings.enablePreprocessing) {
            // コントラスト調整
            const contrastFactor = (259 * (ocrSettings.contrast + 255)) / (255 * (259 - ocrSettings.contrast))

            // 明度調整
            const brightnessFactor = ocrSettings.brightness - 100

            for (let i = 0; i < data.length; i += 4) {
              // RGB値を取得
              let r = data[i]
              let g = data[i + 1]
              let b = data[i + 2]

              // 明度調整
              r = Math.max(0, Math.min(255, r + brightnessFactor))
              g = Math.max(0, Math.min(255, g + brightnessFactor))
              b = Math.max(0, Math.min(255, b + brightnessFactor))

              // コントラスト調整
              r = Math.max(0, Math.min(255, contrastFactor * (r - 128) + 128))
              g = Math.max(0, Math.min(255, contrastFactor * (g - 128) + 128))
              b = Math.max(0, Math.min(255, contrastFactor * (b - 128) + 128))

              // グレースケール変換（OCR精度向上のため）
              const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b)

              // 二値化（しきい値: 128）
              const binary = gray > 128 ? 255 : 0

              data[i] = binary // R
              data[i + 1] = binary // G
              data[i + 2] = binary // B
              // Alpha値はそのまま
            }
          }

          // 処理済み画像データを適用
          ctx.putImageData(imageData, 0, 0)

          // 処理済み画像のプレビューを生成
          const processedDataUrl = canvas.toDataURL("image/png")
          setProcessedImagePreview(processedDataUrl)

          resolve(processedDataUrl)
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("画像の読み込みに失敗しました"))
      img.src = URL.createObjectURL(file)
    })
  }

  /* ------------ テキスト後処理 ------------ */
  const postprocessText = (text: string): string => {
    if (!ocrSettings.enablePostprocessing) return text

    let processed = text

    // 一般的な誤認識パターンの修正
    const corrections = [
      // 数字の誤認識
      [/[Il|]/g, "1"],
      [/[Oo]/g, "0"],
      [/[Ss]/g, "5"],

      // 日本語の一般的な誤認識
      [/ー/g, "ー"], // 長音符の統一
      [/～/g, "〜"], // 波ダッシュの統一

      // 英語の一般的な誤認識
      [/rn/g, "m"],
      [/vv/g, "w"],
      [/\|/g, "l"],

      // 不要な文字の除去
      [/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF]/g, ""], // 日本語、英数字、空白以外を除去
    ]

    corrections.forEach(([pattern, replacement]) => {
      processed = processed.replace(pattern, replacement as string)
    })

    // 連続する空白を単一の空白に変換
    processed = processed.replace(/\s+/g, " ")

    // 前後の空白を除去
    processed = processed.trim()

    return processed
  }

  /* ------------ 画像選択 ------------ */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("ファイルサイズが大きすぎます（10MB以下）")
      return
    }

    setSelectedImage(file)
    setError("")
    setExtractedText("")
    setConfidence(null)
    setProcessedImagePreview(null)

    // 元画像のプレビュー
    if (typeof FileReader !== "undefined") {
      const reader = new FileReader()
      reader.onload = (ev) => setImagePreview(ev.target?.result as string)
      reader.onerror = () => setError("画像の読み込みに失敗しました")
      reader.readAsDataURL(file)
    } else {
      setError("このブラウザは画像プレビューに対応していません")
    }

    if (!tesseractLoaded) loadTesseract()
  }

  /* ------------ OCR 処理 ------------ */
  const processImage = async () => {
    if (!selectedImage) {
      setError("画像が選択されていません")
      return
    }

    if (!window.Tesseract) {
      setError("OCRライブラリが読み込まれていません")
      return
    }

    setIsProcessing(true)
    setProgress("画像を前処理中...")
    setError("")

    try {
      // 画像前処理
      let imageToProcess: string | File = selectedImage
      if (ocrSettings.enablePreprocessing) {
        imageToProcess = await preprocessImage(selectedImage)
      }

      setProgress("OCR エンジン初期化中...")

      let text = ""
      let conf: number | null = null

      // ワーカー API を試行
      if (hasMethod(window.Tesseract, "createWorker")) {
        try {
          const worker = window.Tesseract!.createWorker!()

          if (worker) {
            // ワーカーの設定
            if (hasMethod(worker, "loadLanguage") && hasMethod(worker, "initialize")) {
              if (hasMethod(worker, "load")) {
                await safeCall(worker.load)
              }

              setProgress("言語データを読み込み中...")
              await safeCall(worker.loadLanguage, ocrSettings.language)

              setProgress("OCRエンジンを初期化中...")
              await safeCall(worker.initialize, ocrSettings.language)

              // Tesseractパラメータの設定
              if (hasMethod(worker, "setParameters")) {
                await safeCall(worker.setParameters, {
                  tessedit_pageseg_mode: ocrSettings.psm.toString(),
                  tessedit_ocr_engine_mode: ocrSettings.oem.toString(),
                  tessedit_char_whitelist: ocrSettings.whitelist,
                  tessedit_char_blacklist: ocrSettings.blacklist,
                  user_defined_dpi: ocrSettings.dpi.toString(),
                })
              }
            }

            // 認識処理
            if (hasMethod(worker, "recognize")) {
              setProgress("文字を読み取り中...")
              const result = await safeCall(worker.recognize, imageToProcess)

              if (result) {
                text = result.data?.text || result.text || ""
                conf = result.data?.confidence ? Math.round(result.data.confidence) : null
              }

              // ワーカー終了
              if (hasMethod(worker, "terminate")) {
                await safeCall(worker.terminate)
              }
            }
          }
        } catch (workerError) {
          console.warn("ワーカー API でエラー、静的 API にフォールバック:", workerError)
          // 静的 API にフォールバック
          if (hasMethod(window.Tesseract, "recognize")) {
            const result = await safeCall(window.Tesseract!.recognize!, imageToProcess, ocrSettings.language)
            if (result?.data) {
              text = result.data.text || ""
              conf = result.data.confidence ? Math.round(result.data.confidence) : null
            }
          }
        }
      }

      // テキスト後処理
      if (text && ocrSettings.enablePostprocessing) {
        setProgress("テキストを後処理中...")
        text = postprocessText(text)
      }

      /* ---------- 結果反映 ---------- */
      setExtractedText(text.trim())
      setConfidence(conf)

      if (typeof onTextExtracted === "function") {
        onTextExtracted(text.trim())
      }

      setProgress("")
      console.log("📖 OCR 完了:", {
        length: text.length,
        confidence: conf,
        settings: ocrSettings,
      })
    } catch (err) {
      console.error("OCR 処理エラー:", err)
      setError(`文字認識に失敗しました: ${err instanceof Error ? err.message : "不明なエラー"}`)
      setProgress("")
    } finally {
      setIsProcessing(false)
    }
  }

  /* ------------ 設定更新 ------------ */
  const updateSettings = (key: keyof OCRSettings, value: any) => {
    setOcrSettings((prev) => ({ ...prev, [key]: value }))
  }

  /* ------------ プリセット設定 ------------ */
  const applyPreset = (preset: string) => {
    switch (preset) {
      case "document":
        setOcrSettings({
          ...DEFAULT_SETTINGS,
          psm: 6,
          dpi: 300,
          contrast: 120,
          brightness: 110,
        })
        break
      case "handwriting":
        setOcrSettings({
          ...DEFAULT_SETTINGS,
          psm: 13,
          dpi: 400,
          contrast: 140,
          brightness: 105,
        })
        break
      case "screenshot":
        setOcrSettings({
          ...DEFAULT_SETTINGS,
          psm: 3,
          dpi: 200,
          contrast: 110,
          brightness: 100,
        })
        break
      case "lowquality":
        setOcrSettings({
          ...DEFAULT_SETTINGS,
          psm: 6,
          dpi: 400,
          contrast: 150,
          brightness: 115,
          enablePreprocessing: true,
        })
        break
    }
  }

  /* ------------ ユーティリティ ------------ */
  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setProcessedImagePreview(null)
    setExtractedText("")
    setConfidence(null)
    setError("")
    setProgress("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const copyToClipboard = async () => {
    if (!extractedText) return

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(extractedText)
        console.log("📋 テキストをクリップボードにコピーしました")
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = extractedText
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        console.log("📋 テキストをクリップボードにコピーしました（フォールバック）")
      }
    } catch (err) {
      console.error("クリップボードへのコピーに失敗:", err)
      setError("クリップボードへのコピーに失敗しました")
    }
  }

  const downloadText = () => {
    if (!extractedText) return

    try {
      if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `extracted-text-${new Date().toISOString().slice(0, 10)}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)

        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(url)
        }
      }
    } catch (err) {
      console.error("ダウンロードに失敗:", err)
      setError("ファイルのダウンロードに失敗しました")
    }
  }

  /* ------------ JSX ------------ */
  return (
    <div className="space-y-6">
      <Card className="border-[rgb(159,21,71)] border-2">
        <CardHeader>
          <CardTitle className="flex items-center text-[rgb(159,21,71)]">
            <FileText className="mr-2 h-5 w-5" />
            高精度画像文字認識（OCR）
          </CardTitle>
          <p className="text-sm text-gray-600">
            Tesseract.jsを使用した高精度な文字認識。前処理・後処理により認識精度を向上させます。
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* プリセット選択 */}
          <div>
            <Label className="text-[rgb(159,21,71)] mb-2 block">認識プリセット</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => applyPreset("document")} className="text-sm">
                📄 文書
              </Button>
              <Button variant="outline" onClick={() => applyPreset("handwriting")} className="text-sm">
                ✍️ 手書き
              </Button>
              <Button variant="outline" onClick={() => applyPreset("screenshot")} className="text-sm">
                📱 スクリーンショット
              </Button>
              <Button variant="outline" onClick={() => applyPreset("lowquality")} className="text-sm">
                🔍 低品質画像
              </Button>
            </div>
          </div>

          {/* 詳細設定の表示切り替え */}
          <div className="flex items-center space-x-2">
            <Switch id="show-advanced" checked={showAdvanced} onCheckedChange={setShowAdvanced} />
            <Label htmlFor="show-advanced" className="text-sm">
              詳細設定を表示
            </Label>
          </div>

          {/* 詳細設定 */}
          {showAdvanced && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">基本設定</TabsTrigger>
                <TabsTrigger value="preprocessing">前処理</TabsTrigger>
                <TabsTrigger value="advanced">高度な設定</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label className="text-[rgb(159,21,71)]">認識言語</Label>
                  <Select value={ocrSettings.language} onValueChange={(value) => updateSettings("language", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[rgb(159,21,71)]">ページ分割モード (PSM)</Label>
                  <Select
                    value={ocrSettings.psm.toString()}
                    onValueChange={(value) => updateSettings("psm", Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PSM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="preprocessing" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-preprocessing"
                    checked={ocrSettings.enablePreprocessing}
                    onCheckedChange={(checked) => updateSettings("enablePreprocessing", checked)}
                  />
                  <Label htmlFor="enable-preprocessing">画像前処理を有効化</Label>
                </div>

                <div>
                  <Label className="text-[rgb(159,21,71)]">DPI設定: {ocrSettings.dpi}</Label>
                  <Slider
                    value={[ocrSettings.dpi]}
                    onValueChange={([value]) => updateSettings("dpi", value)}
                    min={150}
                    max={600}
                    step={50}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[rgb(159,21,71)]">コントラスト: {ocrSettings.contrast}%</Label>
                  <Slider
                    value={[ocrSettings.contrast]}
                    onValueChange={([value]) => updateSettings("contrast", value)}
                    min={50}
                    max={200}
                    step={10}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-[rgb(159,21,71)]">明度: {ocrSettings.brightness}%</Label>
                  <Slider
                    value={[ocrSettings.brightness]}
                    onValueChange={([value]) => updateSettings("brightness", value)}
                    min={50}
                    max={150}
                    step={5}
                    className="mt-2"
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div>
                  <Label className="text-[rgb(159,21,71)]">OCRエンジンモード (OEM)</Label>
                  <Select
                    value={ocrSettings.oem.toString()}
                    onValueChange={(value) => updateSettings("oem", Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OEM_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-postprocessing"
                    checked={ocrSettings.enablePostprocessing}
                    onCheckedChange={(checked) => updateSettings("enablePostprocessing", checked)}
                  />
                  <Label htmlFor="enable-postprocessing">テキスト後処理を有効化</Label>
                </div>

                <div>
                  <Label className="text-[rgb(159,21,71)]">許可文字（空白で全て許可）</Label>
                  <input
                    type="text"
                    value={ocrSettings.whitelist}
                    onChange={(e) => updateSettings("whitelist", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="例: 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZあいうえお"
                  />
                </div>

                <div>
                  <Label className="text-[rgb(159,21,71)]">除外文字</Label>
                  <input
                    type="text"
                    value={ocrSettings.blacklist}
                    onChange={(e) => updateSettings("blacklist", e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="例: !@#$%^&*()"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* ファイル選択 */}
          <div>
            <Label className="text-[rgb(159,21,71)]">画像ファイル</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                id="ocr-file"
                className="hidden"
              />
              <label
                htmlFor="ocr-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <Camera className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500 mt-2">クリックして画像を選択</span>
                <span className="text-xs text-gray-400">JPG, PNG, GIF対応（最大10MB）</span>
              </label>
            </div>
          </div>

          {/* エラー */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* 画像プレビュー */}
          {(imagePreview || processedImagePreview) && (
            <div className="space-y-4">
              <Tabs defaultValue="original" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">元画像</TabsTrigger>
                  <TabsTrigger value="processed" disabled={!processedImagePreview}>
                    処理済み画像
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="original">
                  {imagePreview && (
                    <div className="relative max-w-md mx-auto">
                      <Image
                        src={imagePreview || "/placeholder.svg"}
                        alt="original preview"
                        width={400}
                        height={300}
                        className="w-full h-auto rounded-lg border"
                      />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={clearImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="processed">
                  {processedImagePreview && (
                    <div className="relative max-w-md mx-auto">
                      <Image
                        src={processedImagePreview || "/placeholder.svg"}
                        alt="processed preview"
                        width={400}
                        height={300}
                        className="w-full h-auto rounded-lg border"
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* OCR ボタン */}
          {selectedImage && !isProcessing && (
            <Button
              className="w-full bg-[rgb(159,21,71)] hover:bg-[rgb(139,11,61)]"
              disabled={!tesseractLoaded}
              onClick={processImage}
            >
              <Zap className="mr-2 h-4 w-4" />
              {tesseractLoaded ? "高精度文字認識を実行" : "ライブラリ読み込み中…"}
            </Button>
          )}

          {/* 処理中表示 */}
          {isProcessing && (
            <div className="text-center py-4">
              <Loader2 className="animate-spin h-8 w-8 mx-auto text-[rgb(159,21,71)]" />
              <p className="text-sm text-gray-600 mt-2">{progress}</p>
              <p className="text-xs text-gray-500 mt-1">高精度処理のため時間がかかる場合があります</p>
            </div>
          )}

          {/* 結果 */}
          {extractedText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-[rgb(159,21,71)]">認識結果</Label>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {confidence !== null && (
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        confidence >= 80
                          ? "bg-green-100 text-green-800"
                          : confidence >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      信頼度: {confidence}%
                    </span>
                  )}
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadText}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                placeholder="認識された文字がここに表示されます..."
              />
              <p className="text-xs text-gray-500">
                認識結果は編集可能です。後処理により一般的な誤認識は自動修正されています。
              </p>
            </div>
          )}

          {/* 隠しキャンバス（画像処理用） */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </CardContent>
      </Card>
    </div>
  )
}
