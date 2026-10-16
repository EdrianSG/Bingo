import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, X, Sparkles } from "lucide-react";

export function WinnersModal({ isOpen, onClose, winners, cardsMap }) {
  useEffect(() => {
    if (isOpen && Object.keys(winners).length > 0) {
      // Lanzar confeti festivo
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#14b8a6"],
      });
    }
  }, [isOpen, winners]);

  if (!isOpen) return null;

  const winnerIds = Object.keys(winners);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-winners animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <Trophy className="trophy-icon text-emerald" size={28} />
            <h2 className="modal-title">¡BINGO! Ganadores Detectados</h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {winnerIds.length > 0 ? (
            <div className="winners-list">
              {winnerIds.map((id) => {
                const card = cardsMap[id];
                const patterns = winners[id] || [];
                return (
                  <div key={id} className="winner-item">
                    <div className="winner-item-header">
                      <div className="winner-badge">
                        <Sparkles size={14} />
                        <span>{card ? card.control : id}</span>
                      </div>
                      <span className="winner-count-tag">
                        {patterns.length} patrón{patterns.length > 1 ? "es" : ""}
                      </span>
                    </div>
                    <div className="winner-patterns-list">
                      {patterns.map((p, idx) => (
                        <span key={idx} className="winner-pattern-chip">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="winners-empty">
              <p>No hay ganadores en este momento.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary w-full" onClick={onClose}>
            Continuar Juego
          </button>
        </div>
      </div>
    </div>
  );
}
