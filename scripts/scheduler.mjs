#!/usr/bin/env node
// Local scheduler: calls the app's tick endpoint every minute, so rounds run
// on time (charges, draw, payout). Keep it running next to `pnpm dev`.
//
//   pnpm scheduler                         # every minute, against http://127.0.0.1:3000
//   pnpm scheduler --once                  # one tick, then exit
//   pnpm scheduler --once --force <chama>  # sandbox: run that chama's next round now
//   pnpm scheduler --url http://127.0.0.1:3100
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);

const url = (value("url") ?? "http://127.0.0.1:3000") + "/api/cron/tick";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET is missing. Run with: node --env-file=.env scripts/scheduler.mjs");
  process.exit(1);
}

async function tick(force) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(force ? { force } : {}),
    });
    const data = await res.json().catch(() => ({}));
    const time = new Date().toLocaleTimeString();
    if (!res.ok) return console.error(`${time}  ${res.status} ${data.error ?? ""}`);
    if (data.log?.length) for (const line of data.log) console.log(`${time}  ${line}`);
    else console.log(`${time}  nothing due`);
  } catch (error) {
    console.error(`${new Date().toLocaleTimeString()}  couldn't reach ${url}: ${error.message}`);
  }
}

await tick(value("force"));
if (!flag("once")) {
  console.log(`Scheduler running against ${url} every minute. Ctrl+C to stop.`);
  setInterval(() => tick(), 60_000);
}
