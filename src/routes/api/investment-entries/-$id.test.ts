import { describe, test } from 'vitest';

describe('PATCH /api/investment-entries/$id', () => {
  test.todo('updates amountInvested, units, investedAt, or notes');
  test.todo('returns 404 if entry not found or not owned');
  test.todo('returns 400 for invalid request body');
});

describe('DELETE /api/investment-entries/$id', () => {
  test.todo('deletes entry owned by the user');
  test.todo('returns 404 for invalid id or not owned');
});
