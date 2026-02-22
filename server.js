const express = require("express");
const path = require("path");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

const pilots = {};

function broadcast(message) {
  const msg = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if (data.type === "register") {
      pilots[data.pilotId] = {
        x: 100,
        y: 100,
        name: data.name || "Без имени",
        color: data.color || "blue",
        isCoordinator: data.isCoordinator || false,
        verified: false
      };
      broadcast({ type: "pilots", pilots });
    }

    if (data.type === "move") {
      if (pilots[data.pilotId]) {
        pilots[data.pilotId].x = data.x;
        pilots[data.pilotId].y = data.y;
        broadcast({ type: "update", pilotId: data.pilotId, x: data.x, y: data.y });
      }
    }

    if (data.type === "verify") {
      if (pilots[data.pilotId]) {
        pilots[data.pilotId].verified = true;
        broadcast({ type: "verify", pilotId: data.pilotId });
      }
    }

    if (data.type === "disconnect") {
      delete pilots[data.pilotId];
      broadcast({ type: "pilots", pilots });
    }

    if (data.type === "relocate") {
      if (pilots[data.pilotId]) {
        pilots[data.pilotId].x = data.x;
        pilots[data.pilotId].y = data.y;
        broadcast({ type: "relocate", pilotId: data.pilotId, x: data.x, y: data.y });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
