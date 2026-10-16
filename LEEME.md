# Bingo Control · Python + Flet + SQLite

Aplicación de escritorio con interfaz Material, cartones editables y marcado automático.
El sistema usa B 1–15, I 16–30, N 31–45, G 46–60 y O 61–75.
En el centro aparece el número de control, que cuenta como casilla libre.

## Inicio rápido en Windows

1. Instala Python 3.10 o superior (se recomienda 3.12), de 64 bits. Marca **Add Python to PATH** en el instalador.
2. Extrae **toda** la carpeta `BingoModerno` del ZIP dentro de Documentos o de otra carpeta donde puedas guardar archivos.
3. Abre `INICIAR_WINDOWS.bat` con doble clic.
4. La primera vez se crea un entorno `.venv`, se instalan las dependencias y se abre la aplicación. Necesitas Internet para la instalación inicial y para la descarga inicial del cliente de Flet, si corresponde.
5. Para abrirla nuevamente, usa el mismo archivo `.bat`.

La entrega contiene el código fuente ejecutable con Python; no incluye un `.exe` compilado.

## Instalación manual

Abre PowerShell en la carpeta que contiene `main.py` y ejecuta:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe main.py
```

Si no tienes el comando `py`, usa `python` en la primera línea.
No necesitas activar el entorno ni cambiar la política de ejecución de PowerShell.

En Linux o macOS:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python main.py
```

La ejecución abre una ventana de escritorio. En Linux se necesita un entorno gráfico compatible con el cliente de Flet.

## Uso paso a paso

1. **Crear:** escribe la cantidad y pulsa **Crear cartones**. Se permiten hasta 10000 por lote; puedes agregar más lotes. Cada cartón recibe un control único: C000001, C000002…
2. **Editar:** pulsa el lápiz del cartón. Cambia el control o los números y guarda. La aplicación comprueba rangos, números repetidos por columna y controles duplicados. Los controles pueden tener hasta 24 caracteres y se guardan en mayúsculas.
3. **Activar/desactivar:** usa el interruptor **Activo**. Los inactivos se muestran en gris y no pueden ganar.
4. **Marcar:** introduce `G53` y pulsa **Marcar** o Enter. También admite `g 53`, `G-53` y `G:53`. El número se resalta en todos los cartones activos que lo contengan.
5. **Buscar:** escribe parte del control. Puedes combinarlo con Todos, Activos, Inactivos o Ganadores. Las acciones conservan la búsqueda.
6. **Revisar ganadores:** el contador y el panel revisan todos los cartones, incluso los de otras páginas. Al entrar un número que produce nuevos ganadores, aparece una alerta con sus controles y patrones.
7. **Corregir una llamada:** pulsa **Deshacer último** y confirma. Se recalculan las marcas y los ganadores.
8. **Reiniciar:** pulsa **Nueva partida** y confirma. Se borran las llamadas y marcas; se conservan los cartones y sus estados.

### Modalidades

- **Una línea:** gana con cualquier fila, columna o una de las dos diagonales.
- **Cartón lleno:** gana al marcar los 24 números; el centro siempre está libre.

El cambio de modalidad conserva las llamadas y recalcula los ganadores.
La galería muestra 24 cartones por página para mantener la interfaz ágil. El marcado y la detección no se limitan a esa página.

### Qué sucede al activar o editar un cartón

Las marcas se calculan a partir de las llamadas de la partida actual. Al activar un cartón, se marcan también sus coincidencias con números llamados previamente. Al editar sus números, las marcas y los ganadores se recalculan de la misma forma. El panel de ganadores refleja el resultado actual; la alerta emergente se muestra al introducir una llamada que genera nuevos ganadores.

Los números repetidos en las llamadas se ignoran. No cambia el orden de salida al ingresar de nuevo un número.

## Guardado y base anterior

Se guardan automáticamente los cartones, estados, llamadas, modalidad y secuencia de controles en `data/bingo.db`. No se reinicia la partida al cerrar la aplicación.

Para respaldar tus datos, cierra el programa y copia `data/bingo.db` a otra carpeta.
Para restaurarlos, cierra el programa y devuelve esa copia a su ubicación original.

Si tienes el `bingo.db` de la versión anterior:

1. Cierra ambos programas y guarda una copia de respaldo del archivo.
2. Copia ese `bingo.db` al lado de `main.py` **antes de abrir esta versión**.
3. El programa usará esa base en lugar de `data/bingo.db` y adaptará los campos antiguos `numero_control` y `LIBRE` si existen. Los números existentes deben respetar el rango 1–75.

Las bases con controles duplicados que solo difieran en mayúsculas/minúsculas requieren corregir esos controles antes de abrirlas. La aplicación no los cambia automáticamente.

Para indicar una ubicación diferente:

```powershell
.\.venv\Scripts\python.exe main.py --db "D:\Bingo\bingo.db"
```

## Archivos principales

| Archivo | Función |
|---|---|
| `main.py` | Inicio de escritorio y ubicación de SQLite |
| `bingo/ui.py` | Pantalla, cartones, filtros y diálogos |
| `bingo/core.py` | Generación, validación y reglas de victoria |
| `bingo/database.py` | Persistencia y compatibilidad con la versión anterior |
| `requirements.txt` | Flet de escritorio fijado en 1.0.3 |
| `INICIAR_WINDOWS.bat` | Instalación inicial e inicio con doble clic |
| `tests/test_bingo.py` | Pruebas de reglas, SQLite y controles Flet |

## Verificación

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Las pruebas cubren generación y rangos, centro libre, filas/columnas/diagonales, cartón lleno, inactivos, controles duplicados, edición atómica, persistencia, deshacer, reinicio y ganadores fuera de la página visible.

## Si no abre

- Extrae el ZIP completo; no ejecutes `main.py` dentro del archivo comprimido.
- Comprueba que `python --version` o `py -3 --version` sea 3.10 o superior.
- Si actualizaste Python, elimina solo `.venv` y abre nuevamente el `.bat`.
- Si `pip` falla, revisa la conexión a Internet y vuelve a ejecutar el inicio.
- Conserva `bingo.db`: contiene tus datos. Puedes eliminar `.venv` para reinstalar dependencias sin borrar cartones.

Referencia del framework: https://flet.dev/docs/
