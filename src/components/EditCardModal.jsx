import React, { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { LETTERS, RANGES, validateCard, validateControl } from "../utils/bingoCore";

export function EditCardModal({ isOpen, onClose, card, onSave }) {
  const [controlCode, setControlCode] = useState("");
  const [grid, setGrid] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (card) {
      setControlCode(card.control || "");
      // Clona matriz
      const copy = (card.numbers || []).map((row) => [...row]);
      setGrid(copy);
      setErrorMessage("");
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleCellChange = (r, c, val) => {
    const copy = grid.map((row) => [...row]);
    copy[r][c] = val;
    setGrid(copy);
    setErrorMessage("");
  };

  const handleSave = (e) => {
    e.preventDefault();
    try {
      const validCode = validateControl(controlCode);
      const parsedGrid = grid.map((row, r) =>
        row.map((val, c) => {
          if (r === 2 && c === 2) return null;
          const num = parseInt(val, 10);
          if (isNaN(num)) {
            throw new Error(`Fila ${r + 1}, col ${LETTERS[c]}: ingresa un número válido.`);
          }
          return num;
        })
      );

      const validatedGrid = validateCard(parsedGrid);
      onSave(card.id, validCode, validatedGrid);
      onClose();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card modal-edit animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Editar Cartón</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Control Code */}
            <div className="form-field">
              <label className="field-label">Código de Control (máx. 24 car.)</label>
              <input
                type="text"
                className="input-text uppercase"
                value={controlCode}
                onChange={(e) => setControlCode(e.target.value.toUpperCase())}
                maxLength={24}
                required
              />
            </div>

            {/* Matrix 5x5 */}
            <div className="edit-matrix-section">
              <div className="edit-letters-header">
                {LETTERS.map((l) => (
                  <span key={l} className="edit-col-letter">
                    {l} ({RANGES[l][0]}–{RANGES[l][1]})
                  </span>
                ))}
              </div>

              <div className="edit-matrix-inputs">
                {grid.map((row, r) => (
                  <div key={`edit-row-${r}`} className="edit-inputs-row">
                    {row.map((val, c) => {
                      if (r === 2 && c === 2) {
                        return (
                          <div key={`edit-cell-${r}-${c}`} className="edit-cell-free">
                            LIBRE
                          </div>
                        );
                      }
                      return (
                        <input
                          key={`edit-cell-${r}-${c}`}
                          type="number"
                          className="edit-number-input"
                          value={val !== null && val !== undefined ? val : ""}
                          onChange={(e) => handleCellChange(r, c, e.target.value)}
                          min={RANGES[LETTERS[c]][0]}
                          max={RANGES[LETTERS[c]][1]}
                          required
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="modal-error-banner">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              <Save size={16} />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
