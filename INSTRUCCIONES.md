# ICTFLOW · Setup Completo

## Requisitos
- Node.js instalado (https://nodejs.org)
- Cuenta TradingView (Free funciona)
- ngrok instalado (https://ngrok.com/download)

## Pasos

### 1. Iniciar el servidor
```bash
cd ictflow
node server.js
```
Verás: `ICTFLOW Server corriendo en http://localhost:3000`

### 2. Exponer con ngrok
En otra terminal:
```bash
ngrok http 3000
```
Copia la URL: `https://xxxx.ngrok-free.app`

### 3. Pine Script en TradingView
- Abre TradingView → Pine Editor (abajo)
- Crea nuevo script → pega el contenido de `ictflow_pinescript.pine`
- En el input "Webhook URL" escribe: `https://xxxx.ngrok-free.app/webhook`
- Guarda el indicador y añádelo al chart de EURUSD 15m

### 4. Crear Alerta en TradingView
- Botón de alarma (🔔) en TradingView
- Condición: tu indicador ICTFLOW
- Webhook URL: `https://xxxx.ngrok-free.app/webhook`
- Mensaje: dejar vacío (el Pine Script envía el JSON)
- Activar: "Una vez por cierre de barra"

### 5. Abrir la app
- Ve a http://localhost:3000
- En el setup, pega tu URL ngrok
- Conecta y espera la primera vela cerrada

## Notas
- ngrok gratis cambia la URL cada vez que reinicias → actualiza la alerta en TV
- Para URL fija: ngrok con cuenta gratuita permite 1 dominio estático
- El servidor guarda el último tick en memoria; la app se reconecta sola si pierde la conexión
