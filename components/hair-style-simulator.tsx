"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Scissors, User, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ImageUploader from "@/components/image-uploader"
import HairStyleOptions from "@/components/hair-style-options"
import ResultViewer from "@/components/result-viewer"
import AccountCreation from "@/components/account-creation"
import { sendHairstyleNotification, EmailNotificationMonitor } from "@/lib/email-service"

export type HairStyle = {
  length: string
  color: string
  style: string
}

export type UserImages = {
  front?: File | null
  left?: File | null
  right?: File | null
}

export type UserAccount = {
  name: string
  email: string
  createdAt: string
}

type EmailStatus = "idle" | "sending" | "success" | "error" | "retrying"

export default function HairStyleSimulator() {
  const [activeTab, setActiveTab] = useState("account")
  const [userImages, setUserImages] = useState<UserImages>({})
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null)
  const [hairStyle, setHairStyle] = useState<HairStyle>({
    length: "medium",
    color: "black",
    style: "straight",
  })
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle")
  const [emailMessage, setEmailMessage] = useState("")
  const [retryCount, setRetryCount] = useState(0)

  const emailMonitor = EmailNotificationMonitor.getInstance()

  useEffect(() => {
    // ローカルストレージからユーザーアカウント情報を読み込み
    const savedAccount = localStorage.getItem("userAccount")
    if (savedAccount) {
      setUserAccount(JSON.parse(savedAccount))
      setActiveTab("upload")
    }
  }, [])

  const handleAccountCreated = (email: string, name: string) => {
    const account: UserAccount = {
      name,
      email,
      createdAt: new Date().toISOString(),
    }
    setUserAccount(account)
    setActiveTab("upload")
  }

  const handleImagesUploaded = (images: UserImages) => {
    setUserImages(images)
  }

  const handleHairStyleChange = (style: Partial<HairStyle>) => {
    setHairStyle({ ...hairStyle, ...style })
  }

  const generateImages = async () => {
    setIsGenerating(true)
    setEmailStatus("idle")
    setEmailMessage("")
    setRetryCount(0)

    try {
      // 実際の画像を使用
      const images = ["/images/hairstyle-front.png", "/images/hairstyle-side.png", "/images/hairstyle-back.png"]

      // 画像生成の模擬的な処理時間
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setGeneratedImages(images)
      setActiveTab("result")

      // メール通知を送信
      if (userAccount) {
        setEmailStatus("sending")
        setEmailMessage("メール通知を送信中...")

        const emailResult = await sendHairstyleNotification(
          {
            userEmail: userAccount.email,
            userName: userAccount.name,
            imageUrls: images,
            hairStyle: hairStyle,
          },
          (retryCount, error) => {
            setEmailStatus("retrying")
            setRetryCount(retryCount)
            setEmailMessage(`メール送信を再試行中... (${retryCount}回目)`)
          },
        )

        // 送信履歴を記録
        emailMonitor.recordSend(userAccount.email, emailResult)

        if (emailResult.success) {
          setEmailStatus("success")
          setEmailMessage(
            `メール通知を正常に送信しました${emailResult.retryCount && emailResult.retryCount > 0 ? ` (${emailResult.retryCount}回の再試行後)` : ""}`,
          )
        } else {
          setEmailStatus("error")
          setEmailMessage(`メール送信に失敗しました: ${emailResult.message}`)
          console.error("Email notification failed:", emailResult)
        }
      }
    } catch (error) {
      console.error("Failed to generate images:", error)
      setEmailStatus("error")
      setEmailMessage("画像生成中にエラーが発生しました")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? generatedImages.length - 1 : prev - 1))
  }

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === generatedImages.length - 1 ? 0 : prev + 1))
  }

  const handleLogout = () => {
    localStorage.removeItem("userAccount")
    setUserAccount(null)
    setActiveTab("account")
    setUserImages({})
    setGeneratedImages([])
    setCurrentImageIndex(0)
    setEmailStatus("idle")
    setEmailMessage("")
    setRetryCount(0)
  }

  const getEmailStatusIcon = () => {
    switch (emailStatus) {
      case "sending":
      case "retrying":
        return <Clock className="h-4 w-4 animate-spin" />
      case "success":
        return <CheckCircle className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getEmailStatusColor = () => {
    switch (emailStatus) {
      case "success":
        return "border-green-200 bg-green-50 text-green-800"
      case "error":
        return "border-red-200 bg-red-50 text-red-800"
      case "sending":
      case "retrying":
        return "border-blue-200 bg-blue-50 text-blue-800"
      default:
        return "border-gray-200 bg-gray-50 text-gray-800"
    }
  }

  const isUploadComplete = userImages.front && (userImages.left || userImages.right)
  const canGenerate = isUploadComplete && hairStyle.length && hairStyle.color && hairStyle.style

  if (!userAccount) {
    return <AccountCreation onAccountCreated={handleAccountCreated} />
  }

  return (
    <Card className="border-[rgb(159,21,71)] border-2">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-sm text-gray-600">ようこそ、{userAccount.name}さん</p>
            <p className="text-xs text-gray-500">{userAccount.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="border-[rgb(159,21,71)] text-[rgb(159,21,71)]"
          >
            <User className="mr-2 h-4 w-4" />
            ログアウト
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger
              value="upload"
              className="data-[state=active]:bg-[rgb(159,21,71)] data-[state=active]:text-white"
            >
              <Upload className="mr-2 h-4 w-4" />
              写真アップロード
            </TabsTrigger>
            <TabsTrigger
              value="style"
              className="data-[state=active]:bg-[rgb(159,21,71)] data-[state=active]:text-white"
            >
              <Scissors className="mr-2 h-4 w-4" />
              髪型選択
            </TabsTrigger>
            <TabsTrigger
              value="result"
              className="data-[state=active]:bg-[rgb(159,21,71)] data-[state=active]:text-white"
            >
              結果
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <ImageUploader onImagesUploaded={handleImagesUploaded} userImages={userImages} />

            {isUploadComplete && (
              <Button
                className="w-full mt-4 bg-[rgb(159,21,71)] hover:bg-[rgb(139,11,61)]"
                onClick={() => setActiveTab("style")}
              >
                次へ: 髪型を選択
              </Button>
            )}
          </TabsContent>

          <TabsContent value="style">
            <HairStyleOptions hairStyle={hairStyle} onChange={handleHairStyleChange} />

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="flex-1 border-[rgb(159,21,71)] text-[rgb(159,21,71)]"
                onClick={() => setActiveTab("upload")}
              >
                戻る
              </Button>
              <Button
                className="flex-1 bg-[rgb(159,21,71)] hover:bg-[rgb(139,11,61)]"
                disabled={!canGenerate || isGenerating}
                onClick={generateImages}
              >
                {isGenerating ? "生成中..." : "ヘアスタイルを生成"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="result">
            {generatedImages.length > 0 ? (
              <>
                {emailStatus !== "idle" && emailMessage && (
                  <Alert className={`mb-4 ${getEmailStatusColor()}`}>
                    <div className="flex items-center">
                      {getEmailStatusIcon()}
                      <AlertDescription className="ml-2">
                        {emailMessage}
                        {emailStatus === "retrying" && retryCount > 0 && (
                          <span className="block text-xs mt-1">再試行回数: {retryCount}</span>
                        )}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
                <ResultViewer
                  images={generatedImages}
                  currentIndex={currentImageIndex}
                  onPrev={handlePrevImage}
                  onNext={handleNextImage}
                />
              </>
            ) : (
              <div className="text-center py-8">
                まだ画像が生成されていません。
                <Button
                  className="mt-4 bg-[rgb(159,21,71)] hover:bg-[rgb(139,11,61)]"
                  onClick={() => setActiveTab("style")}
                >
                  髪型を選択する
                </Button>
              </div>
            )}

            {generatedImages.length > 0 && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-[rgb(159,21,71)] text-[rgb(159,21,71)]"
                  onClick={() => setActiveTab("style")}
                >
                  髪型を再選択
                </Button>
                <Button
                  className="flex-1 bg-[rgb(159,21,71)] hover:bg-[rgb(139,11,61)]"
                  onClick={() => setActiveTab("upload")}
                >
                  新しい写真
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
