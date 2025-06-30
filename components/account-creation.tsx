"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, User } from "lucide-react"

interface AccountCreationProps {
  onAccountCreated: (email: string, name: string) => void
}

export default function AccountCreation({ onAccountCreated }: AccountCreationProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "名前を入力してください"
    }

    if (!formData.email.trim()) {
      newErrors.email = "メールアドレスを入力してください"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "有効なメールアドレスを入力してください"
    }

    if (!formData.password) {
      newErrors.password = "パスワードを入力してください"
    } else if (formData.password.length < 6) {
      newErrors.password = "パスワードは6文字以上で入力してください"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "パスワードが一致しません"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      // 実際のアプリでは、ここでサーバーにアカウント作成リクエストを送信
      await new Promise((resolve) => setTimeout(resolve, 1000)) // 模擬的な処理時間

      // ローカルストレージにユーザー情報を保存（実際のアプリでは適切な認証システムを使用）
      localStorage.setItem(
        "userAccount",
        JSON.stringify({
          name: formData.name,
          email: formData.email,
          createdAt: new Date().toISOString(),
        }),
      )

      onAccountCreated(formData.email, formData.name)
    } catch (error) {
      console.error("Account creation failed:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" })
    }
  }

  return (
    <Card className="border-[rgb(159,21,71)] border-2">
      <CardHeader>
        <CardTitle className="text-center text-[rgb(159,21,71)]">アカウント作成</CardTitle>
        <p className="text-sm text-gray-600 text-center">
          髪型生成完了時にメール通知を受け取るためにアカウントを作成してください
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="flex items-center text-[rgb(159,21,71)]">
              <User className="mr-2 h-4 w-4" />
              お名前
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="mt-1"
              placeholder="山田太郎"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="email" className="flex items-center text-[rgb(159,21,71)]">
              <Mail className="mr-2 h-4 w-4" />
              メールアドレス
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="mt-1"
              placeholder="example@email.com"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="password" className="flex items-center text-[rgb(159,21,71)]">
              <Lock className="mr-2 h-4 w-4" />
              パスワード
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="mt-1"
              placeholder="6文字以上"
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="flex items-center text-[rgb(159,21,71)]">
              <Lock className="mr-2 h-4 w-4" />
              パスワード確認
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className="mt-1"
              placeholder="パスワードを再入力"
            />
            {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full bg-[rgb(159,21,71)] hover:bg-[rgb(139,11,61)]" disabled={isLoading}>
            {isLoading ? "作成中..." : "アカウントを作成"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
