'use client'

import { useEffect } from 'react'

// Wires up the IntersectionObserver that toggles `.in` on `.reveal` elements.
// Mounted once at the page root; safe to render multiple times (idempotent).
export default function ScrollReveal() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const els = document.querySelectorAll('.reveal:not(.in)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )

    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return null
}
