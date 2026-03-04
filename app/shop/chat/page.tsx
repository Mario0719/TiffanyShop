import { Suspense } from "react"
import ChatClient from "./ChatClient"

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="chat-page center">
          <p>加载中...</p>
        </div>
      }
    >
      <ChatClient />
    </Suspense>
  )
}