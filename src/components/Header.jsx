import React, { useRef } from "react";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Download,
  Upload,
  Sun,
  Moon,
  Sparkles,
  Trophy
} from "lucide-react";
import { exportBackup, parseBackupFile } from "../utils/storage";
import { GAME_MODES } from "../utils/bingoCore";

export function Header({
  mode,
  setMode,
  soundEnabled,
  setSoundEnabled,
  theme,
  setTheme,
  onReset,
  state,
  onImportState,
  winnerCount,
  onOpenWinners
}) {
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = parseBackupFile(event.target?.result);
        onImportState(imported);
        alert("¡Datos restaurados con éxito!");
      } catch (err) {
        alert("Error al importar: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo-icon">
          <Sparkles size={24} className="logo-sparkle" />
          <span>75</span>
        </div>
        <div>
          <h1 className="header-title">Bingo Control</h1>
          <p className="header-subtitle">Gestor Web & Móvil · 75 Bolas</p>
        </div>
      </div>

      <div className="header-actions">
        {winnerCount > 0 && (
          <button
            className="btn-badge-winners animate-pulse"
            onClick={onOpenWinners}
            title="Ver cartones ganadores"
          >
            <Trophy size={16} />
            <span>{winnerCount} Ganador{winnerCount > 1 ? "es" : ""}</span>
          </button>
        )}

        {/* Modalidad de Juego */}
        <div className="mode-selector-wrapper" title={GAME_MODES[mode]?.desc || "Modalidad de juego"}>
          <div className="mode-selector-icon">
            <Trophy size={14} />
          </div>
          <select
            className="mode-dropdown-select"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            aria-label="Seleccionar modalidad de juego"
          >
            {Object.values(GAME_MODES).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de acción */}
        <div className="action-icons">
          <button
            className="icon-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Silenciar sonidos" : "Activar sonidos"}
            aria-label="Alternar sonido"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          <button
            className="icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Cambiar tema visual"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            className="icon-btn"
            onClick={() => exportBackup(state)}
            title="Exportar copia de seguridad (JSON)"
            aria-label="Descargar respaldo"
          >
            <Download size={18} />
          </button>

          <button
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Restaurar copia de seguridad"
            aria-label="Cargar respaldo"
          >
            <Upload size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          <button
            className="icon-btn btn-danger-soft"
            onClick={onReset}
            title="Nueva partida (reinicia números llamados)"
            aria-label="Nueva partida"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
