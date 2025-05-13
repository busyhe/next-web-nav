"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { NavData } from "@/config/site"

interface SitesContextValue {
  sites: NavData[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SitesContext = createContext<SitesContextValue>({
  sites: [],
  loading: true,
  error: null,
  refresh: async () => {}
})

export const SitesProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<Omit<SitesContextValue, 'refresh'>>({
    sites: [],
    loading: true,
    error: null
  })

  const fetchData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      const response = await fetch('/api/sites')
      const { success, data, error } = await response.json()
      
      if (!success) throw new Error(error || 'Failed to fetch data')
      
      setState({
        sites: data || [],
        loading: false,
        error: null
      })
    } catch (err) {
      setState({
        sites: [],
        loading: false,
        error: (err as Error).message || 'Failed to load data'
      })
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <SitesContext.Provider value={{ ...state, refresh: fetchData }}>
      {children}
    </SitesContext.Provider>
  )
}

export const useSites = () => useContext(SitesContext)