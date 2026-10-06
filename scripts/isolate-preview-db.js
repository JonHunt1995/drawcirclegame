import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wranglerPath = path.resolve(__dirname, '../wrangler.jsonc');

let branch =
  process.env.WORKERS_CI_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME;

if (!branch && (process.env.WORKERS_CI === '1' || process.env.CI === 'true')) {
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    // Ignore git failure in detached HEAD or sparse environments
  }
}

console.log(
  `[isolate-preview-db] Detected branch: "${branch || ''}" (WORKERS_CI=${process.env.WORKERS_CI || ''})`
);

const PREVIEW_DB_NAME = 'drawcircle-db-preview';
const PREVIEW_DB_ID = '371f5e9a-d605-4306-a1d3-96180f59c80e';

if (branch && branch !== 'main') {
  console.log(
    `[isolate-preview-db] Non-main branch detected ("${branch}"). Isolating D1 binding to preview database.`
  );
  let content = fs.readFileSync(wranglerPath, 'utf8');

  content = content.replace(
    /"database_name":\s*"drawcircle-db"/g,
    `"database_name": "${PREVIEW_DB_NAME}"`
  );
  content = content.replace(
    /"database_id":\s*"863bb6d3-dbb8-4867-99e6-371620c042aa"/g,
    `"database_id": "${PREVIEW_DB_ID}"`
  );

  fs.writeFileSync(wranglerPath, content, 'utf8');
  console.log('[isolate-preview-db] Successfully updated wrangler.jsonc with preview database ID.');
} else {
  console.log(
    '[isolate-preview-db] Main branch or local build detected. Retaining production database configuration.'
  );
}
