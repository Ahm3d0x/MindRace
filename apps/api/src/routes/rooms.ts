import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { RoomConfig, RoomType } from '@mind-race/shared';

const router = Router();

// Helper to generate a 6-character alphanumeric room code
async function generateUniqueRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let attempts = 0;
  
  while (attempts < 10) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists in the database
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle();
      
    if (!error && !data) {
      return code;
    }
    attempts++;
  }
  
  // Fallback to timestamp based hash if collisions persist
  return 'R' + Date.now().toString(36).substring(5, 10).toUpperCase();
}

// 1. Create a room
router.post('/', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { type, config } = req.body;
  const userId = req.profile?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const roomType: RoomType = type || 'PUBLIC';
  const roomConfig: RoomConfig = config || {
    mode: 'FREE_FOR_ALL',
    maxPlayers: 10,
    roundsCount: 10,
    questionTimeLimitSeconds: 30,
    buzzerType: 'STANDARD',
    allowedPowerUps: ['JOKER', 'FREEZE', 'SHIELD', 'REVEAL_HINT', 'DOUBLE_CHANCE'],
    categoryWeights: { 'General': 100 }
  };

  try {
    const code = await generateUniqueRoomCode();

    // Insert room in database
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .insert({
        code,
        host_id: userId,
        type: roomType,
        status: 'WAITING',
        config: roomConfig,
        max_players: roomConfig.maxPlayers || 10,
        current_round: 0
      })
      .select()
      .single();

    if (roomError) {
      return res.status(500).json({ error: roomError.message });
    }

    // Automatically add host as participant
    const { error: partError } = await supabaseAdmin
      .from('room_participants')
      .insert({
        room_id: room.id,
        user_id: userId,
        is_host: true,
        is_ready: true,
        score: 0,
        is_spectator: false
      });

    if (partError) {
      return res.status(500).json({ error: partError.message });
    }

    return res.status(201).json({ ...room, code });
  } catch (err) {
    console.error('Create room error:', err);
    return res.status(500).json({ error: 'Internal server error creating room' });
  }
});

// 2. List public waiting rooms
router.get('/', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: rooms, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('type', 'PUBLIC')
      .eq('status', 'WAITING')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(rooms || []);
  } catch (err) {
    console.error('List rooms error:', err);
    return res.status(500).json({ error: 'Internal server error listing rooms' });
  }
});

// 3. Get single room details with full participant profiles
router.get('/:codeOrId', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { codeOrId } = req.params;

  try {
    let dbQuery = supabaseAdmin.from('rooms').select('*');
    
    // Check if codeOrId is a UUID or a short code
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codeOrId);
    
    if (isUuid) {
      dbQuery = dbQuery.eq('id', codeOrId);
    } else {
      dbQuery = dbQuery.eq('code', codeOrId.toUpperCase());
    }

    const { data: room, error: roomError } = await dbQuery.maybeSingle();

    if (roomError) {
      return res.status(500).json({ error: roomError.message });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Fetch all participants joined with their profiles
    const { data: participants, error: partError } = await supabaseAdmin
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
      .eq('room_id', room.id);

    if (partError) {
      return res.status(500).json({ error: partError.message });
    }

    // Format output
    const formattedParticipants = (participants || []).map((p: any) => ({
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

    return res.json({
      ...room,
      participants: formattedParticipants
    });
  } catch (err) {
    console.error('Get room error:', err);
    return res.status(500).json({ error: 'Internal server error getting room details' });
  }
});

// 4. Join a room by code
router.post('/join', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { code, isSpectator } = req.body;
  const userId = req.profile?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Missing room code' });
  }

  try {
    // Find room by code
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .maybeSingle();

    if (roomError) {
      return res.status(500).json({ error: roomError.message });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status !== 'WAITING' && !isSpectator) {
      return res.status(400).json({ error: 'Match has already started in this room.' });
    }

    // Check count of active players (excluding spectators)
    const { count, error: countError } = await supabaseAdmin
      .from('room_participants')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', room.id)
      .eq('is_spectator', false);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    if (!isSpectator && count && count >= room.max_players) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Register user in participant table (upsert if already there)
    const { error: upsertError } = await supabaseAdmin
      .from('room_participants')
      .upsert({
        room_id: room.id,
        user_id: userId,
        is_host: room.host_id === userId,
        is_ready: room.host_id === userId, // Host is ready by default
        score: 0,
        is_spectator: !!isSpectator
      }, {
        onConflict: 'room_id,user_id'
      });

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    return res.json({ status: 'success', roomId: room.id, code: room.code });
  } catch (err) {
    console.error('Join room error:', err);
    return res.status(500).json({ error: 'Internal server error joining room' });
  }
});

// 5. Leave a room
router.post('/:roomId/leave', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.profile?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Delete the participant row
    const { error: deleteError } = await supabaseAdmin
      .from('room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    // Check if there are any players left
    const { data: remaining, error: queryError } = await supabaseAdmin
      .from('room_participants')
      .select('user_id, is_host')
      .eq('room_id', roomId);

    if (queryError) {
      return res.status(500).json({ error: queryError.message });
    }

    if (remaining.length === 0) {
      // Empty room -> Delete from database
      await supabaseAdmin.from('rooms').delete().eq('id', roomId);
      return res.json({ status: 'success', roomDeleted: true });
    }

    // If host left, reassign host status to another participant
    const hostStillPresent = remaining.some((r) => r.is_host);
    if (!hostStillPresent) {
      const newHostId = remaining[0].user_id;
      
      // Update room host_id
      await supabaseAdmin.from('rooms').update({ host_id: newHostId }).eq('id', roomId);
      
      // Update participant row
      await supabaseAdmin
        .from('room_participants')
        .update({ is_host: true, is_ready: true })
        .eq('room_id', roomId)
        .eq('user_id', newHostId);
    }

    return res.json({ status: 'success', roomDeleted: false });
  } catch (err) {
    console.error('Leave room error:', err);
    return res.status(500).json({ error: 'Internal server error leaving room' });
  }
});

export default router;
