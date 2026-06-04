import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { gradeAnswer } from '../lib/grading';
import { Question } from '@mind-race/shared';

const router = Router();

/**
 * Sanitizes the question payload to remove answer keys if the user is a player.
 */
function sanitizeQuestion(q: any, isStaff: boolean) {
  if (!q) return q;
  if (!isStaff) {
    const { correct_answer, correctAnswer, coding_test_cases, codingTestCases, ...rest } = q;
    return rest;
  }
  return q;
}

// 1. List questions (filtered by category, difficulty, type)
router.get('/', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { category, difficulty, type } = req.query;

  try {
    let dbQuery = supabaseAdmin.from('questions').select('*');

    if (category) {
      dbQuery = dbQuery.eq('category', String(category));
    }
    if (difficulty) {
      dbQuery = dbQuery.eq('difficulty', String(difficulty));
    }
    if (type) {
      dbQuery = dbQuery.eq('type', String(type));
    }

    const { data: questions, error } = await dbQuery;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
    const sanitized = (questions || []).map((q) => sanitizeQuestion(q, isStaff));

    return res.json(sanitized);
  } catch (err) {
    console.error('List questions endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error listing questions' });
  }
});

// 2. Get single question
router.get('/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Question not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
    return res.json(sanitizeQuestion(question, isStaff));
  } catch (err) {
    console.error('Get question endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error getting question' });
  }
});

// 3. Create question (Staff only)
router.post('/', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
  if (!isStaff) {
    return res.status(403).json({ error: 'Forbidden: Only admins or teachers can create questions' });
  }

  const {
    type,
    category,
    body,
    image_url,
    options,
    correct_answer,
    ordering_items,
    matching_pairs,
    coding_test_cases,
    difficulty,
    explanation,
  } = req.body;

  if (!type || !category || !body) {
    return res.status(400).json({ error: 'Missing required fields: type, category, body' });
  }

  try {
    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .insert({
        type,
        category,
        body,
        image_url,
        options,
        correct_answer,
        ordering_items,
        matching_pairs,
        coding_test_cases,
        difficulty: difficulty || 'Medium',
        explanation,
        created_by: req.profile?.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(question);
  } catch (err) {
    console.error('Create question endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error creating question' });
  }
});

// 4. Update question (Staff only)
router.put('/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
  if (!isStaff) {
    return res.status(403).json({ error: 'Forbidden: Only admins or teachers can update questions' });
  }

  const { id } = req.params;
  const updatePayload = req.body;

  try {
    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json(question);
  } catch (err) {
    console.error('Update question endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error updating question' });
  }
});

// 5. Delete question (Staff only)
router.delete('/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
  if (!isStaff) {
    return res.status(403).json({ error: 'Forbidden: Only admins or teachers can delete questions' });
  }

  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin.from('questions').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ status: 'success', message: 'Question deleted successfully' });
  } catch (err) {
    console.error('Delete question endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error deleting question' });
  }
});

// 6. Grade submission for a question
router.post('/:id/grade', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { answer } = req.body;

  if (answer === undefined) {
    return res.status(400).json({ error: 'Missing answer parameter in request body' });
  }

  try {
    const { data: question, error } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Question not found' });
      }
      return res.status(500).json({ error: error.message });
    }

    const gradingResult = await gradeAnswer(question as Question, answer);
    
    // Clean correct answers from result if not staff (standard match rules)
    const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
    if (!isStaff) {
      delete gradingResult.correctAnswer;
    }

    return res.json(gradingResult);
  } catch (err) {
    console.error('Grade question endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error grading question' });
  }
});

export default router;
