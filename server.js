const express = require('express');
const WebSocket = require('ws');
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname, "public")));


// Render задаёт порт через переменную окружения
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// WebSocket сервер
const wss = new WebSocket.Server({ server });

// Список активных пилотов
let pilots = {};

wss.on('connection', ws => {
  console.log('Client connected');

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);

      // Регистрация нового пилота
      if (data.type === 'register') {
        ws.pilotId = data.pilotId;
        pilots[data.pilotId] = { x: 100, y: 100 }; // стартовые координаты
        console.log(`Pilot registered: ${data.pilotId}`);

        // Отправляем координатору список пилотов
        broadcast({ type: 'pilots', pilots });
      }

      // Обновление позиции пилота
      if (data.type === 'move' && ws.pilotId) {
        pilots[ws.pilotId] = { x: data.x, y: data.y };
        broadcast({ type: 'update', pilotId: ws.pilotId, x: data.x, y: data.y });
      }
    } catch (err) {
      console.error('Invalid message:', message);
    }
  });

  ws.on('close', () => {
    if (ws.pilotId) {
      delete pilots[ws.pilotId];
      broadcast({ type: 'pilots', pilots });
      console.log(`Pilot disconnected: ${ws.pilotId}`);
    }
  });
});

// Рассылка всем клиентам
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
