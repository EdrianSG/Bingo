import asyncio
import sqlite3
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from bingo.core import generate_card, marks, parse_call, validate_card, winning_patterns
from bingo.database import Repository

SAMPLE = [[1,20,33,51,74], [3,18,43,56,68], [2,29,None,46,72],
          [9,25,32,53,66], [4,24,45,49,70]]


class RuleTests(unittest.TestCase):
    def test_generator_validates_500_cards(self):
        for _ in range(500):
            self.assertEqual(validate_card(generate_card())[2][2], None)

    def test_call_formats_and_ranges(self):
        for form in ("G53", "g 53", "G-53", "G:53"):
            self.assertEqual(parse_call(form), ("G",53))
        for form in ("53", "B53", "O76", "N0", "X5", "B1junk"):
            with self.assertRaises(ValueError):
                parse_call(form)

    def test_invalid_cards(self):
        for value in (20, "1", True):
            card = [r[:] for r in SAMPLE]
            card[0][0] = value
            with self.assertRaises(ValueError):
                validate_card(card)
        card = [r[:] for r in SAMPLE]
        card[1][0] = card[0][0]
        with self.assertRaises(ValueError):
            validate_card(card)

    def test_lines_and_free_center(self):
        patterns = [([(0,c) for c in range(5)], "Fila 1"),
                    ([(r,2) for r in range(5) if r != 2], "Columna N"),
                    ([(r,r) for r in range(5) if r != 2], "Diagonal principal"),
                    ([(r,4-r) for r in range(5) if r != 2], "Diagonal secundaria"),
                    ([(2,c) for c in range(5) if c != 2], "Fila 3")]
        for cells, name in patterns:
            calls = {("BINGO"[c], SAMPLE[r][c]) for r,c in cells}
            self.assertIn(name, winning_patterns(SAMPLE, calls))
            calls.pop()
            self.assertEqual(winning_patterns(SAMPLE, calls), [])

    def test_inactive_and_full_card(self):
        calls = {("BINGO"[c], SAMPLE[r][c]) for r in range(5) for c in range(5) if (r,c)!=(2,2)}
        self.assertEqual(winning_patterns(SAMPLE, calls, mode="lleno"), ["Cartón lleno"])
        self.assertEqual(winning_patterns(SAMPLE, calls, active=False), [])
        self.assertEqual(sum(sum(r) for r in marks(SAMPLE, calls, active=False)), 1)
        calls.pop()
        self.assertEqual(winning_patterns(SAMPLE, calls, mode="lleno"), [])

    def test_new_game_modes_l_o_counts(self):
        # L pattern (Col B + Row 5)
        calls_l = {("B", SAMPLE[r][0]) for r in range(5)} | {("BINGO"[c], SAMPLE[4][c]) for c in range(5)}
        self.assertEqual(winning_patterns(SAMPLE, calls_l, mode="l"), ["Figura en L (Col B + Fila 5)"])
        # Non-L numbers must NOT be marked in mode 'l'
        calls_all = {("BINGO"[c], SAMPLE[r][c]) for r in range(5) for c in range(5) if (r, c) != (2, 2)}
        marks_l = marks(SAMPLE, calls_all, mode="l")
        self.assertFalse(marks_l[1][1]) # inside cell must be False
        self.assertFalse(marks_l[2][2]) # center not in L, must be False
        # Inverted L (Col O + Row 5) must NOT win in mode 'l'
        calls_inv = {("O", SAMPLE[r][4]) for r in range(5)} | {("BINGO"[c], SAMPLE[4][c]) for c in range(5)}
        self.assertEqual(winning_patterns(SAMPLE, calls_inv, mode="l"), [])
        
        # O pattern (Outer ring)
        calls_o = {("BINGO"[c], SAMPLE[r][c]) for r in range(5) for c in range(5)
                   if (r in (0, 4) or c in (0, 4))}
        self.assertEqual(winning_patterns(SAMPLE, calls_o, mode="o"), ["Figura en O (Marco Exterior)"])
        
        # Primeros 5 y 10
        cells = [(r, c) for r in range(5) for c in range(5) if (r, c) != (2, 2)]
        calls_4 = {("BINGO"[c], SAMPLE[r][c]) for r, c in cells[:4]}
        calls_5 = {("BINGO"[c], SAMPLE[r][c]) for r, c in cells[:5]}
        calls_10 = {("BINGO"[c], SAMPLE[r][c]) for r, c in cells[:10]}
        
        self.assertEqual(winning_patterns(SAMPLE, calls_4, mode="primeros5"), [])
        self.assertTrue(any("Primeros 5 números" in p for p in winning_patterns(SAMPLE, calls_5, mode="primeros5")))
        self.assertEqual(winning_patterns(SAMPLE, calls_5, mode="primeros10"), [])
        self.assertTrue(any("Primeros 10 números" in p for p in winning_patterns(SAMPLE, calls_10, mode="primeros10")))


class RepositoryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name)/"bingo.db"
        self.repo = Repository(self.path)

    def tearDown(self):
        self.tmp.cleanup()

    def test_creation_edit_unique_and_sequence(self):
        self.repo.create_cards(3)
        cards = self.repo.cards()
        self.assertEqual([c["control"] for c in cards], ["C000001","C000002","C000003"])
        self.repo.edit(cards[0]["id"], "  personalizado  ", SAMPLE)
        with self.assertRaises(ValueError):
            self.repo.edit(cards[1]["id"], "PERSONALIZADO", SAMPLE)
        self.assertEqual(self.repo.cards()[1]["control"], "C000002")
        self.repo.delete(cards[-1]["id"])
        self.repo.create_cards(1)
        self.assertEqual(self.repo.cards()[-1]["control"], "C000004")

    def test_persistence_repeats_undo_and_reset(self):
        self.repo.create_cards(1)
        card = self.repo.cards()[0]
        self.repo.set_active(card["id"], False)
        self.assertTrue(self.repo.call("G53")[1])
        self.repo.call("B1")
        self.assertFalse(self.repo.call("G53")[1])
        self.repo.set_mode("lleno")
        reopened = Repository(self.path)
        self.assertFalse(reopened.cards()[0]["activo"])
        self.assertEqual(reopened.mode(), "lleno")
        self.assertEqual(reopened.calls(), [("G",53),("B",1)])
        self.assertEqual(reopened.undo_call(), ("B",1))
        reopened.reset()
        self.assertEqual(reopened.calls(), [])
        self.assertEqual(len(reopened.cards()), 1)

    def test_failed_edit_does_not_change_data(self):
        self.repo.create_cards(1)
        before = self.repo.cards()[0]
        invalid = [r[:] for r in SAMPLE]
        invalid[0][4] = 100
        with self.assertRaises(ValueError):
            self.repo.edit(before["id"], "CAMBIADO", invalid)
        self.assertEqual(self.repo.cards()[0], before)

    def test_old_database_migration(self):
        import json
        path = Path(self.tmp.name)/"old.db"
        with sqlite3.connect(path) as db:
            db.execute("CREATE TABLE cartones(id INTEGER PRIMARY KEY, numero_control TEXT UNIQUE, numeros TEXT)")
            old = [r[:] for r in SAMPLE]
            old[2][2] = "LIBRE"
            db.execute("INSERT INTO cartones VALUES (1,?,?)", ("C000010",json.dumps(old)))
        old_repo = Repository(path)
        self.assertEqual(old_repo.cards()[0]["numeros"][2][2], None)
        old_repo.create_cards(1)
        self.assertEqual(old_repo.cards()[-1]["control"], "C000011")

    def test_batch_validation(self):
        for count in (0,-1,10001,True,1.5):
            with self.assertRaises(ValueError):
                self.repo.create_cards(count)
        self.assertEqual(self.repo.cards(), [])


class FakePage:
    """Prueba los controles Flet reales, sin abrir una ventana del sistema."""
    def __init__(self):
        self.window = SimpleNamespace()
        self.controls = []
        self.dialogs = []

    def add(self, *controls):
        self.controls.extend(controls)

    def update(self):
        pass

    def show_dialog(self, dialog):
        self.dialogs.append(dialog)

    def pop_dialog(self):
        return self.dialogs.pop()


class InterfaceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Repository(Path(self.tmp.name)/"bingo.db")

    def tearDown(self):
        self.tmp.cleanup()

    def test_flet_controls_and_user_flow(self):
        from bingo.ui import BingoApp
        self.repo.create_cards(26)
        cards = self.repo.cards()
        self.repo.edit(cards[-1]["id"], "FUERA-DE-PAGINA", SAMPLE)
        self.repo.set_active(cards[0]["id"], False)
        page = FakePage()
        app = BingoApp(page, self.repo)
        self.assertEqual(len(app.gallery.controls), 24)
        # Usa el codificador real que envía los controles al cliente de Flet.
        import msgpack
        import flet as ft
        from flet.messaging.protocol import configure_encode_object_for_msgpack
        self.assertTrue(msgpack.packb(page.controls,
                                     default=configure_encode_object_for_msgpack(ft.BaseControl)))
        for call in ("B1","I20","N33","G51","O74"):
            app.input_call.value = call
            app.submit_call(None)
        self.assertIn(cards[-1]["id"], app.winners)
        self.assertNotIn(cards[0]["id"], app.winners)
        self.assertTrue(page.dialogs)
        page.dialogs.clear()
        app.search.value = "FUERA-DE"
        app.filter_changed(None)
        self.assertEqual(len(app.gallery.controls), 1)
        app.toggle(cards[-1]["id"], False)
        self.assertNotIn(cards[-1]["id"], app.winners)
        self.assertEqual(app.search.value, "FUERA-DE")
        app.toggle(cards[-1]["id"], True)
        self.assertIn(cards[-1]["id"], app.winners)
        app.mode_select.value = "lleno"
        app.change_mode(None)
        self.assertEqual(app.winners, {})
        app.edit(app.cards[-1])
        self.assertEqual(page.dialogs[-1].title.value, "Editar cartón")
        page.dialogs[-1].actions[-1].on_click(None)
        self.assertEqual(page.dialogs, [])
        app.quantity.value = "2"
        asyncio.run(app.create(None))
        self.assertEqual(len(self.repo.cards()), 28)
        self.assertFalse(app.create_button.disabled)
        app.reset(None)
        page.dialogs[-1].actions[-1].on_click(None)
        self.assertEqual(self.repo.calls(), [])
        self.assertEqual(len(self.repo.cards()), 28)


if __name__ == "__main__":
    unittest.main()
