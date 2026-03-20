// src/scripts/list-webhook-jobs.ts
import { webhookQueue } from "@/lib/redis";
const waiting = await webhookQueue.getWaiting();
console.log(`Webhook jobs waiting: ${waiting.length}`);
console.log(JSON.stringify(waiting[0]?.data, null, 2));
process.exit(0);
