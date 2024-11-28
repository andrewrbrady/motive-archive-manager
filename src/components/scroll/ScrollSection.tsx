'use client'

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useScroll } from '@/context/ScrollContext'

type ScrollSectionProps = {
  children: React.ReactNode
  index: number
}

export default function ScrollSection({ children, index }: ScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.5 })
  const { setCurrentSection } = useScroll()

  useEffect(() => {
    if (isInView) {
      setCurrentSection(index)
    }
  }, [isInView, index, setCurrentSection])

  return (
    <motion.div
      ref={ref}
      data-section={index}
      className="min-h-screen snap-start"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  )
}