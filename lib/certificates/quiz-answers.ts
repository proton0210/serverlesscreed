/**
 * Correct option per quest check. Kept on the server so the answers never ship in the
 * page bundle; /api/dynamodb/check-answer grades against this map.
 */
export const QUIZ_ANSWERS: Record<string, number> = {
  "quest-1": 1,
  "quest-2": 1,
  "quest-3": 1,
  "quest-4": 1,
  "quest-5": 2,
  "quest-6": 2,
  "quest-7": 1,
  "quest-8": 2,
  "quest-expressions": 1,
  "quest-9": 2,
  "quest-10": 1,
  "quest-11": 1,
  "quest-12": 2,
  "quest-13": 3,
  "quest-14": 2,
  "quest-15": 2,
  "quest-16": 2,
};

/** Learn CDK checks, graded by /api/cdk/check-answer. */
export const CDK_QUIZ_ANSWERS: Record<string, number> = {
  "quest-1": 2,
  "quest-2": 0,
  "quest-3": 3,
  "quest-4": 1,
  "quest-5": 2,
  "quest-6": 3,
  "quest-7": 0,
  "quest-8": 1,
  "quest-9": 3,
  "quest-10": 0,
  "quest-11": 2,
  "quest-12": 1,
};

/** Learn S3 checks, graded by /api/s3/check-answer. */
export const S3_QUIZ_ANSWERS: Record<string, number> = {
  "quest-1": 1,
  "quest-2": 1,
  "quest-3": 1,
  "quest-4": 1,
  "quest-5": 1,
  "quest-6": 2,
  "quest-7": 1,
  "quest-8": 2,
  "quest-9": 1,
  "quest-10": 1,
  "quest-11": 1,
  "quest-12": 2,
};
