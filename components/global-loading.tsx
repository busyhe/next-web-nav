"use client"

import { useSites } from "@/contexts/sites"
import { Icons } from "./icons"

export function GlobalLoadingIndicator() {
  const { loading } = useSites()

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <Icons.spinner className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">Loading Sites...</p>
      </div>
    </div>
  )
} 