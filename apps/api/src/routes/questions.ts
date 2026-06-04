import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { gradeAnswer } from '../lib/grading';
import { Question } from '@mind-race/shared';

const STATIC_FALLBACK_QUESTIONS: any[] = [
  {
    id: 'q1',
    type: 'MULTIPLE_CHOICE',
    category: 'Science / العلوم',
    body: 'Which element has the highest thermal conductivity of any natural material?\nأي العناصر التالية يمتلك أعلى موصلية حرارية بين المواد الطبيعية؟',
    options: [
      { id: 'a', text: 'Silver / الفضة' },
      { id: 'b', text: 'Copper / النحاس' },
      { id: 'c', text: 'Diamond / الماس' },
      { id: 'd', text: 'Gold / الذهب' }
    ],
    difficulty: 'Medium',
    explanation: 'Diamond has a thermal conductivity five times higher than copper.\nالماس يمتلك موصلية حرارية تفوق النحاس بخمسة أضعاف.',
    correct_answer: 'c',
    rating: 4.8
  },
  {
    id: 'q2',
    type: 'TRUE_FALSE',
    category: 'Physics / الفيزياء',
    body: 'Sound waves travel faster in water than in air.\nتنتقل الموجات الصوتية في الماء بسرعة أكبر من انتقالها في الهواء.',
    difficulty: 'Easy',
    explanation: 'Because water is denser than air, sound travels about 4.3 times faster in it.\nلأن الماء أكثر كثافة من الهواء، ينتقل الصوت فيه بسرعة أكبر بنحو 4.3 أضعاف.',
    correct_answer: 'true',
    rating: 4.5
  },
  {
    id: 'q3',
    type: 'FILL_IN_THE_BLANK',
    category: 'Math / الرياضيات',
    body: 'What is the value of Pi rounded to two decimal places?\nما هي قيمة ثابت بّاي (Pi) مقربة لعددين عشريين؟',
    difficulty: 'Easy',
    explanation: 'Pi is approximately 3.14159..., which rounds to 3.14.\nثابت باي هو تقريباً 3.14159... والذي يقرب إلى 3.14.',
    correct_answer: '3.14',
    rating: 4.2
  },
  {
    id: 'q4',
    type: 'ORDERING_QUESTION',
    category: 'Astronomy / الفلك',
    body: 'Order these planets from closest to farthest from the Sun.\nرتب الكواكب التالية من الأقرب إلى الأبعد عن الشمس.',
    options: [
      { id: '1', text: 'Venus / الزهرة' },
      { id: '2', text: 'Mercury / عطارد' },
      { id: '3', text: 'Mars / المريخ' },
      { id: '4', text: 'Earth / الأرض' }
    ],
    difficulty: 'Medium',
    ordering_items: ['2', '1', '4', '3'],
    explanation: 'Mercury is closest, followed by Venus, Earth, and Mars.\nعطارد هو الأقرب، يليه الزهرة، ثم الأرض، وأخيراً المريخ.',
    rating: 4.6
  },
  {
    id: 'q5',
    type: 'MATCHING_QUESTION',
    category: 'Technology / التقنية',
    body: 'Match the programming terms with their definitions.\nصل المصطلحات البرمجية بالتعريفات المناسبة لها.',
    matching_pairs: [
      { leftId: 'v', leftText: 'Variable / المتغير', rightId: '1', rightText: 'Stores data / يخزن البيانات' },
      { leftId: 'f', leftText: 'Function / الدالة', rightId: '2', rightText: 'Reusable block / كتلة برمجية يعاد استخدامها' },
      { leftId: 'l', leftText: 'Loop / التكرار', rightId: '3', rightText: 'Repeats instructions / يكرر التعليمات البرمجية' }
    ],
    difficulty: 'Medium',
    explanation: 'Variables store data, functions are reusable blocks, and loops repeat instructions.\nالمتغيرات تخزن البيانات، الدوال كتل يعاد استخدامها، والتكرار يكرر الأوامر.',
    rating: 4.7
  },
  {
    id: 'q6',
    type: 'MULTI_SELECT',
    category: 'Math / الرياضيات',
    body: 'Select all of the following numbers that are prime.\nاختر جميع الأعداد الأولية من القائمة التالية.',
    options: [
      { id: 'a', text: '2' },
      { id: 'b', text: '3' },
      { id: 'c', text: '9' },
      { id: 'd', text: '11' }
    ],
    difficulty: 'Medium',
    correct_answer: ['a', 'b', 'd'],
    explanation: '2, 3, and 11 have no divisors other than 1 and themselves. 9 is divisible by 3.\nالأعداد 2 و 3 و 11 لا تقبل القسمة إلا على نفسها وعلى 1. العدد 9 يقبل القسمة على 3.',
    rating: 4.4
  },
  {
    id: 'q7',
    type: 'CALCULATION_QUESTION',
    category: 'Electronics / إلكترونيات',
    body: 'Calculate the current (in Amperes) flowing in a circuit with a 12V voltage source and a 4 Ohm resistor.\nاحسب شدة التيار (بالأمبير) المار في دائرة كهربائية بها مصدر جهد 12 فولت ومقاومة 4 أوم.',
    difficulty: 'Easy',
    explanation: 'Using Ohm\'s law (I = V / R), Current = 12V / 4 Ohms = 3 Amperes.\nباستخدام قانون أوم (ت = جـ / م)، التيار = 12 / 4 = 3 أمبير.',
    correct_answer: '3',
    rating: 4.3
  },
  {
    id: 'q8',
    type: 'CIRCUIT_QUESTION',
    category: 'Electronics / إلكترونيات',
    body: 'What is the equivalent resistance of two 10 Ohm resistors connected in parallel?\nما هي المقاومة المكافئة لمقاومتين قيمة كل منهما 10 أوم متصلتين على التوازي؟',
    options: [
      { id: 'a', text: '20 Ohms / أوم' },
      { id: 'b', text: '5 Ohms / أوم' },
      { id: 'c', text: '10 Ohms / أوم' }
    ],
    difficulty: 'Medium',
    correct_answer: 'b',
    explanation: 'For parallel resistors: R_eq = (R1 * R2) / (R1 + R2) = 100 / 20 = 5 Ohms.\nللمقاومات على التوازي: م المكافئة = (م1 * م2) / (م1 + م2) = 100 / 20 = 5 أوم.',
    rating: 4.5
  },
  {
    id: 'q9',
    type: 'IMAGE_QUESTION',
    category: 'Chemistry / الكيمياء',
    body: 'Identify the chemical compound represented by this hexagonal ring structure.\nتعرف على المركب الكيميائي الممثل بحلقة السداسي العطري الموضحة.',
    imageUrl: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=500&q=80',
    options: [
      { id: 'a', text: 'Cyclohexane / سيكلوهكسان' },
      { id: 'b', text: 'Benzene / بنزين' },
      { id: 'c', text: 'Toluene / تولوين' }
    ],
    difficulty: 'Medium',
    correct_answer: 'b',
    explanation: 'Benzene (C6H6) is represented by a hexagonal ring with a circle or alternating double bonds.\nالبنزين العطري (C6H6) يمثل بحلقة سداسية تحتوي على روابط ثنائية متبادلة.',
    rating: 4.8
  },
  {
    id: 'q10',
    type: 'CODING_QUESTION',
    category: 'Programming / البرمجة',
    body: 'Write a JavaScript function sum(a, b) that returns the sum of both parameters.\nاكتب دالة برمجية بلغة جافا سكربت sum(a, b) تقوم بإعادة مجموع المتغيرين.',
    difficulty: 'Hard',
    coding_test_cases: [
      { input: 'sum(2, 3)', output: '5' }
    ],
    explanation: 'A simple return statement: function sum(a, b) { return a + b; }\nدالة بسيطة تعيد الناتج مباشرة: function sum(a, b) { return a + b; }',
    correct_answer: 'function sum(a, b) {\n  return a + b;\n}',
    rating: 4.9
  }
];

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

