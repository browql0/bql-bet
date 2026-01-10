import './LoadingState.css'

export default function LoadingState({ text = "Chargement..." }) {
    return (
        <div className="loading-state-container fade-in">
            <div className="premium-spinner">
                <div className="spinner-inner"></div>
                <div className="spinner-glow"></div>
            </div>
            {text && <p className="loading-state-text">{text}</p>}
        </div>
    )
}
