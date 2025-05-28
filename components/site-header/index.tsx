"use client"

import Link from "next/link"
import { useCallback, useState } from "react"

import { NavLink, siteConfig, NavData } from "@/config/site"
import { Circle, Laptop, Moon, Sun, RefreshCw } from "lucide-react"
import { useTheme } from "next-themes"
import { DialogTitle } from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command"

import { Icons } from "./components/icons"
import { ThemeToggle } from "./components/theme-toggle"

export function SiteHeader({ sites }: { sites:  NavData[] }) {
  const [open, setOpen] = useState(false)
  const { setTheme } = useTheme()
  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <header className="sticky top-0 z-40 w-full bg-background dark:border-slate-50/[0.06] lg:border-b lg:border-slate-900/10">
      <div className="container m-0 flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <nav className="flex flex-1 items-center justify-end space-x-4">
          <div className="flex w-full items-center space-x-1 sm:w-auto">
            <Button
              variant="outline"
              className="relative h-8 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-56 xl:w-64"
              onClick={() => setOpen(true)}
            >
              搜索网站...
            </Button>
            <Link href={siteConfig.links.github} target="_blank" rel="noreferrer">
              <Button className="rounded-full" variant="ghost" size="icon">
                <Icons.gitHub className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </div>
      <CommandDialog open={open} aria-describedby={undefined} onOpenChange={setOpen}>
        <DialogTitle className="hidden" />
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {sites.map((category: NavData) => (
            <CommandGroup heading={category.title} key={category.title}>
              {category.items.map((navItem: NavLink) => (
                <CommandItem
                  key={navItem.link}
                  value={navItem.title}
                  onSelect={() => {
                    runCommand(() => window.open(navItem.link, "_blank"))
                  }}
                >
                  <div className="mr-2 flex h-4 w-4 items-center justify-center">
                    <Circle className="h-3 w-3" />
                  </div>
                  {navItem.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun />
              Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon />
              Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <Laptop />
              System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  )
}
