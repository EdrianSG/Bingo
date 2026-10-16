import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X
} from "lucide-react";
import { LETTERS, calculateMarks } from "../utils/bingoCore";

const PAGE_SIZE = 24;

export function CardsGallery({
  cartones,
  calledKeys,
  winnersMap,
  onToggleActive,
  onDeleteCard,
  onEditCard,
  onCreateBatch,
  mode
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos"); // todos | activos | inactivos | ganadores
  const [currentPage, setCurrentPage] = useState(1);
  const [batchCount, setBatchCount] = useState(10);
  const [isCreating, setIsCreating] = useState(false);

  // Filtrado reactivo de cartones
  const filteredCards = useMemo(() => {
    const term = searchTerm.trim().toUpperCase();
    return cartones.filter((c) => {
      const matchSearch = !term || c.control.toUpperCase().includes(term);
      if (!matchSearch) return false;

      if (statusFilter === "activos") return c.activo;
      if (statusFilter === "inactivos") return !c.activo;
      if (statusFilter === "ganadores") return Boolean(winnersMap[c.id]);
      return true;
    });
  }, [cartones, searchTerm, statusFilter, winnersMap]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCards = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredCards.slice(start, start + PAGE_SIZE);
  }, [filteredCards, validPage]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const count = parseInt(batchCount, 10);
    if (isNaN(count) || count < 1 || count > 500) {
      alert("Por favor ingresa una cantidad entre 1 y 500 cartones por lote.");
      return;
    }
    setIsCreating(true);
    // Timeout para permitir que el navegador dibuje el estado de carga
    setTimeout(() => {
      onCreateBatch(count);
      setIsCreating(false);
    }, 50);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("todos");
    setCurrentPage(1);
  };

  return (
    <div className="cards-gallery-section">
      {/* Barra de Filtros y Creación */}
      <div className="gallery-toolbar">
        <div className="toolbar-left">
          {/* Buscador */}
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Buscar por control..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="gallery-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por estado */}
          <div className="filter-select-wrapper">
            <SlidersHorizontal size={16} className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="gallery-filter-select"
            >
              <option value="todos">Todos ({cartones.length})</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
              <option value="ganadores">Ganadores ({Object.keys(winnersMap).length})</option>
            </select>
          </div>

          {(searchTerm || statusFilter !== "todos") && (
            <button
              type="button"
              className="btn-text-sm"
              onClick={handleClearFilters}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Creador de lotes */}
        <form onSubmit={handleCreate} className="batch-create-form">
          <input
            type="number"
            min="1"
            max="500"
            value={batchCount}
            onChange={(e) => setBatchCount(e.target.value)}
            className="input-batch-count"
            title="Cantidad de cartones a generar"
          />
          <button
            type="submit"
            className="btn-create-batch"
            disabled={isCreating}
          >
            <Plus size={16} />
            <span>{isCreating ? "Creando..." : "Crear Cartones"}</span>
          </button>
        </form>
      </div>

      {/* Grid de cartones */}
      {paginatedCards.length > 0 ? (
        <div className="cards-grid">
          {paginatedCards.map((card) => {
            const isWinner = Boolean(winnersMap[card.id]);
            const winPatterns = winnersMap[card.id] || [];
            const marksBoard = calculateMarks(card.numbers, calledKeys, card.activo);

            // Contar marcados (excluyendo el centro libre)
            let markedCount = 0;
            for (let r = 0; r < 5; r++) {
              for (let c = 0; c < 5; c++) {
                if (r === 2 && c === 2) continue;
                if (marksBoard[r][c]) markedCount++;
              }
            }

            return (
              <div
                key={card.id}
                className={`bingo-card ${isWinner ? "card-winner" : ""} ${!card.activo ? "card-inactive" : ""}`}
              >
                {/* Cabecera del Cartón */}
                <div className="card-header">
                  <span className="card-control-code" title={card.control}>
                    {card.control}
                  </span>
                  <div className="card-badge-container">
                    {isWinner ? (
                      <span className="badge-winner animate-pulse">¡BINGO!</span>
                    ) : card.activo ? (
                      <span className="badge-active">ACTIVO</span>
                    ) : (
                      <span className="badge-inactive">INACTIVO</span>
                    )}
                  </div>
                </div>

                {/* Letras de encabezado B I N G O */}
                <div className="card-letters-row">
                  {LETTERS.map((l) => (
                    <div key={l} className={`card-letter-col col-${l.toLowerCase()}`}>
                      {l}
                    </div>
                  ))}
                </div>

                {/* Celdas 5x5 */}
                <div className="card-matrix">
                  {card.numbers.map((row, r) => (
                    <div key={`row-${r}`} className="matrix-row">
                      {row.map((val, c) => {
                        const isCenter = r === 2 && c === 2;
                        const isMarked = marksBoard[r][c];

                        if (isCenter) {
                          return (
                            <div
                              key={`cell-${r}-${c}`}
                              className="matrix-cell cell-center"
                              title={`Casilla Libre · Control: ${card.control}`}
                            >
                              <span className="center-label">LIBRE</span>
                              <span className="center-control">{card.control}</span>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`cell-${r}-${c}`}
                            className={`matrix-cell ${isMarked ? "cell-marked" : ""}`}
                            title={`${LETTERS[c]}${val} ${isMarked ? "(Marcado)" : ""}`}
                          >
                            {val}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Resumen de aciertos y patrones */}
                <div className="card-footer-info">
                  <span className="marked-counter">
                    {markedCount} / 24 marcados
                  </span>
                  {isWinner && (
                    <span className="winning-pattern-tag" title={winPatterns.join(", ")}>
                      {winPatterns[0]}{winPatterns.length > 1 ? ` (+${winPatterns.length - 1})` : ""}
                    </span>
                  )}
                </div>

                {/* Acciones del Cartón */}
                <div className="card-actions-bar">
                  <label className="toggle-switch-wrapper" title="Activar/Desactivar cartón">
                    <input
                      type="checkbox"
                      checked={card.activo}
                      onChange={(e) => onToggleActive(card.id, e.target.checked)}
                    />
                    <span className="slider-round"></span>
                    <span className="toggle-label">{card.activo ? "Activo" : "Pausado"}</span>
                  </label>

                  <div className="card-btn-group">
                    <button
                      type="button"
                      className="card-action-btn"
                      onClick={() => onEditCard(card)}
                      title="Editar cartón"
                      aria-label="Editar"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="card-action-btn btn-delete"
                      onClick={() => onDeleteCard(card)}
                      title="Eliminar cartón"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-cards-state">
          <p className="empty-title">No se encontraron cartones</p>
          <p className="empty-subtitle">
            Crea un nuevo lote de cartones o restablece los filtros de búsqueda.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClearFilters}
          >
            Ver todos los cartones
          </button>
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            type="button"
            className="pagination-btn"
            disabled={validPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            title="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="pagination-text">
            Página {validPage} de {totalPages} · {filteredCards.length} cartones
          </span>

          <button
            type="button"
            className="pagination-btn"
            disabled={validPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            title="Página siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
