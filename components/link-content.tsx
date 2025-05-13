import { Suspense } from "react"
import { NavLink, NavData } from "@/config/site"
import SiteCards from "./site-cards"

async function LinkContentItems({ sites }: { sites: NavData[] }) {
  return (
    <div className="w-full pb-4 pt-4">
      <div id="main" className="mx-auto w-full px-4 md:px-6">
        {sites.map((category, index: number) => {
          const items = category.items.map(({ title, desc, link, icon }: NavLink) => ({
            link,
            title,
            description: desc,
            icon
          }))
          
          return (
            <div id={String(index)} key={index} className="mb-12">
              <div className="my-4">
                <h1 className="mb-2 text-2xl font-bold text-primary/80 sm:text-3xl">{category.title}</h1>
              </div>
              <SiteCards items={items} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LinkContent({ sites }: { sites: NavData[] }) {
  return (
    <Suspense fallback={<div className="flex h-96 items-center justify-center">Loading...</div>}>
      <LinkContentItems sites={sites} />
    </Suspense>
  )
}
