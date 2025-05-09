import "@/styles/globals.css"
import { Metadata, Viewport } from "next"

import { siteConfig } from "@/config/site"
// import { fontSans } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import { SitesProvider } from "@/contexts/sites"
import { GlobalLoadingIndicator } from "@/components/global-loading"

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`
  },
  description: siteConfig.description,
  icons: {
    icon: "/logo.ico",
    shortcut: "/logo.png",
    apple: "/apple-touch-icon.png"
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" }
  ],
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning>
        <body className={cn("min-h-screen bg-background font-sans antialiased")}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SitesProvider>
              <GlobalLoadingIndicator />
              {children}
            </SitesProvider>
          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
