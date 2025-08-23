import React from 'react'
import QRCode from 'react-qr-code'

export default function QrLabelCard({ idCode, name, rack }) {
  // Ukuran label kira-kira 70x35 mm (disesuaikan grid)
  return (
    <div className="label">
      <div className="qr">
        <QRCode value={idCode} size={96} />
      </div>
      <div className="meta">
        <div className="id">{idCode}</div>
        <div className="name" title={name}>{name}</div>
        {rack ? <div className="rack">Rack: {rack}</div> : null}
      </div>
    </div>
  )
}