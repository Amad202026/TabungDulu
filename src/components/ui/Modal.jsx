import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.82)',
          backdropFilter: 'blur(4px)',
        }}
      />
      {/* Card */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: wide ? '520px' : '448px',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.07)',
        background: '#1a1a1a',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: 600,
            color: '#ffffff',
            fontFamily: 'Sora, sans-serif',
          }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255,255,255,0.07)',
              color: '#999',
              fontSize: '20px',
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >×</button>
        </div>
        {/* Scrollable body */}
        <div style={{
          overflowY: 'auto',
          padding: '20px 24px 24px',
          flex: 1,
        }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