// 1.5. Get Daily Challenge questions (deterministic calendar seed)
router.get('/daily', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('*');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!questions || questions.length === 0) {
      // Fallback sample questions
      const fallbackQs = [
        {
          id: 'q1_daily',
          type: 'MULTIPLE_CHOICE',
          category: 'Science / العلوم',
          body: 'Which element has the highest thermal conductivity of any natural material?\nأي العناصر التالية يمتلك أعلى موصلية حرارية بين المواد الطبيعية؟',
          options: [
            { id: 'a', text: 'Silver / الفضة' },
            { id: 'b', text: 'Copper / النحاس' },
            { id: 'c', text: 'Diamond / الماس' },
            { id: 'd', text: 'Gold / الذهب' }
          ],
          difficulty: 'Medium',
          explanation: 'Diamond has a thermal conductivity five times higher than copper.\nالماس يمتلك موصلية حرارية تفوق النحاس بخمسة أضعاف.',
          correct_answer: 'c',
          rating: 4.8
        },
        {
          id: 'q2_daily',
          type: 'TRUE_FALSE',
          category: 'Physics / الفيزياء',
          body: 'Sound waves travel faster in water than in air.\nتنتقل الموجات الصوتية في الماء بسرعة أكبر من انتقالها في الهواء.',
          difficulty: 'Easy',
          explanation: 'Because water is denser than air, sound travels about 4.3 times faster in it.\nلأن الماء أكثر كثافة من الهواء، ينتقل الصوت فيه بسرعة أكبر بنحو 4.3 أضعاف.',
          correct_answer: 'true',
          rating: 4.5
        },
        {
          id: 'q3_daily',
          type: 'FILL_IN_THE_BLANK',
          category: 'Math / الرياضيات',
          body: 'What is the value of Pi rounded to two decimal places?\nما هي قيمة ثابت بّاي (Pi) مقربة لعددين عشريين؟',
          difficulty: 'Easy',
          explanation: 'Pi is approximately 3.14159..., which rounds to 3.14.\nثابت باي هو تقريباً 3.14159... والذي يقرب إلى 3.14.',
          correct_answer: '3.14',
          rating: 4.2
        }
      ];
      return res.json(fallbackQs);
    }

    // Determine deterministic seed based on current date string YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    let seed = 0;
    for (let i = 0; i < todayStr.length; i++) {
      seed += todayStr.charCodeAt(i);
    }

    const dailyQuestions = [];
    const count = questions.length;
    for (let i = 0; i < Math.min(5, count); i++) {
      const index = (seed + i * 7) % count;
      dailyQuestions.push(questions[index]);
    }

    const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
    const sanitized = dailyQuestions.map((q) => sanitizeQuestion(q, isStaff));

    return res.json(sanitized);
  } catch (err) {
    console.error('Daily challenge endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error getting daily challenge' });
  }
});

