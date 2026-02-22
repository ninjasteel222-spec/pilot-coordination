const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let pilots = {};
let clients = {};
let coordinatorActive = false;

function broadcastPilots() {
  const data = { type: "pilots", pilots };
  for (const id in clients) {
    try { clients[id].send(JSON.stringify(data)); } catch (e) {}
  }
}

wss.on("connection", ws => {
  ws.on("message", msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }

    if (data.type === "register") {
      if (data.isCoordinator) {
        if (coordinatorActive) {
          ws.send(JSON.stringify({ type: "error", message: "Координатор уже активен" }));
          ws.close();
          return;
        }
        coordinatorActive = true;
      }
      pilots[data.pilotId] = { ...data, x: 100, y: 100, verified: false };
      clients[data.pilotId] = ws;
      console.log("Registered:", data);
      broadcastPilots();
    }

    if (data.type === "verify") {
      if (pilots[data.pilotId]) {
        pilots[data.pilotId].verified = true;
        if (clients[data.pilotId]) {
          clients[data.pilotId].send(JSON.stringify({ type: "verify", pilotId: data.pilotId }));
        }
        broadcastPilots();
      }
    }

    if (data.type === "disconnect") {
      if (clients[data.pilotId]) {
        clients[data.pilotId].send(JSON.stringify({ type: "disconnect", pilotId: data.pilotId }));
        clients[data.pilotId].close();
        delete clients[data.pilotId];
        delete pilots[data.pilotId];
        broadcastPilots();
      }
    }

    if (data.type === "move") {
      if (pilots[data.pilotId]) {
        pilots[data.pilotId].x = data.x;
        pilots[data.pilotId].y = data.y;
        broadcastPilots();
      }
    }

    if (data.type === "relocate") {
      if (pilots[data.pilotId]) {
        pilots[data.pilotId].x = data.x;
        pilots[data.pilotId].y = data.y;
        broadcastPilots();
        if (clients[data.pilotId]) {
          clients[data.pilotId].send(JSON.stringify({ type: "relocate", pilotId: data.pilotId, x: data.x, y: data.y }));
        }
      }
    }
  });

  ws.on("close", () => {
    for (const id in clients) {
      if (clients[id] === ws) {
        if (pilots[id] && pilots[id].isCoordinator) coordinatorActive = false;
        delete clients[id];
        delete pilots[id];
        broadcastPilots();
      }
    }
  });

  ws.on("error", () => {
    coordinatorActive = false; // сбросим флаг на всякий случай
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log("Server running on port", PORT));
