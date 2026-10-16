"""Ejecutar: python main.py (aplicación de escritorio)."""
import argparse
from pathlib import Path

import flet as ft

from bingo.database import Repository
from bingo.ui import BingoApp

BASE = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description="Bingo moderno de escritorio")
    parser.add_argument("--db", type=Path, help="Ruta opcional de la base SQLite")
    args = parser.parse_args()
    # Si copias la base antigua junto a main.py, se conserva su ubicación.
    path = args.db or (BASE / "bingo.db" if (BASE / "bingo.db").exists() else BASE / "data" / "bingo.db")
    repo = Repository(path)
    ft.run(lambda page: BingoApp(page, repo))


if __name__ == "__main__":
    main()
