const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let pilots = {};

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "register") {
      pilots[data.pilotId] = { x: 100, y: 100 };
      broadcast({ type: "pilots", pilots });
    }

    if (data.type === "move") {
      if (pilots[data.pilotId]) {
        pilots[data.pilotId].x = data.x;
        pilots[data.pilotId].y = data.y;
        broadcast({ type: "update", pilotId: data.pilotId, x: data.x, y: data.y });
      }
    }
  });

  ws.send(JSON.stringify({ type: "pilots", pilots }));
});

function broadcast(msg) {
  const json = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
