import { openDatabase, initDatabase } from './db.js';
import { createApp } from './app.js';
import { pathToFileURL } from 'node:url';

export async function startServer() {
  const db = openDatabase();
  await initDatabase(db);
  const port = process.env.PORT || 3000;
  const app = createApp(db);
  return app.listen(port, () => console.log(`NFPL Access Control listening on http://localhost:${port}`));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch(error => { console.error(error); process.exitCode = 1; });
}
