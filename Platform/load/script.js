import http from "k6/http";
import ws from "k6/ws";
import { check, sleep } from "k6";

const BASE = __ENV.K6_BASE_URL || "http://server:4000";
const WS_BASE = BASE.replace(/^http/, "ws");

const BROWSE_VUS = Number(__ENV.K6_BROWSE_VUS || 200);
const CHAT_VUS = Number(__ENV.K6_CHAT_VUS || 30);
const CHAT_PASSWORD = __ENV.K6_CHAT_PASSWORD || "password123";
const RAMP = __ENV.K6_RAMP || "30s";
const HOLD = __ENV.K6_HOLD || "60s";
const DRAIN = __ENV.K6_DRAIN || "30s";

export const options = {
  scenarios: {
    // Concurrent viewers browsing the public catalog (membership-gated detail
    // views are loaded from the same list endpoints the UI calls).
    browse: {
      executor: "ramping-vus",
      exec: "browse",
      startVUs: 0,
      stages: [
        { duration: RAMP, target: BROWSE_VUS },
        { duration: HOLD, target: BROWSE_VUS },
        { duration: DRAIN, target: 0 },
      ],
      gracefulRampDown: "30s",
    },
    // Concurrent viewers connected to a live stream socket.io room.
    chat: {
      executor: "ramping-vus",
      exec: "chat",
      startVUs: 0,
      stages: [
        { duration: "10s", target: CHAT_VUS },
        { duration: "40s", target: CHAT_VUS },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300", "p(99)<1000"],
    ws_connecting: ["p(95)<500"],
    ws_session_duration: ["p(95)<15000"],
  },
};

export function setup() {
  const email = `k6_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.com`;
  const reg = http.post(
    `${BASE}/api/v1/auth/register`,
    JSON.stringify({ name: "K6 Load Member", email, password: CHAT_PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(reg, { "setup member registered": (r) => r.status === 201 });
  return { email, password: CHAT_PASSWORD };
}

export function browse() {
  const page = Math.floor(Math.random() * 5) + 1;

  const videos = http.get(`${BASE}/api/v1/videos?page=${page}`);
  if (videos.status !== 200) {
    console.log(`BROWSE_VIDEOS status=${videos.status} headers=${JSON.stringify(videos.headers)} body=${videos.body.slice(0, 200)}`);
  }
  check(videos, { "videos list 200": (r) => r.status === 200 });

  const live = http.get(`${BASE}/api/v1/live`);
  check(live, { "live list 200": (r) => r.status === 200 });

  const plans = http.get(`${BASE}/api/v1/subscriptions/plans`);
  check(plans, { "plans 200": (r) => r.status === 200 });

  const health = http.get(`${BASE}/health`);
  check(health, { "health 200": (r) => r.status === 200 });

  sleep(Math.random() * 1.5 + 0.5);
}

let chatSid = "";

export function chat(setupData) {
  const { email, password } = setupData;

  if (!chatSid) {
    const login = http.post(
      `${BASE}/api/v1/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { "Content-Type": "application/json" } },
    );
    check(login, { "chat member login 200": (r) => r.status === 200 });
    if (login.status !== 200) {
      console.log(`LOGIN status=${login.status} body=${login.body.slice(0, 160)}`);
    }
    const sid = login.cookies && login.cookies.sid;
    if (sid && sid[0]) chatSid = sid[0].value;
  }
  if (!chatSid) return;

  let streamId = "demo";
  const live = http.get(`${BASE}/api/v1/live`);
  try {
    const items = live.json("items");
    if (Array.isArray(items) && items.length) streamId = items[0].id;
  } catch {
    // non-JSON response; fall back to the demo room
  }

  let opened = false;
  ws.connect(
    `${WS_BASE}/socket.io/?EIO=4&transport=websocket`,
    { headers: { Cookie: `sid=${chatSid}` } },
    function (socket) {
      socket.on("open", () => {
        opened = true;
      });
      socket.on("message", function (raw) {
        const msg = String(raw);
        if (msg.startsWith("0")) {
          // Engine.IO open -> Socket.IO CONNECT
          socket.send("40");
        } else if (msg.startsWith("40")) {
          // connected -> join the stream room
          socket.send(`42["chat:join","${streamId}"]`);
        } else if (msg === "2") {
          // Engine.IO ping -> pong
          socket.send("3");
        }
      });
      socket.setTimeout(() => socket.close(), 6000);
    },
  );
  check(opened, { "ws socket opened": (o) => o === true });

  sleep(Math.random() * 2 + 1);
}
