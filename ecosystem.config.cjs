module.exports = {
  apps: [
    {
      name: "api",
      script: "./server/index.ts",
      interpreter: "bun",
      instances: "max", // one per CPU core
      exec_mode: "cluster",
      watch: false,
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Graceful reload — waits for in-flight requests to finish
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
    {
      name: "workers",
      script: "./server/worker.ts",
      interpreter: "bun",
      instances: 1, // exactly one worker process
      exec_mode: "fork",
      watch: false,
      env_production: {
        NODE_ENV: "production",
      },
      // Workers can take longer to shut down (finishing a job)
      kill_timeout: 30000,
    },
  ],
};
