import React from 'react'
import './DownloadModal.css'

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const DownloadModal = ({ isOpen, onClose, songName, artistName, fileSize, onDownload }) => {
  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal">
        <button
          type="button"
          className="modal__close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <CloseIcon />
        </button>
        <div className="modal__content">
<br/>
<br/>       
          <div className="modal__info">
            <div className="modal__info-row">
              <span className="modal__label">Song Name:</span>
              <span className="modal__value">{songName}</span>
            </div>
            <div className="modal__info-row">
              <span className="modal__label">Artist Name:</span>
              <span className="modal__value">{artistName}</span>
            </div>
            <div className="modal__info-row">
              <span className="modal__label">Size:</span>
              <span className="modal__value">{fileSize}</span>
            </div>
          </div>

          <div className="modal__actions">
            <button style={{width: '100%'}}
              type="button"
              className="modal__btn modal__btn--download"
              onClick={onDownload}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default DownloadModal