// 2. Get single question
router.get('/:id', requireAuth as any, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    const staticQ = STATIC_FALLBACK_QUESTIONS.find(q => q.id === id);
    if (!staticQ) {
      return res.status(404).json({ error: 'Question not found' });
    }
    const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
    return res.json(sanitizeQuestion(staticQ, isStaff));
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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) {
    const staticQ = STATIC_FALLBACK_QUESTIONS.find(q => q.id === id);
    if (!staticQ) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const mappedQ: Question = {
      id: staticQ.id,
      type: staticQ.type,
      category: staticQ.category,
      body: staticQ.body,
      imageUrl: staticQ.imageUrl,
      options: staticQ.options,
      correctAnswer: staticQ.correct_answer,
      orderingItems: staticQ.ordering_items,
      matchingPairs: staticQ.matching_pairs,
      codingTestCases: staticQ.coding_test_cases,
      difficulty: staticQ.difficulty,
      rating: staticQ.rating,
      explanation: staticQ.explanation,
      createdAt: new Date()
    };

    try {
      const gradingResult = await gradeAnswer(mappedQ, answer);
      const isStaff = !!(req.profile?.isAdmin || req.profile?.isTeacher);
      if (!isStaff) {
        delete gradingResult.correctAnswer;
      }
      return res.json(gradingResult);
    } catch (e) {
      console.error('Static grading exception:', e);
      return res.status(500).json({ error: 'Internal server error grading fallback question' });
    }
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
