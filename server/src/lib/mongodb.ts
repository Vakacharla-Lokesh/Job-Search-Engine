import mongoose from "mongoose";
import { env } from "@/env";

/**
 * Bun on Windows cannot resolve MongoDB Atlas SRV records — both Mongoose's
 * internal SRV lookup and Node's dns.resolveSrv fail with ECONNREFUSED.
 * nslookup already confirmed the three shard hostnames, so we skip DNS
 * entirely and rewrite the +srv URI to a direct multi-host URI at startup.
 *
 * If the Atlas cluster is reseeded and hostnames change, re-run:
 *   nslookup -type=SRV _mongodb._tcp.main-cluster.ugnu4pk.mongodb.net
 */
function buildDirectUri(srvUri: string): string {
  if (!srvUri.startsWith("mongodb+srv://")) return srvUri;

  const withoutScheme = srvUri.slice("mongodb+srv://".length);
  const atIdx = withoutScheme.indexOf("@");
  const credentials = withoutScheme.slice(0, atIdx);
  const rest = withoutScheme.slice(atIdx + 1);

  const slashIdx = rest.indexOf("/");
  const pathAndQuery = slashIdx !== -1 ? rest.slice(slashIdx) : "/jobengine";

  // Shard hostnames confirmed via nslookup — all on port 27017
  const hosts = [
    "ac-qp9ro7m-shard-00-00.ugnu4pk.mongodb.net:27017",
    "ac-qp9ro7m-shard-00-01.ugnu4pk.mongodb.net:27017",
    "ac-qp9ro7m-shard-00-02.ugnu4pk.mongodb.net:27017",
  ].join(",");

  const separator = pathAndQuery.includes("?") ? "&" : "?";
  return `mongodb://${credentials}@${hosts}${pathAndQuery}${separator}authSource=admin&tls=true`;
}

export async function connectMongoDB(): Promise<void> {
  const uri = buildDirectUri(env.mongoUri);
  console.log("[mongodb] Connecting via direct shard hosts (SRV bypass)");
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    tls: true,
  });
  console.log("MongoDB connected");
}
