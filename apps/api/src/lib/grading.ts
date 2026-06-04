import vm from 'vm';
import { Question, GradingResult } from '@mind-race/shared';

/**
 * Normalizes input to number if possible.
 */
function parseNumber(val: any): number | null {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const num = parseFloat(val.trim());
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Compares two arrays for element equality (order-independent).
 */
function compareArraysOrderIndependent(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].map(String).sort();
  const sorted2 = [...arr2].map(String).sort();
  return sorted1.every((val, index) => val === sorted2[index]);
}

/**
 * Compares two arrays for exact equality (order-dependent).
 */
function compareArraysOrderDependent(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((val, index) => String(val).trim() === String(arr2[index]).trim());
}

/**
 * Server-side Automated Grading Engine for Mind Race.
 * Supports all 10 question types.
 * 
 * @param question The question object containing categories, body, and correct answers.
 * @param submission The user's submitted answer payload.
 * @returns Promise Resolves to a GradingResult object containing correctness status and explanations.
 */
export async function gradeAnswer(question: Question, submission: any): Promise<GradingResult> {
  const correctAnswer = question.correctAnswer || (question as any).correct_answer;
  const explanation = question.explanation || '';
  
  const needsCorrectAnswer = question.type !== 'MATCHING_QUESTION' && question.type !== 'CODING_QUESTION';
  if (needsCorrectAnswer && (correctAnswer === undefined || correctAnswer === null)) {
    return {
      isCorrect: false,
      score: 0,
      explanation: 'No correct answer configuration found for this question.',
    };
  }

  try {
    switch (question.type) {
      case 'MULTIPLE_CHOICE':
      case 'IMAGE_QUESTION': {
        // User submits option ID (string)
        const userVal = String(submission || '').trim();
        const correctVal = String(correctAnswer || '').trim();
        const isCorrect = userVal.toLowerCase() === correctVal.toLowerCase();
        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
      }

      case 'TRUE_FALSE': {
        // User submits boolean or string ('true' / 'false')
        const userVal = String(submission || '').trim().toLowerCase();
        const correctVal = String(correctAnswer || '').trim().toLowerCase();
        const isCorrect = userVal === correctVal;
        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
      }

      case 'FILL_IN_THE_BLANK': {
        // User submits text string. correctAnswer can be string or array of acceptable strings
        const userVal = String(submission || '').trim().toLowerCase();
        
        let isCorrect = false;
        if (Array.isArray(correctAnswer)) {
          isCorrect = correctAnswer.some(ans => String(ans).trim().toLowerCase() === userVal);
        } else {
          isCorrect = String(correctAnswer).trim().toLowerCase() === userVal;
        }
        
        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
      }

      case 'MULTI_SELECT': {
        // User submits array of option IDs. correctAnswer must be array of option IDs
        const userArr = Array.isArray(submission) ? submission : [];
        const correctArr = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
        const isCorrect = compareArraysOrderIndependent(userArr, correctArr);
        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
      }

      case 'ORDERING_QUESTION': {
        // User submits array of ordered string/IDs. correctAnswer can be array of ordered string/IDs
        const userArr = Array.isArray(submission) ? submission : [];
        const correctArr = Array.isArray(correctAnswer) 
          ? correctAnswer 
          : (question.orderingItems || (question as any).ordering_items || []);
        
        const isCorrect = compareArraysOrderDependent(userArr, correctArr);
        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
      }

      case 'MATCHING_QUESTION': {
        // User submits matching map or array of pairs.
        // correctAnswer can be array of MatchingPair objects: { leftId, rightId }
        const correctPairs = question.matchingPairs || (question as any).matching_pairs || [];
        const expectedMap: { [key: string]: string } = {};
        correctPairs.forEach((pair: any) => {
          expectedMap[pair.leftId] = pair.rightId;
        });

        let isCorrect = true;
        if (Array.isArray(submission)) {
          // Submission formatted as: [{ leftId: 'x', rightId: 'y' }]
          if (submission.length !== correctPairs.length) {
            isCorrect = false;
          } else {
            for (const pair of submission) {
              if (expectedMap[pair.leftId] !== pair.rightId) {
                isCorrect = false;
                break;
              }
            }
          }
        } else if (submission && typeof submission === 'object') {
          // Submission formatted as: { leftId: rightId }
          const userKeys = Object.keys(submission);
          if (userKeys.length !== Object.keys(expectedMap).length) {
            isCorrect = false;
          } else {
            for (const key of userKeys) {
              if (expectedMap[key] !== submission[key]) {
                isCorrect = false;
                break;
              }
            }
          }
        } else {
          isCorrect = false;
        }

        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer: correctPairs };
      }

      case 'CALCULATION_QUESTION': {
        // User submits number. Allowing tolerance epsilon for float rounding
        const userNum = parseNumber(submission);
        const correctNum = parseNumber(correctAnswer);

        if (userNum === null || correctNum === null) {
          return { isCorrect: false, score: 0, explanation, correctAnswer };
        }

        const isCorrect = Math.abs(userNum - correctNum) < 1e-5;
        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
      }

      case 'CIRCUIT_QUESTION': {
        // Circuit questions can represent state selections or specific choice checks
        // We fallback to checking equivalence of submissions, MCQ ID checks, or exact string match
        if (typeof correctAnswer === 'object' && typeof submission === 'object') {
          const isCorrect = JSON.stringify(submission) === JSON.stringify(correctAnswer);
          return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
        }
        const isCorrect = String(submission).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
        return { isCorrect, score: isCorrect ? 100 : 0, explanation, correctAnswer };
      }

      case 'CODING_QUESTION': {
        // User submits function code as string. Runs in Node VM sandbox against test cases.
        const testCases = question.codingTestCases || (question as any).coding_test_cases || [];
        if (testCases.length === 0) {
          return { isCorrect: false, score: 0, explanation: 'Coding question has no test cases configured.', correctAnswer };
        }

        const userCode = String(submission || '');
        let allPassed = true;

        for (const tc of testCases) {
          try {
            const sandbox = {};
            const context = vm.createContext(sandbox);

            // Execute user function code in sandbox
            vm.runInContext(userCode, context, { timeout: 500 });

            // Detect the user's function to execute
            let targetFunc: Function | null = null;
            
            // Look for any declared function in the sandbox
            for (const key of Object.keys(sandbox)) {
              if (typeof (sandbox as any)[key] === 'function') {
                targetFunc = (sandbox as any)[key];
                break;
              }
            }

            if (!targetFunc) {
              allPassed = false;
              break;
            }

            // Parse input arguments. If input is JSON-formatted array, spread it; else pass as single arg.
            let inputArgs: any;
            try {
              inputArgs = JSON.parse(tc.input);
            } catch {
              inputArgs = tc.input;
            }

            const result = Array.isArray(inputArgs) 
              ? targetFunc(...inputArgs) 
              : targetFunc(inputArgs);

            // Compare result with expected output (case-insensitive string trim check or raw JSON match)
            const resultStr = typeof result === 'object' ? JSON.stringify(result) : String(result).trim();
            const expectedStr = String(tc.output).trim();

            if (resultStr.toLowerCase() !== expectedStr.toLowerCase()) {
              allPassed = false;
              break;
            }
          } catch (execErr) {
            allPassed = false;
            break;
          }
        }

        return { isCorrect: allPassed, score: allPassed ? 100 : 0, explanation, correctAnswer: testCases };
      }

      default: {
        return {
          isCorrect: false,
          score: 0,
          explanation: `Unsupported question type: ${question.type}`,
        };
      }
    }
  } catch (err) {
    console.error('Error during automatic grading:', err);
    return {
      isCorrect: false,
      score: 0,
      explanation: 'Internal grading error occurred.',
    };
  }
}
