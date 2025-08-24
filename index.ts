import http from "http";
import app from "./src/app.js";
import { ENV } from "./src/config/env.js";
import { initializeMessageSockets } from "./src/sockets/messagingSockets.js";

const PORT = ENV.PORT;

const server = http.createServer(app);

const io = initializeMessageSockets(server);

app.set("socketio", io);

server.listen(PORT, () => {
  console.log(`🚀 AutoHarbour API running on port ${PORT}`);
  console.log(`📖 API docs available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
  console.log(`📡 WebSocket messaging ready at ws://localhost:${PORT}`);
  console.log(`🔗 Socket.IO endpoint ready for real-time messaging`);
});

process.on("SIGINT", () => {
  console.log("Shutting down AutoHarbour server...");
  server.close(() => {
    console.log("Server closed gracefully");
    process.exit(0);
  });
});

export { io };
