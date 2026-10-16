import React from "react";
import { LayoutGrid, CheckCircle2, Megaphone, Trophy } from "lucide-react";

export function StatsBar({ totalCards, activeCards, calledCount, winnerCount, onOpenWinners }) {
  const percentageCalled = Math.round((calledCount / 75) * 100);

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-info">
          <span className="stat-label">TOTAL CARTONES</span>
          <span className="stat-value">{totalCards}</span>
        </div>
        <div className="stat-icon-wrapper text-blue">
          <LayoutGrid size={22} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-info">
          <span className="stat-label">ACTIVOS EN JUEGO</span>
          <span className="stat-value">{activeCards}</span>
        </div>
        <div className="stat-icon-wrapper text-teal">
          <CheckCircle2 size={22} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-info">
          <span className="stat-label">LLAMADOS ({percentageCalled}%)</span>
          <span className="stat-value">{calledCount} <span className="stat-sub">/ 75</span></span>
        </div>
        <div className="stat-icon-wrapper text-amber">
          <Megaphone size={22} />
        </div>
      </div>

      <div
        className={`stat-card stat-winners ${winnerCount > 0 ? "has-winners" : ""}`}
        onClick={winnerCount > 0 ? onOpenWinners : undefined}
        style={{ cursor: winnerCount > 0 ? "pointer" : "default" }}
      >
        <div className="stat-info">
          <span className="stat-label">GANADORES</span>
          <span className="stat-value">{winnerCount}</span>
        </div>
        <div className="stat-icon-wrapper text-emerald">
          <Trophy size={22} />
        </div>
      </div>
    </div>
  );
}
