export interface EmailNotificationData {
  userEmail: string
  userName: string
  imageUrls: string[]
  hairStyle: {
    length: string
    color: string
    style: string
  }
}

export interface EmailResult {
  success: boolean
  message: string
  error?: string
  retryCount?: number
}

// 再試行設定
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
}

// 指数バックオフによる遅延計算
function calculateDelay(retryCount: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, retryCount)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}

// 遅延実行のためのユーティリティ
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// メールアドレスの検証
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 単一のメール送信試行
async function attemptEmailSend(data: EmailNotificationData): Promise<EmailResult> {
  const GAS_WEB_APP_URL =
    "https://script.google.com/macros/s/AKfycbxBgqghyXp4wCLYFqXIyMNOQFWlDMrvdp5xz4UwrWPPXHq9_T2LnzOI8dIrsREQx0y4cA/exec"

  try {
    // 入力データの検証
    if (!validateEmail(data.userEmail)) {
      return {
        success: false,
        message: "無効なメールアドレスです",
        error: "INVALID_EMAIL",
      }
    }

    if (!data.userName?.trim()) {
      return {
        success: false,
        message: "ユーザー名が設定されていません",
        error: "MISSING_USERNAME",
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒タイムアウト

    const response = await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "sendHairstyleNotification",
        data: data,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.success) {
      return {
        success: true,
        message: "メール通知を正常に送信しました",
      }
    } else {
      return {
        success: false,
        message: "メール送信に失敗しました",
        error: result.error || "UNKNOWN_ERROR",
      }
    }
  } catch (error) {
    let errorMessage = "メール送信中にエラーが発生しました"
    let errorCode = "NETWORK_ERROR"

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = "メール送信がタイムアウトしました"
        errorCode = "TIMEOUT"
      } else if (error.message.includes("Failed to fetch")) {
        errorMessage = "ネットワーク接続に問題があります"
        errorCode = "NETWORK_ERROR"
      } else {
        errorMessage = error.message
      }
    }

    return {
      success: false,
      message: errorMessage,
      error: errorCode,
    }
  }
}

// 再試行機能付きメール送信
export async function sendHairstyleNotification(
  data: EmailNotificationData,
  onRetry?: (retryCount: number, error: string) => void,
): Promise<EmailResult> {
  let lastResult: EmailResult = {
    success: false,
    message: "未実行",
  }

  for (let retryCount = 0; retryCount <= RETRY_CONFIG.maxRetries; retryCount++) {
    // 初回以外は遅延を入れる
    if (retryCount > 0) {
      const delayMs = calculateDelay(retryCount - 1)
      onRetry?.(retryCount, lastResult.error || "UNKNOWN_ERROR")
      await delay(delayMs)
    }

    lastResult = await attemptEmailSend(data)

    if (lastResult.success) {
      return {
        ...lastResult,
        retryCount,
      }
    }

    // 再試行不要なエラーの場合は即座に終了
    if (lastResult.error === "INVALID_EMAIL" || lastResult.error === "MISSING_USERNAME") {
      break
    }

    console.warn(`Email send attempt ${retryCount + 1} failed:`, lastResult.error)
  }

  return {
    ...lastResult,
    retryCount: RETRY_CONFIG.maxRetries,
  }
}

// メール送信状況の監視用
export class EmailNotificationMonitor {
  private static instance: EmailNotificationMonitor
  private sendHistory: Array<{
    timestamp: Date
    userEmail: string
    success: boolean
    error?: string
    retryCount?: number
  }> = []

  static getInstance(): EmailNotificationMonitor {
    if (!EmailNotificationMonitor.instance) {
      EmailNotificationMonitor.instance = new EmailNotificationMonitor()
    }
    return EmailNotificationMonitor.instance
  }

  recordSend(userEmail: string, result: EmailResult): void {
    this.sendHistory.push({
      timestamp: new Date(),
      userEmail,
      success: result.success,
      error: result.error,
      retryCount: result.retryCount,
    })

    // 履歴を最新100件に制限
    if (this.sendHistory.length > 100) {
      this.sendHistory = this.sendHistory.slice(-100)
    }
  }

  getRecentFailures(minutes = 60): Array<any> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    return this.sendHistory.filter((record) => record.timestamp > cutoff && !record.success)
  }

  getSuccessRate(minutes = 60): number {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000)
    const recentSends = this.sendHistory.filter((record) => record.timestamp > cutoff)

    if (recentSends.length === 0) return 1

    const successCount = recentSends.filter((record) => record.success).length
    return successCount / recentSends.length
  }
}
