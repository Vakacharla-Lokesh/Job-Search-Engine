module.exports = {
  apps: [
    {
      name: "api",
      script: "./server/index.ts",
      interpreter: "bun",
      instances: 1,          // ← was "max" — cluster mode is incompatible with Bun
      exec_mode: "fork",     // ← was "cluster" — this is the root cause of all api errors
      watch: false,
      env_development: {
        NODE_ENV: "development",
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      name: "workers",
      script: "./server/worker.ts",
      interpreter: "bun",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      env_development: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
      kill_timeout: 30000,
      // Give BullMQ workers time to finish in-flight jobs before kill
      shutdown_with_message: true,
    },
  ],
};