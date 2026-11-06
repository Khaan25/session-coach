// Temporary sharing of the synthetic local preview. No publishing or repository synchronization.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { shareOriginOf, startDesignPreview } from "./design-preview.mjs";

async function tunnels() {
  try {
    const response = await fetch("http://127.0.0.1:4040/api/tunnels", {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    return (await response.json()).tunnels ?? [];
  } catch {
    return null;
  }
}

export async function shareDesignPreview() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Share mode is for synthetic development previews only.");
  if ((await tunnels()) !== null)
    throw new Error(
      "An ngrok agent is already running. Stop it before starting share:design so this command can own its tunnel.",
    );
  const appPort = Number(process.env.DESIGN_APP_PORT ?? 3100);
  if (!Number.isInteger(appPort) || appPort < 1025 || appPort > 65535)
    throw new Error("Choose an unprivileged DESIGN_APP_PORT.");
  const target = `http://127.0.0.1:${appPort}`;
  const agent = spawn(
    "ngrok",
    ["http", target, "--log=stdout", "--log-format=json", "--log-level=warn"],
    { stdio: "ignore" },
  );
  let agentError;
  let exited = false;
  let stopping = false;
  let preview;
  agent.once("error", (error) => {
    agentError = error;
  });
  const stop = () => {
    if (stopping) return;
    stopping = true;
    preview?.stop();
    agent.kill("SIGTERM");
  };
  agent.once("exit", () => {
    exited = true;
    if (preview && !stopping) {
      console.error("The sharing tunnel closed. Stopping its local preview.");
      stop();
    }
  });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    let publicOrigin;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (agentError)
        throw new Error("Could not start the installed ngrok command: " + agentError.message);
      if (exited)
        throw new Error(
          "Ngrok exited before a sharing link was created. Check the ngrok account configuration.",
        );
      const active = await tunnels();
      const tunnel = active?.find(
        (item) => item.config?.addr === target && item.public_url?.startsWith("https://"),
      );
      if (tunnel) {
        publicOrigin = shareOriginOf(tunnel.public_url);
        break;
      }
      await new Promise((done) => setTimeout(done, 500));
    }
    if (!publicOrigin) throw new Error("Ngrok did not return a public URL within 30 seconds.");
    preview = await startDesignPreview({ shareOrigin: publicOrigin });
    console.log(
      `\nShare the full preview: ${publicOrigin}/__design/preview?screen=%2F\nDashboard: ${publicOrigin}/__design/preview?screen=%2Fdashboard\nSynthetic shared workspace. Keep this command and this computer running. Ctrl+C closes the tunnel and preview.\n`,
    );
    return { origin: publicOrigin, stop };
  } catch (error) {
    stop();
    throw error;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  shareDesignPreview().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
