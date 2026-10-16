import React, { useState } from "react";
import { X, Check } from "lucide-react";
import { LETTERS, RANGES } from "../utils/bingoCore";

export function QuickDialModal({ isOpen, onClose, calledKeys, onCallNumber }) {
  const [activeLetter, setActiveLetter] = useState("B");

  if (!isOpen) return null;

  const [low, high] = RANGES[activeLetter];
  const numbers = [];
  for (let i = low; i <= high; i++) numbers.push(i);

  const handlePick = (num) => {
    const key = `${activeLetter}${num}`;
    if (!calledKeys.has(key)) {
      onCallNumber(key);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-quick-dial animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Selector Táctil Rápido</h2>
            <p className="modal-subtitle">Ideal para cantar números en móvil</p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar selector"
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Tabs B - I - N - G - O */}
          <div className="quick-letter-tabs">
            {LETTERS.map((letter) => (
              <button
                key={letter}
                type="button"
                className={`quick-tab-btn tab-${letter.toLowerCase()} ${activeLetter === letter ? "active" : ""}`}
                onClick={() => setActiveLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </div>

          {/* Rango indicador */}
          <div className="quick-range-hint">
            Columna <strong>{activeLetter}</strong>: números del {low} al {high}
          </div>

          {/* Grid de 15 números grandes táctiles */}
          <div className="quick-numbers-grid">
            {numbers.map((num) => {
              const key = `${activeLetter}${num}`;
              const isCalled = calledKeys.has(key);

              return (
                <button
                  key={key}
                  type="button"
                  className={`quick-num-btn ${isCalled ? "called" : ""}`}
                  onClick={() => handlePick(num)}
                  disabled={isCalled}
                >
                  <span className="quick-num-text">{num}</span>
                  {isCalled && <Check size={14} className="quick-check-icon" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary w-full" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
