/**
 * Lógica matemática y reglas de Bingo 75
 * Equivalente exacto y extendido de bingo/core.py
 */

export const LETTERS = ["B", "I", "N", "G", "O"];

export const RANGES = {
  B: [1, 15],
  I: [16, 30],
  N: [31, 45],
  G: [46, 60],
  O: [61, 75],
};

/**
 * Obtiene la letra correspondiente a un número entre 1 y 75
 */
export function getLetterForNumber(number) {
  const num = parseInt(number, 10);
  if (isNaN(num) || num < 1 || num > 75) return null;
  for (const letter of LETTERS) {
    const [low, high] = RANGES[letter];
    if (num >= low && num <= high) return letter;
  }
  return null;
}

/**
 * Valida y parsea el texto de llamada (e.g. "G53", "g 53", "53", "B-5")
 */
export function parseCall(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Ingresa un número para llamar (ej: G53 o 53).");
  }
  const clean = text.trim().toUpperCase().replace(/[\s\-:]+/g, "");

  // Si solo ingresaron el número (ej: "53")
  if (/^\d{1,2}$/.test(clean)) {
    const num = parseInt(clean, 10);
    const letter = getLetterForNumber(num);
    if (!letter) {
      throw new Error(`El número ${num} está fuera del rango del bingo (1 al 75).`);
    }
    return { letter, number: num, callKey: `${letter}${num}` };
  }

  // Si ingresaron letra + número (ej: "G53")
  const match = clean.match(/^([BINGO])(\d{1,2})$/);
  if (!match) {
    throw new Error("Formato inválido. Escribe la letra y el número: B5, I20, N33, G53 u O74.");
  }

  const letter = match[1];
  const num = parseInt(match[2], 10);
  const [low, high] = RANGES[letter];

  if (num < low || num > high) {
    throw new Error(`La columna ${letter} solo admite números del ${low} al ${high}.`);
  }

  return { letter, number: num, callKey: `${letter}${num}` };
}

/**
 * Valida un código de control
 */
export function validateControl(control) {
  const clean = (control || "").trim().toUpperCase();
  if (!clean || clean.length > 24) {
    throw new Error("El código de control debe tener entre 1 y 24 caracteres.");
  }
  return clean;
}

/**
 * Genera una matriz 5x5 aleatoria válida con centro nulo (casilla libre)
 */
export function generateCard() {
  const columns = [];
  for (const letter of LETTERS) {
    const [low, high] = RANGES[letter];
    const pool = [];
    for (let i = low; i <= high; i++) pool.push(i);

    // Shuffle simple de Fisher-Yates para extraer 5
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    columns.push(pool.slice(0, 5));
  }

  const result = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      row.push(columns[c][r]);
    }
    result.push(row);
  }
  result[2][2] = null; // Casilla libre centro
  return result;
}

/**
 * Valida la matriz 5x5 de números
 */
export function validateCard(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== 5) {
    throw new Error("El cartón debe tener 5 filas.");
  }
  for (let r = 0; r < 5; r++) {
    if (!Array.isArray(numbers[r]) || numbers[r].length !== 5) {
      throw new Error("Cada fila debe tener 5 columnas.");
    }
  }

  const copy = numbers.map(row => [...row]);
  copy[2][2] = null;

  for (let c = 0; c < 5; c++) {
    const letter = LETTERS[c];
    const [low, high] = RANGES[letter];
    const seen = new Set();

    for (let r = 0; r < 5; r++) {
      if (r === 2 && c === 2) continue;
      const val = copy[r][c];
      const intVal = parseInt(val, 10);
      if (isNaN(intVal) || intVal < low || intVal > high) {
        throw new Error(`Fila ${r + 1}, col ${letter}: debe ser entero entre ${low} y ${high}.`);
      }
      if (seen.has(intVal)) {
        throw new Error(`Número ${intVal} repetido en la columna ${letter}.`);
      }
      seen.add(intVal);
      copy[r][c] = intVal;
    }
  }
  return copy;
}

/**
 * Calcula matriz booleana 5x5 de celdas marcadas
 * @param {number[][]} numbers Matriz 5x5
 * @param {Set<string>} calledSet Conjunto de strings "G53", "B1", etc.
 * @param {boolean} active Si el cartón está activo
 */
export function calculateMarks(numbers, calledSet, active = true) {
  const board = [];
  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        row.push(true); // Centro siempre marcado
      } else if (!active) {
        row.push(false);
      } else {
        const key = `${LETTERS[c]}${numbers[r][c]}`;
        row.push(calledSet.has(key));
      }
    }
    board.push(row);
  }
  return board;
}

