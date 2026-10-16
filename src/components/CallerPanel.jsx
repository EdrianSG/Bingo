import React, { useState } from "react";
import { Check, Undo2, Dices, Smartphone } from "lucide-react";
import { getLetterForNumber, LETTERS, RANGES } from "../utils/bingoCore";

export function CallerPanel({
  lastCall,
  feedback,
  onCallNumber,
  onUndo,
  canUndo,
  calledKeys,
  onOpenQuickDial
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onCallNumber(inputValue);
    setInputValue("");
  };

  // Extraer bola aleatoria de las que aún no han salido
  const handleRandomBall = () => {
    const uncalled = [];
    for (const letter of LETTERS) {
      const [low, high] = RANGES[letter];
      for (let n = low; n <= high; n++) {
        const key = `${letter}${n}`;
        if (!calledKeys.has(key)) {
          uncalled.push(key);
        }
      }
    }
    if (uncalled.length === 0) {
      alert("¡Ya han salido todas las 75 bolas!");
      return;
    }
    const picked = uncalled[Math.floor(Math.random() * uncalled.length)];
    onCallNumber(picked);
  };

  // Color de la bola según la letra
  const getBallLetterClass = (letter) => {
    switch (letter) {
      case "B": return "ball-b";
      case "I": return "ball-i";
      case "N": return "ball-n";
      case "G": return "ball-g";
      case "O": return "ball-o";
      default: return "";
    }
  };

  return (
    <div className="caller-panel">
      <div className="panel-header">
        <span className="panel-badge">CONTROL DE JUEGO</span>
        <button
          type="button"
          className="btn-quick-mobile"
          onClick={onOpenQuickDial}
          title="Abrir teclado táctil móvil"
        >
          <Smartphone size={16} />
          <span>Selector Táctil</span>
        </button>
      </div>

      <div className="caller-display-row">
        {/* Bola grande animada */}
        <div className="ball-container">
          {lastCall ? (
            <div className={`bingo-ball-large ${getBallLetterClass(lastCall.letter)}`}>
              <span className="ball-letter">{lastCall.letter}</span>
              <span className="ball-number">{lastCall.number}</span>
            </div>
          ) : (
            <div className="bingo-ball-empty">
              <span>—</span>
            </div>
          )}
          <span className="ball-caption">Última Bola Cantada</span>
        </div>

        {/* Formulario de entrada */}
        <div className="caller-form-col">
          <form onSubmit={handleSubmit} className="call-form">
            <div className="input-group">
              <input
                type="text"
                className="input-call"
                placeholder="G53 o 53"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={8}
                autoComplete="off"
                autoCapitalize="characters"
              />
              <button type="submit" className="btn-call-submit">
                <Check size={18} />
                <span>Marcar</span>
              </button>
            </div>
          </form>

          {/* Feedback */}
          {feedback && (
            <div className={`call-feedback ${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          {/* Botones de acción rápida */}
          <div className="caller-actions-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={onUndo}
              disabled={!canUndo}
              title="Deshacer el último número llamado"
            >
              <Undo2 size={16} />
              <span>Deshacer</span>
            </button>

            <button
              type="button"
              className="btn-accent"
              onClick={handleRandomBall}
              title="Sacar una bola al azar del bombo digital"
            >
              <Dices size={16} />
              <span>Sortear Bola</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
