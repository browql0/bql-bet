import React from 'react'
import './LoadingScreen.css'

export default function LoadingScreen({ text = "Chargement..." }) {
    return (
        <div className="loading-screen">
            <div className="loading-content">
                <div className="loading-spinner"></div>
                <div className="loading-text">{text}</div>
            </div>
        </div>
    )
}
