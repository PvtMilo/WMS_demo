export function formatDateTime(dateStr, { monthText = false, tzLabel = 'WIB' } = {}) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(d)
  const month = new Intl.DateTimeFormat('id-ID', { month: monthText ? 'long' : '2-digit' }).format(d)
  const year = new Intl.DateTimeFormat('id-ID', { year: '2-digit' }).format(d)
  const datePart = `${day}/${month}/${year}`
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace('.', ':')
  return `${datePart} ${timePart}${tzLabel ? ' ' + tzLabel : ''}`
}

export function formatDate(dateStr, opts = {}) {
  const { monthText = false } = opts
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(d)
  const month = new Intl.DateTimeFormat('id-ID', { month: monthText ? 'long' : '2-digit' }).format(d)
  const year = new Intl.DateTimeFormat('id-ID', { year: '2-digit' }).format(d)
  return `${day}/${month}/${year}`
}

export function formatTime(dateStr, { tzLabel = 'WIB' } = {}) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d).replace('.', ':')
  return tzLabel ? `${timePart} ${tzLabel}` : timePart
}
