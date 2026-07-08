'use client'

import { useEffect } from 'react'
import Hero from '@/components/Hero'
import ServicesSection from '@/components/ServicesSection'
import CapabilitiesSection from '@/components/CapabilitiesSection'
import ApproachSection from '@/components/ApproachSection'
import StatsSection from '@/components/StatsSection'
import CaseStudiesSection from '@/components/CaseStudiesSection'
import WhyUsSection from '@/components/WhyUsSection'
import LeadershipSection from '@/components/LeadershipSection'
import CTASection from '@/components/CTASection'
import ScrollReveal from '@/components/ScrollReveal'

export default function Home() {
  useEffect(() => {
    // Honor anchor hash on initial load; otherwise start at top.
    if (!window.location.hash) {
      window.scrollTo(0, 0)
    }
  }, [])

  return (
    <>
      <ScrollReveal />
      <Hero />
      <ServicesSection />
      <CapabilitiesSection />
      <ApproachSection />
      <StatsSection />
      <CaseStudiesSection />
      <WhyUsSection />
      <LeadershipSection />
      <CTASection />
    </>
  )
}
