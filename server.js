const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: process.env.PORT || 8080 });

let pilots = {};
let clients = {};
let coordinatorActive = false;

function broadcastPilots() {
  const data = { type: "pilots", pilots };
  for (const id in clients) {
    clients[id].send(JSON.stringify(data));
  }
}

wss.on("connection", ws => {
  ws.on("message", msg => {
    const data = JSON.parse(msg);

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
        // уведомление координатору
        for (const id in clients) {
          if (pilots[id].isCoordinator) {
            clients[id].send(JSON.stringify({ type: "move", pilotId: data.pilotId, x: data.x, y: data.y }));
          }
        }
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
        if (pilots[id].isCoordinator) coordinatorActive = false;
        delete clients[id];
        delete pilots[id];
        broadcastPilots();
      }
    }
  });
});
