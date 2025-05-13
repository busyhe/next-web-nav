import { LinkContent } from "@/components/link-content"
import { Sidebar } from "@/components/sidebar"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { fetchSites } from "@/app/actions/sites"


export default async function IndexPage() {
  const { success, data, error } = await fetchSites()
  const sites = success ? data : []
  
  return (
    <div className="container relative mx-auto min-h-screen w-full px-0">
      <div className="flex">
        <div className="fixed z-20 hidden min-h-screen w-[16rem] transition-all duration-300 ease-in-out sm:block">
          <Sidebar sites={sites} />
        </div>
        <div className="sm:pl-[16rem]">
          <SiteHeader sites={sites} />
          <LinkContent sites={sites} />
          <SiteFooter />
        </div>
      </div>
    </div>
  )
}
