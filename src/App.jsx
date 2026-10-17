import React, { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "./components/Header";
import { StatsBar } from "./components/StatsBar";
import { CallerPanel } from "./components/CallerPanel";
import { MasterBoard } from "./components/MasterBoard";
import { CardsGallery } from "./components/CardsGallery";
import { WinnersModal } from "./components/WinnersModal";
import { EditCardModal } from "./components/EditCardModal";
import { QuickDialModal } from "./components/QuickDialModal";

import {
  parseCall,
  getWinningPatterns,
  generateCard,
  LETTERS,
  GAME_MODES
} from "./utils/bingoCore";
import { loadBingoState, saveBingoState } from "./utils/storage";
import { playCallSound, playBingoFanfare, playUndoSound } from "./utils/sound";

export default function App() {
  const [gameState, setGameState] = useState(loadBingoState);
  const [theme, setTheme] = useState(() => localStorage.getItem("bingo_theme") || "dark");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [feedback, setFeedback] = useState(null);

  // Modales
  const [isWinnersModalOpen, setIsWinnersModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [isQuickDialOpen, setIsQuickDialOpen] = useState(false);

  // Referencia para rastrear ganadores previos y detectar nuevos
  const prevWinnersCountRef = useRef(0);

  // Guardar en localStorage automáticamente
  useEffect(() => {
    saveBingoState(gameState);
  }, [gameState]);

  // Manejo de tema (dark / light)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bingo_theme", theme);
  }, [theme]);

  // Set reactivo de llamadas
  const calledKeys = useMemo(() => {
    return new Set(gameState.llamadas.map((c) => c.callKey));
  }, [gameState.llamadas]);

  // Mapeo id -> cartón
  const cardsMap = useMemo(() => {
    const map = {};
    for (const c of gameState.cartones) {
      map[c.id] = c;
    }
    return map;
  }, [gameState.cartones]);

  // Ganadores reactivos
  const winnersMap = useMemo(() => {
    const winners = {};
    for (const card of gameState.cartones) {
      if (!card.activo) continue;
      const patterns = getWinningPatterns(
        card.numbers,
        calledKeys,
        card.activo,
        gameState.modo
      );
      if (patterns.length > 0) {
        winners[card.id] = patterns;
      }
    }
    return winners;
  }, [gameState.cartones, calledKeys, gameState.modo]);

  const winnerCount = Object.keys(winnersMap).length;

  // Acciones de juego
  const handleCallNumber = (input) => {
    try {
      const parsed = parseCall(input);
      if (calledKeys.has(parsed.callKey)) {
        setFeedback({
          type: "warning",
          message: `${parsed.callKey} ya había sido llamado en esta partida.`
        });
        return;
      }

      // Cuántos cartones activos tienen este número
      const colIndex = LETTERS.indexOf(parsed.letter);
      let matchCount = 0;
      for (const card of gameState.cartones) {
        if (!card.activo) continue;
        for (let r = 0; r < 5; r++) {
          if (r === 2 && colIndex === 2) continue; // centro libre
          if (card.numbers[r][colIndex] === parsed.number) {
            matchCount++;
            break;
          }
        }
      }

      // Nuevo estado de llamadas
      const newCalls = [...gameState.llamadas, parsed];
      const newCalledKeys = new Set(newCalls.map((c) => c.callKey));

      // Calcular ganadores con la nueva bola
      const newWinners = {};
      let hasNewWinner = false;
      for (const card of gameState.cartones) {
        if (!card.activo) continue;
        const patterns = getWinningPatterns(
          card.numbers,
          newCalledKeys,
          card.activo,
          gameState.modo
        );
        if (patterns.length > 0) {
          newWinners[card.id] = patterns;
          if (!winnersMap[card.id]) {
            hasNewWinner = true;
          }
        }
      }

      setGameState((prev) => ({
        ...prev,
        llamadas: newCalls
      }));

      setFeedback({
        type: "success",
        message: `${parsed.callKey}: marcado en ${matchCount} cartón(es) activo(s).`
      });

      if (soundEnabled) {
        if (hasNewWinner) {
          playBingoFanfare();
        } else {
          playCallSound();
        }
      }

      // Si hay un nuevo ganador, abrir modal con confeti
      if (hasNewWinner) {
        setIsWinnersModalOpen(true);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.message
      });
    }
  };

  const handleUndo = () => {
    if (gameState.llamadas.length === 0) return;
    const last = gameState.llamadas[gameState.llamadas.length - 1];
    const confirmUndo = window.confirm(
      `¿Deseas retirar el último número llamado (${last.callKey})? Se recalcularán las marcas y los ganadores.`
    );
    if (!confirmUndo) return;

    setGameState((prev) => ({
      ...prev,
      llamadas: prev.llamadas.slice(0, -1)
    }));

    setFeedback({
      type: "info",
      message: `Se deshizo ${last.callKey}.`
    });

    if (soundEnabled) {
      playUndoSound();
    }
  };

  const handleResetGame = () => {
    const confirmReset = window.confirm(
      "¿Deseas iniciar una nueva partida? Se borrarán todos los números llamados, pero tus cartones se conservarán intactos."
    );
    if (!confirmReset) return;

    setGameState((prev) => ({
      ...prev,
      llamadas: []
    }));

    setFeedback({
      type: "info",
      message: "Nueva partida iniciada. Se conservaron todos los cartones."
    });
  };

  const handleSetMode = (newMode) => {
    setGameState((prev) => ({
      ...prev,
      modo: newMode
    }));
    const modeName = GAME_MODES[newMode]?.name || newMode;
    const modeDesc = GAME_MODES[newMode]?.desc || "";
    setFeedback({
      type: "info",
      message: `Modalidad cambiada a: ${modeName} (${modeDesc}). Ganadores recalculados.`
    });
  };

  const handleToggleActive = (cardId, active) => {
    setGameState((prev) => ({
      ...prev,
      cartones: prev.cartones.map((c) =>
        c.id === cardId ? { ...c, activo: active } : c
      )
    }));
  };

  const handleDeleteCard = (card) => {
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar el cartón ${card.control}? Esta acción no se puede deshacer.`
    );
    if (!confirmDelete) return;

    setGameState((prev) => ({
      ...prev,
      cartones: prev.cartones.filter((c) => c.id !== card.id)
    }));
  };

  const handleSaveEditedCard = (cardId, newControl, newNumbers) => {
    // Comprobar si otro cartón ya tiene este código de control
    const duplicate = gameState.cartones.some(
      (c) => c.id !== cardId && c.control.toUpperCase() === newControl.toUpperCase()
    );
    if (duplicate) {
      throw new Error(`Ya existe otro cartón con el control ${newControl}.`);
    }

    setGameState((prev) => ({
      ...prev,
      cartones: prev.cartones.map((c) =>
        c.id === cardId
          ? { ...c, control: newControl, numbers: newNumbers }
          : c
      )
    }));

    setFeedback({
      type: "success",
      message: `Cartón ${newControl} actualizado exitosamente.`
    });
  };

  const handleCreateBatch = (count) => {
    const existingControls = new Set(
      gameState.cartones.map((c) => c.control.toUpperCase())
    );
    let nextIndex = gameState.siguienteControl;
    const newCards = [];

    for (let i = 0; i < count; i++) {
      let code = `C${String(nextIndex).padStart(6, "0")}`;
      while (existingControls.has(code)) {
        nextIndex++;
        code = `C${String(nextIndex).padStart(6, "0")}`;
      }
      existingControls.add(code);
      newCards.push({
        id: `card_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        control: code,
        numbers: generateCard(),
        activo: true
      });
      nextIndex++;
    }

    setGameState((prev) => ({
      ...prev,
      cartones: [...prev.cartones, ...newCards],
      siguienteControl: nextIndex
    }));

    setFeedback({
      type: "success",
      message: `Se crearon ${count} nuevos cartones.`
    });
  };

  const handleImportState = (imported) => {
    setGameState(imported);
    setFeedback({
      type: "success",
      message: `Respaldo cargado: ${imported.cartones.length} cartones restaurados.`
    });
  };

  const lastCall = gameState.llamadas.length > 0
    ? gameState.llamadas[gameState.llamadas.length - 1]
    : null;

  const activeCardsCount = gameState.cartones.filter((c) => c.activo).length;

  return (
    <div className="app-container">
      {/* Cabecera */}
      <Header
        mode={gameState.modo}
        setMode={handleSetMode}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        theme={theme}
        setTheme={setTheme}
        onReset={handleResetGame}
        state={gameState}
        onImportState={handleImportState}
        winnerCount={winnerCount}
        onOpenWinners={() => setIsWinnersModalOpen(true)}
      />

      <main className="main-content">
        {/* Estadísticas en Vivo */}
        <StatsBar
          totalCards={gameState.cartones.length}
          activeCards={activeCardsCount}
          calledCount={calledKeys.size}
          winnerCount={winnerCount}
          onOpenWinners={() => setIsWinnersModalOpen(true)}
        />

        {/* Fila Superior: Control de Llamadas + Tablero Maestro */}
        <div className="game-top-row">
          <CallerPanel
            lastCall={lastCall}
            feedback={feedback}
            onCallNumber={handleCallNumber}
            onUndo={handleUndo}
            canUndo={gameState.llamadas.length > 0}
            calledKeys={calledKeys}
            onOpenQuickDial={() => setIsQuickDialOpen(true)}
          />

          <MasterBoard
            calledKeys={calledKeys}
            callsHistory={gameState.llamadas}
            onCallNumber={handleCallNumber}
          />
        </div>

        {/* Galería de Cartones */}
        <CardsGallery
          cartones={gameState.cartones}
          calledKeys={calledKeys}
          winnersMap={winnersMap}
          onToggleActive={handleToggleActive}
          onDeleteCard={handleDeleteCard}
          onEditCard={(card) => setEditingCard(card)}
          onCreateBatch={handleCreateBatch}
          mode={gameState.modo}
        />
      </main>

      {/* Pie de página */}
      <footer className="footer">
        <p>Bingo Control 75 · B (1–15) · I (16–30) · N (31–45) · G (46–60) · O (61–75)</p>
        <p className="footer-sub">Optimizado para Web, Móvil y Vercel · Persistencia en Caché de Navegador</p>
      </footer>

      {/* Modales */}
      <WinnersModal
        isOpen={isWinnersModalOpen}
        onClose={() => setIsWinnersModalOpen(false)}
        winners={winnersMap}
        cardsMap={cardsMap}
      />

      <EditCardModal
        isOpen={Boolean(editingCard)}
        onClose={() => setEditingCard(null)}
        card={editingCard}
        onSave={handleSaveEditedCard}
      />

      <QuickDialModal
        isOpen={isQuickDialOpen}
        onClose={() => setIsQuickDialOpen(false)}
        calledKeys={calledKeys}
        onCallNumber={handleCallNumber}
      />
    </div>
  );
}
