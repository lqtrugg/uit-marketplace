import 'dotenv/config';
import { getDataSource } from '../core/dataSource.js';
import { crawlAndSyncHcmWards } from '../services/hcmLocationService.js';

async function run() {
  const startedAt = Date.now();

  try {
    const result = await crawlAndSyncHcmWards();
    const elapsedMs = Date.now() - startedAt;

    console.log('[HCM_WARDS_SYNC_OK]', {
      sourceUrl: result.sourceUrl,
      crawled: result.crawled,
      total: result.total,
      elapsedMs
    });
  } catch (error) {
    console.error('[HCM_WARDS_SYNC_ERROR]', error);
    process.exitCode = 1;
  } finally {
    try {
      const dataSource = await getDataSource();

      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch (destroyError) {
      console.error('[HCM_WARDS_DATASOURCE_DESTROY_ERROR]', destroyError);
    }
  }
}

run();