export const GAME_MODES = {
  linea: {
    id: "linea",
    name: "Una Línea",
    desc: "Cualquier fila, columna o diagonal",
  },
  lleno: {
    id: "lleno",
    name: "Cartón Lleno",
    desc: "Los 24 números del cartón marcados",
  },
  l: {
    id: "l",
    name: "En L",
    desc: "Columna B y fila 5 (o en cualquier esquina)",
  },
  o: {
    id: "o",
    name: "En O (Lados)",
    desc: "Todas las casillas de los 4 lados exteriores",
  },
  primeros5: {
    id: "primeros5",
    name: "Primeros 5 Números",
    desc: "5 números cualesquiera marcados en el cartón",
  },
  primeros10: {
    id: "primeros10",
    name: "Primeros 10 Números",
    desc: "10 números cualesquiera marcados en el cartón",
  },
};

/**
 * Determina los patrones ganadores según modalidad:
 * "linea", "lleno", "l", "o", "primeros5", "primeros10"
 */
export function getWinningPatterns(numbers, calledSet, active = true, mode = "linea") {
  if (!active) return [];
  const board = calculateMarks(numbers, calledSet, true);

  // Modalidad: Cartón Lleno
  if (mode === "lleno") {
    const isFull = board.every(row => row.every(cell => cell === true));
    return isFull ? ["Cartón lleno"] : [];
  }

  // Modalidad: En L (Columna y fila coincidiendo en esquina)
  if (mode === "l") {
    const patterns = [];
    const colB = board.every(row => row[0]);
    const colO = board.every(row => row[4]);
    const row1 = board[0].every(Boolean);
    const row5 = board[4].every(Boolean);

    // L Tradicional (Columna B + Fila 5)
    if (colB && row5) patterns.push("Figura en L (Col B + Fila 5)");
    // L Invertida (Columna O + Fila 5)
    if (colO && row5) patterns.push("Figura en L (Col O + Fila 5)");
    // L Superior Izquierda (Columna B + Fila 1)
    if (colB && row1) patterns.push("Figura en L (Col B + Fila 1)");
    // L Superior Derecha (Columna O + Fila 1)
    if (colO && row1) patterns.push("Figura en L (Col O + Fila 1)");

    return patterns;
  }

  // Modalidad: En O (todas las casillas de los lados / marco exterior)
  if (mode === "o") {
    let isOuterRingFull = true;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (r === 0 || r === 4 || c === 0 || c === 4) {
          if (!board[r][c]) {
            isOuterRingFull = false;
            break;
          }
        }
      }
      if (!isOuterRingFull) break;
    }
    return isOuterRingFull ? ["Figura en O (Marco Exterior)"] : [];
  }

  // Contar números llamados marcados (excluyendo el centro libre 2,2)
  let markedCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) continue; // centro libre
      if (board[r][c]) markedCount++;
    }
  }

  // Modalidad: Primeros 5 números
  if (mode === "primeros5") {
    return markedCount >= 5 ? [`Primeros 5 números (${markedCount}/24 marcados)`] : [];
  }

  // Modalidad: Primeros 10 números
  if (mode === "primeros10") {
    return markedCount >= 10 ? [`Primeros 10 números (${markedCount}/24 marcados)`] : [];
  }

  // Modalidad por defecto: Una Línea (Fila, Columna o Diagonal)
  const results = [];
  // Filas
  for (let r = 0; r < 5; r++) {
    if (board[r].every(Boolean)) {
      results.push(`Fila ${r + 1}`);
    }
  }

  // Columnas
  for (let c = 0; c < 5; c++) {
    let colFull = true;
    for (let r = 0; r < 5; r++) {
      if (!board[r][c]) {
        colFull = false;
        break;
      }
    }
    if (colFull) {
      results.push(`Columna ${LETTERS[c]}`);
    }
  }

  // Diagonal Principal
  let diag1 = true;
  for (let i = 0; i < 5; i++) {
    if (!board[i][i]) {
      diag1 = false;
      break;
    }
  }
  if (diag1) results.push("Diagonal principal");

  // Diagonal Secundaria
  let diag2 = true;
  for (let i = 0; i < 5; i++) {
    if (!board[i][4 - i]) {
      diag2 = false;
      break;
    }
  }
  if (diag2) results.push("Diagonal secundaria");

  return results;
}
