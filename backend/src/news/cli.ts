/** Lance une collecte complète à la main : `npm run ingest`. */
import { getDb } from '../db.js'
import { ingestAll } from './ingest.js'

await ingestAll()
const db = await getDb()
const rows = await db.query<{ kind: string; n: number }>('SELECT kind, count(*)::int AS n FROM news_items GROUP BY kind ORDER BY n DESC')
console.table(rows)
await db.close()
