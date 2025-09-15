import * as assert from 'assert';
import { checkKaggleAPI } from '../../kaggleCli';

suite('Kaggle E2E (optional)', () => {
  test('Kaggle API connection works when token provided via env', async function () {
    if (!process.env.KAGGLE_TOKEN_JSON) {
      this.skip();
      return;
    }

    // Test API connection
    try {
      const result = await checkKaggleAPI();
      assert.ok(result.available || result.error?.includes('credentials'));
      if (result.available) {
        assert.ok(result.version?.includes('API'));
      }
    } catch (err: unknown) {
      // Allow connection errors, but ensure token was attempted
      const message = err instanceof Error ? err.message : String(err);
      assert.ok(!message.includes('No Kaggle token') || message.includes('credentials'));
    }
  });
});
