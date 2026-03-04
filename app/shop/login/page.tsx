import { Suspense } from "react"
import LoginClient from "./LoginClient"

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <p style={{ padding: 40 }}>加载中...</p>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  )
}