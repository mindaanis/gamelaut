import { getStore } from '@netlify/blobs';
import { handleDbRequest } from '../../api/dbHandler.ts';
import { createBlobRecordStorage } from '../../api/blobRecordStorage.ts';

/**
 * Shared database for every device, stored in Netlify Blobs (store "gamelaut-db").
 * Teachers download it as CSV files from /api/db/export/<avatars|games|multiplayer>.csv
 */
export default async (req: Request) => {
  const storage = createBlobRecordStorage(getStore({ name: 'gamelaut-db', consistency: 'strong' }));

  const url = new URL(req.url);
  let body: unknown = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.json();
    } catch {
      body = null;
    }
  }

  const res = await handleDbRequest(
    {
      method: req.method,
      path: url.pathname.replace(/^\/api\/db/, ''),
      body,
      teacherPassword: req.headers.get('x-teacher-password'),
      teacherPasswordEnv: process.env.TEACHER_PASSWORD
    },
    storage
  );

  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.contentType, ...(res.headers || {}) }
  });
};

export const config = {
  path: '/api/db/*'
};
