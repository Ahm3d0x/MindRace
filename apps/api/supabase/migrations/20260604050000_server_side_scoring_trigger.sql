-- ============================================================
-- Mind Race — Server-Side Scoring Trigger Migration
-- ============================================================

CREATE OR REPLACE FUNCTION update_participant_score()
RETURNS TRIGGER AS $$
DECLARE
  v_room_id uuid;
BEGIN
  -- Get the room_id from the match of this round
  SELECT m.room_id INTO v_room_id
  FROM match_rounds mr
  JOIN matches m ON m.id = mr.match_id
  WHERE mr.id = NEW.round_id;
  
  IF v_room_id IS NOT NULL THEN
    UPDATE room_participants
    SET score = greatest(0, score + NEW.points_earned)
    WHERE room_id = v_room_id AND user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition to execute after points_earned is set/updated
DROP TRIGGER IF EXISTS trg_update_participant_score ON round_answers;
CREATE TRIGGER trg_update_participant_score
  AFTER INSERT OR UPDATE OF points_earned ON round_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_participant_score();
