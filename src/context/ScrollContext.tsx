'use client'

import { createContext, useContext, useState } from 'react'

type ScrollContextType = {
  currentSection: number
  setCurrentSection: (section: number) => void
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined)

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  const [currentSection, setCurrentSection] = useState(0)

  return (
    <ScrollContext.Provider value={{ currentSection, setCurrentSection }}>
      {children}
    </ScrollContext.Provider>
  )
}

export function useScroll() {
  const context = useContext(ScrollContext)
  if (context === undefined) {
    throw new Error('useScroll must be used within a ScrollProvider')
  }
  return context
}