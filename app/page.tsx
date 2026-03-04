import { redirect } from "next/navigation"

export default function RootPage() {
  // 默认访问根路径时，跳转到商城首页
  redirect("/shop")
}