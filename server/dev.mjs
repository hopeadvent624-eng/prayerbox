import { spawn } from "node:child_process";

const commands = [
  { name: "api", command: "node", args: ["server/index.mjs"] },
  { name: "web", command: "npx", args: ["vite"] },
];

const children = commands.map(({ name, command, args }) => {
  const child = spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`);
      process.exitCode = code;
    }
  });
  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit();
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit();
});
