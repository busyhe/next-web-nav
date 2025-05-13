import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Favicon Sync",
  description: "Sync website favicons to Notion",
}

export default function SyncLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 