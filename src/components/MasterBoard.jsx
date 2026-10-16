import React from "react";
import { LETTERS, RANGES } from "../utils/bingoCore";

export function MasterBoard({ calledKeys, callsHistory, onCallNumber }) {
  // Manejo de clic en número del tablero
  const handleCellClick = (letter, number) => {
    const key = `${letter}${number}`;
    if (!calledKeys.has(key)) {
      onCallNumber(key);
    }
  };

  const recentCalls = callsHistory.slice(-10).reverse();

  return (
    <div className="master-board-panel">
      <div className="panel-header">
        <span className="panel-badge">TABLERO MAESTRO (1–75)</span>
        <span className="board-tip">Toca un número para cantarlo directamente</span>
      </div>

      <div className="board-grid-wrapper">
        <div className="board-grid">
          {LETTERS.map((letter) => {
            const [low, high] = RANGES[letter];
            const numbers = [];
            for (let i = low; i <= high; i++) numbers.push(i);

            return (
              <div key={letter} className="board-row">
                <div className={`board-letter-header letter-${letter.toLowerCase()}`}>
                  {letter}
                </div>
                <div className="board-cells-row">
                  {numbers.map((num) => {
                    const key = `${letter}${num}`;
                    const isCalled = calledKeys.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`board-cell ${isCalled ? "cell-called" : ""}`}
                        onClick={() => handleCellClick(letter, num)}
                        title={isCalled ? `${key} (Ya llamado)` : `Cantar ${key}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Historial de últimos llamados */}
      <div className="recent-calls-strip">
        <span className="recent-label">Últimas salidas:</span>
        <div className="recent-balls-list">
          {recentCalls.length > 0 ? (
            recentCalls.map((c, index) => (
              <span
                key={`${c.callKey}-${index}`}
                className={`recent-ball-pill ball-pill-${c.letter.toLowerCase()} ${index === 0 ? "recent-ball-latest" : ""}`}
              >
                {c.letter}{c.number}
              </span>
            ))
          ) : (
            <span className="recent-empty">Sin números llamados todavía.</span>
          )}
        </div>
      </div>
    </div>
  );
}
