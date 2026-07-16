import { db } from "../lib/db/src/index.js";
import { sql } from "drizzle-orm";

const tables = [
  "notifications","ai_messages","ai_conversations",
  "deployment_steps","deployment_logs","deployments",
  "monitoring_alerts","audit_logs","documents","reports",
  "templates","servers","server_groups",
  "org_members","organizations","users",
];

for (const t of tables) {
  await db.execute(sql.raw(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`));
  console.log("✓ Cleared:", t);
}
console.log("All tables cleared.");
process.exit(0);
