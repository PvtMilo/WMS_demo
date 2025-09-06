import React, { useLayoutEffect, useRef } from 'react'

export default function AutoFitText({ text, className, maxMm = 2.2, minMm = 0.6, stepMm = 0.1, style }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    // Reset to max size and no transform for fresh measurement
    el.style.fontSize = `${maxMm}mm`
    el.style.transform = 'none'
    el.style.whiteSpace = 'nowrap'

    const containerWidth = () => (el.parentElement ? el.parentElement.clientWidth : el.clientWidth)
    const fits = () => el.scrollWidth <= containerWidth() + 0.5 // small tolerance

    let size = maxMm
    while (!fits() && size > minMm) {
      size = Math.max(minMm, size - stepMm)
      el.style.fontSize = `${size}mm`
    }

    // If still overflows at min size, squeeze horizontally as a fallback
    if (!fits()) {
      const ratio = el.clientWidth / Math.max(1, el.scrollWidth)
      if (ratio < 1) {
        el.style.transformOrigin = 'left center'
        el.style.transform = `scaleX(${ratio})`
      }
    }
  }, [text, maxMm, minMm, stepMm])

  const mergedStyle = { width: '100%', ...style }
  return <div ref={ref} className={className} style={mergedStyle}>{text}</div>
}
