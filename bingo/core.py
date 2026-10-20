"""Reglas de bingo; este módulo no depende de la interfaz."""
import random
import re

LETTERS = "BINGO"
RANGES = {letter: (i * 15 + 1, (i + 1) * 15) for i, letter in enumerate(LETTERS)}


def parse_call(text):
    match = re.fullmatch(r"([BINGO])[-:]?(\d{1,2})", re.sub(r"\s+", "", text.upper()))
    if not match:
        raise ValueError("Escribe la letra y el número: B5, I20, N33, G53 u O74.")
    letter, number = match[1], int(match[2])
    low, high = RANGES[letter]
    if not low <= number <= high:
        raise ValueError(f"{letter} admite números del {low} al {high}.")
    return letter, number


def validate_control(control):
    control = control.strip().upper()
    if not control or len(control) > 24:
        raise ValueError("El control debe tener entre 1 y 24 caracteres.")
    if any(ord(c) < 32 for c in control):
        raise ValueError("El control no admite saltos de línea ni caracteres de control.")
    return control


def validate_card(numbers):
    if not isinstance(numbers, list) or len(numbers) != 5 or any(
        not isinstance(row, list) or len(row) != 5 for row in numbers
    ):
        raise ValueError("El cartón debe tener cinco filas y cinco columnas.")
    result = [row[:] for row in numbers]
    result[2][2] = None
    for col, letter in enumerate(LETTERS):
        low, high = RANGES[letter]
        values = []
        for row in range(5):
            if (row, col) == (2, 2):
                continue
            value = result[row][col]
            if type(value) is not int or not low <= value <= high:
                raise ValueError(f"Fila {row + 1}, columna {letter}: ingresa un entero de {low} a {high}.")
            values.append(value)
        if len(values) != len(set(values)):
            raise ValueError(f"Hay números repetidos en la columna {letter}.")
    return result


def generate_card():
    columns = []
    for letter in LETTERS:
        low, high = RANGES[letter]
        columns.append(random.sample(range(low, high + 1), 5))
    result = [[columns[c][r] for c in range(5)] for r in range(5)]
    result[2][2] = None
    return result


def is_cell_eligible(r, c, mode="linea"):
    if mode == "l":
        return c == 0 or r == 4
    if mode == "o":
        return r in (0, 4) or c in (0, 4)
    return True


def marks(numbers, called, active=True, mode="linea"):
    return [[
        is_cell_eligible(r, c, mode) and (
            (r, c) == (2, 2) or (active and (LETTERS[c], numbers[r][c]) in called)
        )
        for c in range(5)
    ] for r in range(5)]


def winning_patterns(numbers, called, active=True, mode="linea"):
    if not active:
        return []
    board = marks(numbers, called, active, mode)
    if mode == "lleno":
        return ["Cartón lleno"] if all(all(row) for row in board) else []
    if mode == "l":
        col_b = all(board[r][0] for r in range(5))
        row_5 = all(board[4])
        return ["Figura en L (Col B + Fila 5)"] if (col_b and row_5) else []
    if mode == "o":
        is_o = all(board[r][c] for r in range(5) for c in range(5) if r in (0, 4) or c in (0, 4))
        return ["Figura en O (Marco Exterior)"] if is_o else []
    marked = sum(board[r][c] for r in range(5) for c in range(5) if (r, c) != (2, 2))
    if mode == "primeros5":
        return [f"Primeros 5 números ({marked}/24 marcados)"] if marked >= 5 else []
    if mode == "primeros10":
        return [f"Primeros 10 números ({marked}/24 marcados)"] if marked >= 10 else []
    result = []
    for r in range(5):
        if all(board[r]):
            result.append(f"Fila {r + 1}")
    for c in range(5):
        if all(board[r][c] for r in range(5)):
            result.append(f"Columna {LETTERS[c]}")
    if all(board[i][i] for i in range(5)):
        result.append("Diagonal principal")
    if all(board[i][4 - i] for i in range(5)):
        result.append("Diagonal secundaria")
    return result
