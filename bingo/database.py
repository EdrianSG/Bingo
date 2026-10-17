"""SQLite: operaciones atómicas, controles únicos y partida persistente."""
import json
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .core import generate_card, validate_card, validate_control, parse_call


class Repository:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS cartones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                control TEXT NOT NULL UNIQUE COLLATE NOCASE,
                numeros TEXT NOT NULL,
                activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0,1)))""")
            # Compatibilidad con las dos versiones anteriores del programa.
            columns = {r[1] for r in db.execute("PRAGMA table_info(cartones)")}
            if "control" not in columns and "numero_control" in columns:
                db.execute("ALTER TABLE cartones RENAME COLUMN numero_control TO control")
            if "activo" not in columns:
                db.execute("ALTER TABLE cartones ADD COLUMN activo INTEGER NOT NULL DEFAULT 1")
            db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_control_nocase ON cartones(control COLLATE NOCASE)")
            db.execute("""CREATE TABLE IF NOT EXISTS numeros_llamados (
                letra TEXT NOT NULL, numero INTEGER NOT NULL,
                PRIMARY KEY(letra, numero))""")
            db.execute("CREATE TABLE IF NOT EXISTS ajustes (clave TEXT PRIMARY KEY, valor TEXT NOT NULL)")
            db.execute("INSERT OR IGNORE INTO ajustes VALUES ('modo', 'linea')")
            db.execute("INSERT OR IGNORE INTO ajustes VALUES ('siguiente_control', '1')")

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def cards(self):
        with self.connect() as db:
            rows = db.execute("SELECT * FROM cartones ORDER BY id").fetchall()
        result = []
        for row in rows:
            data = dict(row)
            data["numeros"] = validate_card(json.loads(data["numeros"]))
            data["activo"] = bool(data["activo"])
            result.append(data)
        return result

    def calls(self):
        with self.connect() as db:
            return [tuple(row) for row in db.execute(
                "SELECT letra, numero FROM numeros_llamados ORDER BY rowid")]

    def mode(self):
        with self.connect() as db:
            return db.execute("SELECT valor FROM ajustes WHERE clave='modo'").fetchone()[0]

    def set_mode(self, mode):
        if mode not in ("linea", "lleno", "l", "o", "primeros5", "primeros10"):
            raise ValueError("Modalidad inválida.")
        with self.connect() as db:
            db.execute("UPDATE ajustes SET valor=? WHERE clave='modo'", (mode,))

    def create_cards(self, count):
        if type(count) is not int or not 1 <= count <= 10000:
            raise ValueError("Ingresa una cantidad de 1 a 10000 por lote. Puedes crear más lotes.")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            controls = {r[0].upper() for r in db.execute("SELECT control FROM cartones")}
            highest = max((int(m[1]) for c in controls if (m := re.fullmatch(r"C(\d+)", c))), default=0)
            stored = int(db.execute("SELECT valor FROM ajustes WHERE clave='siguiente_control'").fetchone()[0])
            next_number = max(stored, highest + 1)
            records = []
            for _ in range(count):
                control = f"C{next_number:06d}"
                while control in controls:
                    next_number += 1
                    control = f"C{next_number:06d}"
                records.append((control, json.dumps(generate_card())))
                controls.add(control)
                next_number += 1
            db.executemany("INSERT INTO cartones(control,numeros,activo) VALUES (?,?,1)", records)
            db.execute("UPDATE ajustes SET valor=? WHERE clave='siguiente_control'", (str(next_number),))

    def edit(self, card_id, control, numbers):
        control = validate_control(control)
        numbers = validate_card(numbers)
        try:
            with self.connect() as db:
                cur = db.execute("UPDATE cartones SET control=?, numeros=? WHERE id=?",
                                 (control, json.dumps(numbers), card_id))
                if cur.rowcount != 1:
                    raise ValueError("El cartón ya no existe.")
        except sqlite3.IntegrityError as exc:
            raise ValueError("Ya existe otro cartón con ese número de control.") from exc

    def set_active(self, card_id, active):
        with self.connect() as db:
            db.execute("UPDATE cartones SET activo=? WHERE id=?", (int(bool(active)), card_id))

    def delete(self, card_id):
        with self.connect() as db:
            db.execute("DELETE FROM cartones WHERE id=?", (card_id,))

    def call(self, text):
        letter, number = parse_call(text)
        with self.connect() as db:
            cur = db.execute("INSERT OR IGNORE INTO numeros_llamados VALUES (?,?)", (letter, number))
            return (letter, number), cur.rowcount == 1

    def undo_call(self):
        with self.connect() as db:
            last = db.execute("SELECT rowid, letra, numero FROM numeros_llamados ORDER BY rowid DESC LIMIT 1").fetchone()
            if last is None:
                return None
            db.execute("DELETE FROM numeros_llamados WHERE rowid=?", (last[0],))
            return last[1], last[2]

    def reset(self):
        with self.connect() as db:
            db.execute("DELETE FROM numeros_llamados")
