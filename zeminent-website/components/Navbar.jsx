'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useNavbar } from '@/context/NavbarContext'

const NAV_ITEMS = [
  { name: 'Services',     path: '/#services' },
  { name: 'Capabilities', path: '/#capabilities' },
  { name: 'Approach',     path: '/#approach' },
  { name: 'Case Studies', path: '/#cases' },
  { name: 'Team',         path: '/#leadership' },
  {
    name: 'Learning',
    dropdown: [
      { name: 'Student',    path: 'https://learning.zeminent.com/' },
      { name: 'Instructor', path: 'https://admin.learning.zeminent.com/admin/login' },
    ],
  },
]

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)
  const pathname = usePathname()
  const { isNavbarVisible } = useNavbar()

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const handleMobileNavigation = () => setIsMobileMenuOpen(false)

  // Same-page link → smooth scroll to top
  const handleLinkClick = (path) => {
    if (pathname === path) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }
  }

  // Narrower navbar on expense tracker page
  const isExpenseTracker = pathname?.startsWith('/products/expense-tracker')
  const navWidth = isExpenseTracker ? 'w-[calc(100%-64px)]' : 'w-[calc(100%-32px)]'
  const maxNavWidth = isExpenseTracker ? 'max-w-[950px]' : 'max-w-[1104px]'
  const navPadding = isExpenseTracker ? 'px-[16px] sm:px-[20px]' : 'px-[24px] sm:px-[32px]'

  if (!isNavbarVisible) return null

  return (
    <>
      <nav
        className={`fixed ${navWidth} ${maxNavWidth} h-[66px] top-[40px] left-1/2 transform -translate-x-1/2 rounded-[50px] border border-transparent backdrop-blur-[10px] flex items-center justify-between ${navPadding} z-[9999]`}
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          borderImage: 'linear-gradient(89.81deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 50.96%, rgba(255, 255, 255, 0) 100%)',
          borderImageSlice: 1,
          boxShadow:
            'inset 0px 1px 1.5px rgba(255, 255, 255, 0.16), inset 0px -2px 2.6px rgba(255, 255, 255, 0.16)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center">
          <Link href="/" onClick={() => handleLinkClick('/')} className="flex items-center">
            <img
              src="/images/Logo.svg"
              alt="Zeminent Logo"
              className="h-[28px] sm:h-[32px] lg:h-[36px] w-auto object-contain"
              style={{
                imageRendering: '-webkit-optimize-contrast',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
            />
          </Link>
        </div>

        {/* Desktop links */}
        <ul
          className={`hidden lg:flex items-center ${
            isExpenseTracker ? 'gap-[32px] xl:gap-[30px]' : 'gap-[30px] xl:gap-[25px]'
          }`}
        >
          {NAV_ITEMS.map((item) => {
            const linkClassName = `font-inter font-[500] ${
              isExpenseTracker ? 'text-[13px] xl:text-[14px]' : 'text-[14px] xl:text-[16px]'
            } leading-[24px] text-white cursor-pointer transition-all duration-[300ms] ease-out hover:text-[#B065FF] hover:scale-[1.05]`
            if (item.dropdown) {
              const isOpen = openDropdown === item.name
              return (
                <li
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.name)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button type="button" className={`${linkClassName} flex items-center gap-[4px]`}>
                    {item.name}
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 top-full pt-[14px] z-[10000]"
                    >
                      <ul
                        className="rounded-[16px] overflow-hidden py-[6px] min-w-[170px] backdrop-blur-[12px]"
                        style={{
                          background: 'rgba(20, 20, 30, 0.85)',
                          border: '1px solid rgba(255, 255, 255, 0.14)',
                          boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.35)',
                        }}
                      >
                        {item.dropdown.map((sub) => (
                          <li key={sub.name}>
                            <a
                              href={sub.path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block font-inter font-[500] text-[14px] xl:text-[15px] leading-[24px] text-white px-[18px] py-[10px] transition-colors duration-200 hover:bg-[#5EEAD6] hover:text-[#0B0B14]"
                            >
                              {sub.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              )
            }
            return (
              <li key={item.name} className="relative">
                {item.external ? (
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClassName}
                  >
                    {item.name}
                  </a>
                ) : (
                  <Link
                    href={item.path}
                    onClick={() => handleLinkClick(item.path)}
                    className={linkClassName}
                  >
                    {item.name}
                  </Link>
                )}
              </li>
            )
          })}
          <li>
            <Link
              href="/contact"
              onClick={() => handleLinkClick('/contact')}
              className="font-inter font-[500] text-[14px] xl:text-[15px] leading-[24px] text-white rounded-full px-[16px] py-[8px] transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(176, 101, 255, 0.18) 0%, rgba(94, 234, 212, 0.18) 100%)',
                border: '1px solid rgba(176, 101, 255, 0.45)',
              }}
            >
              Let&apos;s talk →
            </Link>
          </li>
        </ul>

        {/* Mobile toggle */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden text-white hover:text-[#B065FF] transition-colors duration-300"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
          onClick={toggleMobileMenu}
        >
          <div
            className="fixed top-[106px] left-1/2 transform -translate-x-1/2 w-[calc(100%-32px)] max-w-[500px] rounded-[24px] p-[24px] flex flex-col gap-[12px]"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              marginTop: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_ITEMS.map((item, index) => {
              const mobileClassName = "block font-inter font-[500] text-[18px] leading-[28px] text-white py-[12px] px-[16px] rounded-[12px] hover:bg-[#B065FF]/20 hover:text-[#B065FF] transition-all duration-300 text-center"
              const mobileStyle = { animation: `slideIn 0.3s ease-out ${index * 0.05}s both` }
              if (item.dropdown) {
                return (
                  <div key={item.name} style={mobileStyle} className="flex flex-col gap-[8px]">
                    <span className="flex items-center justify-center gap-[4px] font-inter font-[600] text-[16px] leading-[24px] text-white/60 pt-[8px] px-[16px]">
                      {item.name}
                      <ChevronDown size={16} />
                    </span>
                    {item.dropdown.map((sub) => (
                      <a
                        key={sub.name}
                        href={sub.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleMobileNavigation}
                        className={mobileClassName}
                      >
                        {sub.name}
                      </a>
                    ))}
                  </div>
                )
              }
              return item.external ? (
                <a
                  key={item.name}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleMobileNavigation}
                  className={mobileClassName}
                  style={mobileStyle}
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => {
                    handleLinkClick(item.path)
                    handleMobileNavigation()
                  }}
                  className={mobileClassName}
                  style={mobileStyle}
                >
                  {item.name}
                </Link>
              )
            })}
            <Link
              href="/contact"
              onClick={() => {
                handleLinkClick('/contact')
                handleMobileNavigation()
              }}
              className="block font-inter font-[600] text-[18px] leading-[28px] text-white py-[14px] px-[16px] rounded-[14px] text-center mt-2"
              style={{
                background:
                  'linear-gradient(135deg, rgba(176, 101, 255, 0.22) 0%, rgba(94, 234, 212, 0.22) 100%)',
                border: '1px solid rgba(176, 101, 255, 0.45)',
                animation: `slideIn 0.3s ease-out ${NAV_ITEMS.length * 0.05}s both`,
              }}
            >
              Let&apos;s talk →
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

export default Navbar
