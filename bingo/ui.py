"""Interfaz Material de Flet 1.0.3."""
import asyncio
import json
import math
import sqlite3

import flet as ft

from .core import LETTERS, RANGES, marks, winning_patterns

NAVY = "#132A3A"
TEAL = "#007F78"
MUTED = "#637684"
LINE = "#DFE7EC"
GREEN = "#00866B"
PAGE_SIZE = 24


def text(value, size=14, color=NAVY, bold=False, **kwargs):
    return ft.Text(value, size=size, color=color,
                   weight=ft.FontWeight.BOLD if bold else ft.FontWeight.NORMAL, **kwargs)


def panel(content, **kwargs):
    options = dict(padding=20, bgcolor="#FFFFFF", border=ft.Border.all(1, LINE), border_radius=16)
    options.update(kwargs)
    return ft.Container(content=content, **options)


class BingoApp:
    def __init__(self, page, repo):
        self.page, self.repo = page, repo
        self.index = 0
        self.cards = []
        self.called = set()
        self.winners = {}
        self.mode = repo.mode()
        self.build()
        self.refresh()

    def build(self):
        p = self.page
        p.title = "Bingo Control · Escritorio"
        p.theme_mode = ft.ThemeMode.LIGHT
        p.theme = ft.Theme(color_scheme_seed=TEAL, font_family="Segoe UI")
        p.bgcolor = "#F3F6F8"
        p.padding = 24
        p.window.width, p.window.height = 1400, 940
        p.window.min_width, p.window.min_height = 760, 640

        self.stats = ft.ResponsiveRow(spacing=12)
        self.input_call = ft.TextField(label="Letra y número", hint_text="Ejemplo: G53",
                                      text_size=22, max_length=10, on_submit=self.submit_call,
                                      border_radius=12, expand=True)
        self.last_call = text("—", 50, TEAL, True)
        self.feedback = text("Crea tus cartones e ingresa el primer número.", color=MUTED)
        self.board = ft.Column(spacing=6)
        self.history = text("Sin números llamados.", color=MUTED)
        self.mode_select = ft.Dropdown(label="Modalidad", value=self.mode, width=230,
                                      options=[ft.DropdownOption("linea", "Una línea"),
                                               ft.DropdownOption("lleno", "Cartón lleno"),
                                               ft.DropdownOption("l", "En L"),
                                               ft.DropdownOption("o", "En O (Lados)"),
                                               ft.DropdownOption("primeros5", "Primeros 5 números"),
                                               ft.DropdownOption("primeros10", "Primeros 10 números")],
                                      on_select=self.change_mode, border_radius=12)
        game = panel(ft.Column([
            text("CONTROL DEL JUEGO", 12, MUTED, True),
            ft.Row([ft.Column([text("Último número", color=MUTED), self.last_call], spacing=0),
                    self.mode_select], alignment=ft.MainAxisAlignment.SPACE_BETWEEN, wrap=True),
            ft.Row([self.input_call, ft.FilledButton("Marcar", icon=ft.Icons.CHECK,
                                                   height=56, on_click=self.submit_call)]),
            self.feedback,
            ft.Row([ft.TextButton("Deshacer último", icon=ft.Icons.UNDO, on_click=self.undo),
                    ft.TextButton("Nueva partida", icon=ft.Icons.RESTART_ALT, on_click=self.reset)], wrap=True),
            text("El centro CONTROL cuenta como casilla libre.", 12, MUTED),
        ], spacing=14), col={"xs":12, "lg":5, "xl":4})
        called = panel(ft.Column([
            ft.Row([text("TABLERO DE NÚMEROS", 12, MUTED, True),
                    text("Verde = llamado", 12, GREEN)], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
            self.board,
            ft.Divider(color=LINE),
            text("Últimos 12, en orden de salida", 12, MUTED), self.history,
        ], spacing=10), col={"xs":12, "lg":7, "xl":8})

        self.quantity = ft.TextField(label="Cantidad", value="10", width=125,
                                     keyboard_type=ft.KeyboardType.NUMBER, border_radius=12)
        self.create_button = ft.FilledButton("Crear cartones", icon=ft.Icons.ADD, on_click=self.create)
        self.search = ft.TextField(label="Buscar control", prefix_icon=ft.Icons.SEARCH,
                                   width=245, on_change=self.filter_changed, border_radius=12)
        self.state_filter = ft.Dropdown(value="todos", label="Mostrar", width=165,
                                       options=[ft.DropdownOption("todos", "Todos"),
                                                ft.DropdownOption("activos", "Activos"),
                                                ft.DropdownOption("inactivos", "Inactivos"),
                                                ft.DropdownOption("ganadores", "Ganadores")],
                                       on_select=self.filter_changed, border_radius=12)
        self.winner_text = text("Sin ganadores todavía.", color=GREEN)
        self.winner_bar = panel(ft.Row([
            ft.Icon(ft.Icons.EMOJI_EVENTS_OUTLINED, color=GREEN), self.winner_text,
            ft.TextButton("Ver ganadores", on_click=self.show_winners)
        ], wrap=True), padding=14)
        self.gallery = ft.ResponsiveRow(spacing=16, run_spacing=16)
        self.page_label = text("")
        self.previous = ft.IconButton(ft.Icons.CHEVRON_LEFT, tooltip="Página anterior",
                                      on_click=lambda e: self.move_page(-1))
        self.next = ft.IconButton(ft.Icons.CHEVRON_RIGHT, tooltip="Página siguiente",
                                  on_click=lambda e: self.move_page(1))
        self.pagination = ft.Row([self.previous, self.page_label, self.next],
                                 alignment=ft.MainAxisAlignment.CENTER)
        header = ft.Row([
            ft.Container(ft.Icon(ft.Icons.GRID_VIEW_ROUNDED, color="#FFFFFF", size=28),
                         bgcolor=TEAL, padding=12, border_radius=14),
            ft.Column([text("Bingo Control", 28, bold=True),
                       text("Tus cartones. Una partida. Todo a la vista.", color=MUTED)], spacing=2),
        ], spacing=14)
        self.page.add(ft.ListView([
            header, self.stats, ft.ResponsiveRow([game, called], spacing=16, run_spacing=16),
            ft.Row([text("Cartones", 23, bold=True), text("Guardado automático", 12, TEAL)],
                   alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
            ft.Row([self.quantity, self.create_button, self.search, self.state_filter,
                    ft.TextButton("Limpiar búsqueda", on_click=self.clear_filter)], wrap=True, spacing=12),
            self.winner_bar, self.gallery, self.pagination,
            text("B 1–15  ·  I 16–30  ·  N 31–45  ·  G 46–60  ·  O 61–75", 12, MUTED),
        ], expand=True, spacing=20, padding=ft.Padding.only(bottom=20)))

    def error(self, message):
        self.feedback.value = str(message)
        self.feedback.color = "#B42318"
        self.page.update()

    def safely(self, action):
        try:
            return action()
        except (ValueError, sqlite3.Error, OSError, json.JSONDecodeError) as exc:
            self.error(exc)
            return None

    def refresh(self):
        self.cards = self.repo.cards()
        self.calls_order = self.repo.calls()
        self.called = set(self.calls_order)
        self.mode = self.repo.mode()
        self.winners = {c["id"]: patterns for c in self.cards
                        if (patterns := winning_patterns(c["numeros"], self.called, c["activo"], self.mode))}
        totals = [("CARTONES", len(self.cards), ft.Icons.GRID_VIEW),
                  ("ACTIVOS", sum(c["activo"] for c in self.cards), ft.Icons.CHECK_CIRCLE_OUTLINE),
                  ("NÚMEROS LLAMADOS", len(self.called), ft.Icons.CAMPAIGN_OUTLINED),
                  ("GANADORES", len(self.winners), ft.Icons.EMOJI_EVENTS_OUTLINED)]
        self.stats.controls = [panel(ft.Row([
            ft.Column([text(label, 11, MUTED, True), text(str(value), 28, bold=True)], spacing=2),
            ft.Icon(icon, color=TEAL, size=27)
        ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN), col={"xs":6, "lg":3})
            for label, value, icon in totals]
        self.last_call.value = "".join(map(str, self.calls_order[-1])) if self.calls_order else "—"
        self.history.value = "  ·  ".join(f"{l}{n}" for l,n in self.calls_order[-12:]) or "Sin números llamados."
        self.board.controls = []
        for letter in LETTERS:
            low, high = RANGES[letter]
            cells = [ft.Container(text(letter, 16, TEAL, True), width=30, height=28,
                                  alignment=ft.Alignment.CENTER)]
            for number in range(low, high + 1):
                is_called = (letter, number) in self.called
                cells.append(ft.Container(text(str(number), 12, "#FFFFFF" if is_called else MUTED, is_called),
                                          width=29, height=28, alignment=ft.Alignment.CENTER,
                                          bgcolor=GREEN if is_called else "#EEF3F6", border_radius=6,
                                          tooltip=f"{letter}{number}"))
            self.board.controls.append(ft.Row(cells, spacing=4, wrap=True, run_spacing=4))
        winner_cards = [c for c in self.cards if c["id"] in self.winners]
        self.winner_text.value = (
            f"{len(winner_cards)} ganador(es): " + ", ".join(c["control"] for c in winner_cards[:6])
            + (" …" if len(winner_cards) > 6 else "")
        ) if winner_cards else "Sin ganadores todavía."
        self.render_gallery()
        self.page.update()

    def render_gallery(self):
        term = (self.search.value or "").strip().upper()
        selection = self.state_filter.value
        cards = [c for c in self.cards if term in c["control"].upper()
                 and (selection == "todos" or selection == "activos" and c["activo"]
                      or selection == "inactivos" and not c["activo"]
                      or selection == "ganadores" and c["id"] in self.winners)]
        pages = max(1, math.ceil(len(cards) / PAGE_SIZE))
        self.index = max(0, min(self.index, pages - 1))
        self.gallery.controls = [self.card_view(c) for c in cards[self.index*PAGE_SIZE:(self.index+1)*PAGE_SIZE]]
        if not cards:
            self.gallery.controls = [panel(ft.Column([
                ft.Icon(ft.Icons.GRID_VIEW_OUTLINED, size=42, color=MUTED),
                text("No hay cartones para mostrar.", 18, bold=True),
                text("Crea un lote o cambia los filtros.", color=MUTED)
            ], horizontal_alignment=ft.CrossAxisAlignment.CENTER), col=12)]
        self.page_label.value = f"Página {self.index+1} de {pages} · {len(cards)} cartones"
        self.previous.disabled, self.next.disabled = self.index == 0, self.index >= pages - 1

    def card_view(self, card):
        control, active = card["control"], card["activo"]
        winner = card["id"] in self.winners
        marked = marks(card["numeros"], self.called, active)
        count = sum(sum(row) for row in marked) - 1
        rows = [ft.Row([ft.Container(text(l, 16, "#FFFFFF", True), expand=1, height=32,
                                     bgcolor=NAVY, border_radius=6, alignment=ft.Alignment.CENTER)
                       for l in LETTERS], spacing=4)]
        for r in range(5):
            cells = []
            for c in range(5):
                center = (r, c) == (2, 2)
                value = control if center else str(card["numeros"][r][c])
                bg = "#FFF1CF" if center else (GREEN if marked[r][c] else ("#F0F2F4" if not active else "#F2F6F8"))
                fg = NAVY if center else ("#FFFFFF" if marked[r][c] else (MUTED if not active else NAVY))
                cells.append(ft.Container(
                    text(value, 9 if center else 18, fg, True, text_align=ft.TextAlign.CENTER,
                         max_lines=3 if center else 1, overflow=ft.TextOverflow.ELLIPSIS),
                    expand=1, height=43, bgcolor=bg, border_radius=6, alignment=ft.Alignment.CENTER,
                    padding=2, tooltip=f"Control: {control} · libre" if center else f"{LETTERS[c]}{value}"))
            rows.append(ft.Row(cells, spacing=4))
        title = ft.Row([text(control, 15, bold=True, expand=True, max_lines=1,
                             overflow=ft.TextOverflow.ELLIPSIS, tooltip=control),
                        ft.Container(text("BINGO" if winner else ("ACTIVO" if active else "INACTIVO"),
                                          10, GREEN if active else MUTED, True),
                                     padding=6, border_radius=6,
                                     bgcolor="#DCF5EC" if active else "#EDF0F2")])
        switch = ft.Switch(label="Activo", value=active,
                           on_change=lambda e: self.toggle(card["id"], e.control.value))
        bottom = ft.Row([switch,
                         ft.IconButton(ft.Icons.EDIT_OUTLINED, tooltip="Editar cartón",
                                       on_click=lambda e: self.edit(card)),
                         ft.IconButton(ft.Icons.DELETE_OUTLINE, tooltip="Eliminar cartón", icon_color="#B42318",
                                       on_click=lambda e: self.delete(card))],
                        alignment=ft.MainAxisAlignment.SPACE_BETWEEN, spacing=0)
        return ft.Container(ft.Column([title, ft.Column(rows, spacing=4),
                                       text(f"{count}/24 marcados" + (" · " + ", ".join(self.winners[card["id"]]) if winner else ""),
                                            11, GREEN if winner else MUTED), bottom], spacing=10),
                            padding=16, bgcolor="#FFFFFF", border_radius=16,
                            border=ft.Border.all(2 if winner else 1, GREEN if winner else LINE),
                            col={"xs":12, "sm":6, "lg":4, "xl":3})

    async def create(self, e):
        if self.create_button.disabled:
            return
        try:
            count = int(self.quantity.value or "")
            if not 1 <= count <= 10000:
                raise ValueError("Ingresa de 1 a 10000 cartones por lote.")
        except ValueError:
            self.error("Ingresa una cantidad entera de 1 a 10000 por lote.")
            return
        self.create_button.disabled = True
        self.create_button.content = "Creando…"
        self.page.update()
        try:
            await asyncio.to_thread(self.repo.create_cards, count)
            self.feedback.value, self.feedback.color = f"Se crearon {count} cartones.", TEAL
            self.refresh()
        except (ValueError, sqlite3.Error, OSError) as exc:
            self.error(exc)
        finally:
            self.create_button.disabled = False
            self.create_button.content = "Crear cartones"
            self.page.update()

    def submit_call(self, e):
        def action():
            before = set(self.winners)
            (letter, number), added = self.repo.call(self.input_call.value or "")
            column = LETTERS.index(letter)
            matched = sum(c["activo"] and any(row[column] == number for row in c["numeros"]) for c in self.cards)
            self.feedback.value = (f"{letter}{number}: marcado en {matched} cartón(es) activos."
                                   if added else f"{letter}{number} ya había sido llamado.")
            self.feedback.color = TEAL
            self.input_call.value = ""
            self.refresh()
            new = set(self.winners) - before
            if new:
                self.show_winners(ids=new)
        self.safely(action)

    def filter_changed(self, e):
        self.index = 0
        self.render_gallery()
        self.page.update()

    def clear_filter(self, e):
        self.search.value, self.state_filter.value = "", "todos"
        self.filter_changed(e)

    def move_page(self, delta):
        self.index += delta
        self.render_gallery()
        self.page.update()

    def toggle(self, card_id, active):
        def action():
            self.repo.set_active(card_id, active)
            self.refresh()
        self.safely(action)

    def change_mode(self, e):
        def action():
            self.repo.set_mode(self.mode_select.value)
            self.refresh()
            self.feedback.value, self.feedback.color = "Modalidad actualizada; ganadores recalculados.", TEAL
            self.page.update()
        self.safely(action)

    def confirm(self, title, description, action):
        def accept(e):
            self.page.pop_dialog()
            self.safely(action)
        self.page.show_dialog(ft.AlertDialog(
            modal=True, title=text(title, 20, bold=True), content=text(description),
            actions=[ft.TextButton("Cancelar", on_click=lambda e: self.page.pop_dialog()),
                     ft.FilledButton("Confirmar", on_click=accept)]))

    def reset(self, e):
        def action():
            self.repo.reset()
            self.feedback.value, self.feedback.color = "Nueva partida iniciada. Se conservan todos los cartones.", TEAL
            self.refresh()
        self.confirm("Nueva partida", "Se borrarán los números llamados y las marcas de la partida actual.\n"
                     "Los cartones y sus estados se conservarán.", action)

    def undo(self, e):
        if not self.calls_order:
            self.error("Todavía no hay números para deshacer.")
            return
        last = "".join(map(str, self.calls_order[-1]))
        def action():
            removed = self.repo.undo_call()
            self.feedback.value = f"Se deshizo {removed[0]}{removed[1]}." if removed else "No hay números para deshacer."
            self.feedback.color = TEAL
            self.refresh()
        self.confirm("Deshacer último número", f"Se retirará {last}. Las marcas y los ganadores se recalcularán.", action)

    def delete(self, card):
        def action():
            self.repo.delete(card["id"])
            self.refresh()
        self.confirm("Eliminar cartón", f"¿Eliminar el cartón {card['control']}? Esta acción no se puede deshacer.", action)

    def show_winners(self, e=None, ids=None):
        cards = [c for c in self.cards if c["id"] in self.winners and (ids is None or c["id"] in ids)]
        items = [panel(ft.Column([text(c["control"], 18, GREEN, True),
                                  text(", ".join(self.winners[c["id"]]), color=MUTED)])) for c in cards]
        self.page.show_dialog(ft.AlertDialog(
            modal=True, title=text("¡BINGO!" if cards else "Ganadores", 24, GREEN, True),
            content=ft.Container(ft.ListView(items or [text("Todavía no hay ganadores.")], spacing=10),
                                 width=500, height=300),
            actions=[ft.TextButton("Cerrar", on_click=lambda e: self.page.pop_dialog())]))

    def edit(self, card):
        control = ft.TextField(label="Número de control", value=card["control"], max_length=24,
                               border_radius=10)
        error = text("", color="#B42318")
        fields = {}
        rows = [ft.Row([ft.Container(text(l, 16, "#FFFFFF", True), expand=1, height=32,
                                     alignment=ft.Alignment.CENTER, bgcolor=NAVY, border_radius=6)
                       for l in LETTERS], spacing=6)]
        for r in range(5):
            cells = []
            for c in range(5):
                if (r, c) == (2, 2):
                    cells.append(ft.Container(text("CONTROL\nLibre", 10, bold=True,
                                                    text_align=ft.TextAlign.CENTER), expand=1, height=52,
                                              alignment=ft.Alignment.CENTER, bgcolor="#FFF1CF", border_radius=8))
                else:
                    field = ft.TextField(value=str(card["numeros"][r][c]), expand=1, text_size=16,
                                         text_align=ft.TextAlign.CENTER, dense=True, border_radius=8,
                                         content_padding=8, keyboard_type=ft.KeyboardType.NUMBER)
                    fields[r,c] = field
                    cells.append(field)
            rows.append(ft.Row(cells, spacing=6))
        def save(e):
            try:
                numbers = [[None]*5 for _ in range(5)]
                for (r,c), field in fields.items():
                    try:
                        numbers[r][c] = int((field.value or "").strip())
                    except ValueError as exc:
                        raise ValueError(f"Fila {r+1}, columna {LETTERS[c]}: ingresa un número entero.") from exc
                self.repo.edit(card["id"], control.value or "", numbers)
            except (ValueError, sqlite3.Error, OSError) as exc:
                error.value = str(exc)
                self.page.update()
                return
            self.page.pop_dialog()
            self.feedback.value, self.feedback.color = "Cartón actualizado. Marcas y ganadores recalculados.", TEAL
            self.safely(self.refresh)
        self.page.show_dialog(ft.AlertDialog(
            modal=True, title=text("Editar cartón", 22, bold=True),
            content=ft.Container(ft.Column([control, ft.Column(rows, spacing=8),
                                            text("B 1–15 · I 16–30 · N 31–45 · G 46–60 · O 61–75", 11, MUTED),
                                            error], tight=True, scroll=ft.ScrollMode.AUTO), width=450, height=465),
            actions=[ft.TextButton("Cancelar", on_click=lambda e: self.page.pop_dialog()),
                     ft.FilledButton("Guardar cambios", icon=ft.Icons.SAVE_OUTLINED, on_click=save)]))
