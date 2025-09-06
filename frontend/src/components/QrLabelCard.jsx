import React from 'react'
import QRCode from 'react-qr-code'
import AutoFitText from './AutoFitText.jsx'

export default function QrLabelCard({ idCode, name, rack }) {
  // Label compact 2cm x 1cm (diatur via CSS)
  return (
    <div className="label">
      <div className="qr">
        <QRCode value={idCode} style={{ width: '9mm', height: '9mm' }} />
      </div>
      <div className="meta">
        <AutoFitText className="id" text={idCode} maxMm={2.0} minMm={0.4} stepMm={0.1} />
        <div className="name" title={name}>{name}</div>
        {rack ? <div className="rack">Rack: {rack}</div> : null}
      </div>
    </div>
  )
}
