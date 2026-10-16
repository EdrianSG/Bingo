import { generateCard } from "./bingoCore";

const STORAGE_KEY = "bingo_control_moderno_v1";

export function getInitialBingoState() {
  // Generar 12 cartones iniciales para que el usuario pueda probar de inmediato
  const initialCards = [];
  for (let i = 1; i <= 12; i++) {
    const numStr = String(i).padStart(6, "0");
    initialCards.push({
      id: `card_${Date.now()}_${i}`,
      control: `C${numStr}`,
      numbers: generateCard(),
      activo: true,
    });
  }

  return {
    cartones: initialCards,
    llamadas: [], // [{ letter: 'G', number: 53, callKey: 'G53' }]
    modo: "linea", // "linea" | "lleno"
    siguienteControl: 13,
  };
}

export function loadBingoState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialBingoState();
      saveBingoState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.cartones)) {
      throw new Error("Datos corruptos.");
    }
    return {
      cartones: parsed.cartones || [],
      llamadas: parsed.llamadas || [],
      modo: parsed.modo === "lleno" ? "lleno" : "linea",
      siguienteControl: parsed.siguienteControl || (parsed.cartones.length + 1),
    };
  } catch (err) {
    console.error("Error al cargar localStorage:", err);
    return getInitialBingoState();
  }
}

export function saveBingoState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Error al guardar en localStorage:", err);
  }
}

export function exportBackup(state) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `bingo_control_backup_${date}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseBackupFile(jsonString) {
  const data = JSON.parse(jsonString);
  if (!Array.isArray(data.cartones)) {
    throw new Error("El archivo no tiene el formato válido de respaldo de Bingo Control.");
  }
  return {
    cartones: data.cartones,
    llamadas: Array.isArray(data.llamadas) ? data.llamadas : [],
    modo: data.modo === "lleno" ? "lleno" : "linea",
    siguienteControl: data.siguienteControl || data.cartones.length + 1,
  };
}
