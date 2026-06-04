import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { GameEvents } from '@mind-race/shared';
import { requireAuth, AuthenticatedRequest } from './middleware/auth';
import { supabaseAdmin } from './lib/supabase';
import questionsRouter from './routes/questions';
import roomsRouter from './routes/rooms';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Helper to determine allowed origins
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Direct requests, server-to-server
  if (allowedOrigins.includes(origin)) return true;
  // Allow any port on localhost or 127.0.0.1 for local development
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  // Allow typical local network IPs for mobile testing (e.g. 192.168.x.x)
  if (/^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin)) return true;
  return false;
};

// Enable CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Base health check route
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Mind Race Core API',
  });
});

// Protected route: get current authenticated user profile
app.get('/api/v1/users/me', requireAuth as any, (req: AuthenticatedRequest, res) => {
  res.json({
    status: 'success',
    user: req.profile,
  });
});

// Register routes
app.use('/api/v1/questions', questionsRouter);
app.use('/api/v1/rooms', roomsRouter);

// Create HTTP server and initialize socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Broadcast the current participant profiles to everyone in a room
async function broadcastRoomState(roomId: string) {
  try {
    const { data: participants, error } = await supabaseAdmin
      .from('room_participants')
      .select(`
        score,
        is_host,
        is_ready,
        team_id,
        is_spectator,
        user_id,
        profiles (
          username,
          avatar_url,
          rank
        )
      `)
      .eq('room_id', roomId);

    if (error || !participants) {
      console.error('[Socket] Error fetching participants for broadcast:', error);
      return;
    }

    const list = participants.map((p: any) => ({
      userId: p.user_id,
      username: p.profiles?.username || 'Player',
      avatarUrl: p.profiles?.avatar_url || null,
      rank: p.profiles?.rank || 'Bronze',
      score: p.score,
      isHost: p.is_host,
      isReady: p.is_ready,
      teamId: p.team_id,
      isSpectator: p.is_spectator
    }));

    io.to(roomId).emit(GameEvents.ROOM_STATE_CHANGE, {
      event: 'PARTICIPANTS_UPDATE',
      participants: list
    });
  } catch (err) {
    console.error('[Socket] Exception broadcasting room state:', err);
  }
}

// WebSocket connection authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log(`[Socket Auth] Connection rejected: Token missing`);
    return next(new Error('Authentication token required'));
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      console.log(`[Socket Auth] Connection rejected: Token invalid or expired`);
      return next(new Error('Invalid authentication token'));
    }

    // Attach verified user payload to socket
    socket.data.user = user;
    next();
  } catch (err) {
    console.error('[Socket Auth] Authentication exception:', err);
    next(new Error('Authentication failed'));
  }
});

// WebSocket event handling
io.on('connection', (socket) => {
  const email = socket.data.user?.email || 'unknown';
  const userId = socket.data.user?.id;
  console.log(`[Socket] User connected: ${socket.id} (Authenticated: ${email})`);

  // Handle room joining
  socket.on(GameEvents.JOIN_ROOM, async ({ roomId, username }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`[Socket] ${username} (${socket.id}) joined room ${roomId}`);
    
    // Broadcast player joined & full state to room members
    await broadcastRoomState(roomId);
  });

  // Handle room leaving
  socket.on(GameEvents.LEAVE_ROOM, async ({ roomId }) => {
    socket.leave(roomId);
    socket.data.roomId = null;
    console.log(`[Socket] User ${userId} left room ${roomId}`);
    
    // Broadcast updated player list to room members
    await broadcastRoomState(roomId);
  });

  // Handle player ready state toggle
  socket.on(GameEvents.PLAYER_READY, async ({ roomId, isReady }) => {
    if (!userId) return;
    console.log(`[Socket] User ${userId} ready: ${isReady} in room ${roomId}`);

    try {
      // Update in DB
      await supabaseAdmin
        .from('room_participants')
        .update({ is_ready: isReady })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      // Broadcast updated states
      await broadcastRoomState(roomId);
    } catch (err) {
      console.error('[Socket] Ready state update error:', err);
    }
  });

  // Handle host starting the game
  socket.on(GameEvents.START_GAME, async ({ roomId }) => {
    if (!userId) return;
    
    try {
      // Check if user is host of the room
      const { data: room } = await supabaseAdmin
        .from('rooms')
        .select('host_id')
        .eq('id', roomId)
        .maybeSingle();

      if (room && room.host_id === userId) {
        // Update room status to ACTIVE
        await supabaseAdmin
          .from('rooms')
          .update({ status: 'ACTIVE' })
          .eq('id', roomId);

        console.log(`[Socket] Host started game for room ${roomId}`);
        // Emit start game to all players in room
        io.to(roomId).emit(GameEvents.START_GAME, { roomId });
      }
    } catch (err) {
      console.error('[Socket] Start game error:', err);
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    const roomId = socket.data.roomId;
    console.log(`[Socket] User disconnected: ${socket.id} (${email})`);

    if (roomId && userId) {
      try {
        // Remove participant row
        await supabaseAdmin
          .from('room_participants')
          .delete()
          .eq('room_id', roomId)
          .eq('user_id', userId);

        // Check remaining players
        const { data: remaining } = await supabaseAdmin
          .from('room_participants')
          .select('user_id, is_host')
          .eq('room_id', roomId);

        if (!remaining || remaining.length === 0) {
          // No players -> delete room
          await supabaseAdmin.from('rooms').delete().eq('id', roomId);
        } else {
          // If the disconnected user was host, reassign
          const hostStillPresent = remaining.some((r) => r.is_host);
          if (!hostStillPresent) {
            const newHostId = remaining[0].user_id;
            await supabaseAdmin.from('rooms').update({ host_id: newHostId }).eq('id', roomId);
            await supabaseAdmin
              .from('room_participants')
              .update({ is_host: true, is_ready: true })
              .eq('room_id', roomId)
              .eq('user_id', newHostId);
          }
          // Broadcast state update
          await broadcastRoomState(roomId);
        }
      } catch (err) {
        console.error('[Socket] Disconnect cleanup error:', err);
      }
    }
  });
});

// Start the server
httpServer.listen(port, () => {
  console.log(`===========================================`);
  console.log(`🚀 Mind Race Core API is running!`);
  console.log(`🌐 Server Port: ${port}`);
  console.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
  console.log(`===========================================`);
});
