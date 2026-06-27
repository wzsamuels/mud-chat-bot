import test from 'node:test';
import assert from 'node:assert/strict';

import MarkovGenerator from '../src/MarkovGenerator.js';

test('updateOrder rejects orders above the safe maximum', () => {
  const generator = new MarkovGenerator(2, 'word');
  const result = generator.updateOrder(100);

  assert.equal(result.success, false);
  assert.match(result.message, /between 1 and 8/i);
});
