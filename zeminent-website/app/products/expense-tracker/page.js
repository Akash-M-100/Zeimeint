'use client'

import { useEffect } from 'react'
import { useNavbar } from '@/context/NavbarContext'

export default function ExpenseTrackerPage() {
  const { hideNavbar, showNavbar } = useNavbar()

  useEffect(() => {
    const handleMessage = (event) => {
      // Accept messages from the expense tracker iframe
      if (event.origin !== 'https://expense-tracker-neon-six-36.vercel.app') {
        return
      }

      const { type } = event.data || {}

      if (type === 'POPUP_OPENED' || type === 'MODAL_OPENED') {
        hideNavbar()
      } else if (type === 'POPUP_CLOSED' || type === 'MODAL_CLOSED') {
        showNavbar()
      }
    }

    window.addEventListener('message', handleMessage)

    // Ensure navbar is visible when component mounts and when navigating away
    return () => {
      window.removeEventListener('message', handleMessage)
      showNavbar()
    }
  }, [hideNavbar, showNavbar])

  return (
    <div
      className="expense-tracker-container"
      style={{
        position: "relative",
        zIndex: 1
      }}
    >
      <iframe
        src="https://expense-tracker-neon-six-36.vercel.app"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
          display: "block"
        }}
        title="Expense Tracker Application"
      />
    </div>
  );
}
