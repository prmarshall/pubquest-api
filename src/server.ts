import http from "http";
import { Server } from "socket.io";
import app from "@/app";
import pool, { testDbConnection } from "@/db/pool"; // <--- Updated Import
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  // 1. Check DB Connection
  await testDbConnection();

  // 2. Create Raw HTTP Server
  const httpServer = http.createServer(app);

  // 3. Attach Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // 4. Socket Event Logic
  io.on("connection", (socket) => {
    console.log(`⚡ User Connected: ${socket.id}`);

    // Join Party

    socket.on("join_party", async (userId) => {
      try {
        // Select joined_at too
        const res = await pool.query(
          `
                SELECT party_id, joined_at 
                FROM party_members 
                WHERE user_id = $1
            `,
          [userId],
        );

        if (res.rows.length > 0) {
          const { party_id, joined_at } = res.rows[0];
          const partyId = `party_${party_id}`;

          socket.join(partyId);
          console.log(`🛡️  User ${userId} connected to ${partyId}`);

          const now = new Date();
          const joinedTime = new Date(joined_at);
          const secondsSinceJoin =
            (now.getTime() - joinedTime.getTime()) / 1000;

          if (secondsSinceJoin < 60) {
            // Scenario A: Just joined via the API
            socket
              .to(partyId)
              .emit(
                "party_notification",
                `User ${userId} has joined the party! 🍻`,
              );
          } else {
            // Scenario B: Re-opening the app
            socket
              .to(partyId)
              .emit("party_notification", `User ${userId} is back online.`);
          }
        }
      } catch (err) {
        console.error("Socket DB Error:", err);
      }
    });

    socket.on("leave_party", (partyId) => {
      const roomName = `party_${partyId}`;

      console.log(`👋 User ${socket.id} left ${roomName}`);

      // 1. Notify the others BEFORE leaving
      socket
        .to(roomName)
        .emit("party_notification", `A hero has left the party.`);

      // 2. Actually leave the socket room (stops receiving updates)
      socket.leave(roomName);
    });

    // Live Location Update
    socket.on("update_location", (data) => {
      const { partyId, lat, lng, username } = data;
      // Broadcast to room
      socket
        .to(partyId)
        .emit("member_moved", { id: socket.id, username, lat, lng });
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected", socket.id);
    });
  });

  // 5. Start Listening
  httpServer.listen(PORT, () => {
    console.log(
      `🚀 PubQuest Server + WebSockets running on http://localhost:${PORT}`,
    );
  });
};

startServer();
