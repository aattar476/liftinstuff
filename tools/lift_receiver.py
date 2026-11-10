#!/usr/bin/env python3
"""LiftinStuff receiver: the app sends its full export here after every
workout (over Tailscale), and this keeps a dated copy and rebuilds the
SQLite/CSV dataset (see lift_dataset.py).

Listens on 127.0.0.1:8096 only; `tailscale serve --bg --https=8443 8096`
makes it reachable from your own devices, nowhere else. On top of that,
every request must carry the pairing key (X-Lift-Key header), which is
created on first start in .pairing-key and only shown by --show-key.

  GET  /health   -> {"ok": true} (+ counts when the key is sent)
  POST /ingest   -> body = the app's export JSON (key required)

  python3 lift_receiver.py --show-key   prints the key to paste into the app
"""
import datetime as dt, hmac, json, os, secrets, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import lift_dataset

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "raw")
DB = os.path.join(HERE, "liftinstuff.sqlite")
PORT = int(os.environ.get("LIFT_PORT", "8096"))
MAX_BODY = 25 * 1024 * 1024
KEEP_RAW = 200
KEY_FILE = os.path.join(HERE, ".pairing-key")
ALLOWED_ORIGINS = {"https://aattar476.github.io", "http://127.0.0.1:8095", "http://localhost:8095"}
lock = threading.Lock()


def log(msg):
    print(f"{dt.datetime.now():%Y-%m-%d %H:%M:%S} {msg}", flush=True)


def pairing_key():
    """Reads the key, creating it (owner-only file) the first time."""
    if not os.path.exists(KEY_FILE):
        fd = os.open(KEY_FILE, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as f:
            f.write(secrets.token_urlsafe(24))
    with open(KEY_FILE) as f:
        return f.read().strip()


def last_raw():
    names = sorted(os.listdir(RAW)) if os.path.isdir(RAW) else []
    return names[-1] if names else None


class Handler(BaseHTTPRequestHandler):
    def cors(self):
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Lift-Key")
            # Chrome asks before a public page talks to a private-network address.
            self.send_header("Access-Control-Allow-Private-Network", "true")

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        return hmac.compare_digest((self.headers.get("X-Lift-Key") or "").encode(), KEY.encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.path.rstrip("/") == "/health":
            if not self.authorized():
                return self.reply(200, {"ok": True})
            return self.reply(200, {"ok": True, "workouts": lift_dataset.count_workouts(DB), "last": last_raw()})
        self.reply(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") != "/ingest":
            return self.reply(404, {"error": "not found"})
        if not self.authorized():
            log("Refused an upload without the right pairing key")
            return self.reply(401, {"error": "wrong or missing pairing key"})
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            n = 0
        if not 0 < n <= MAX_BODY:
            return self.reply(413, {"error": "empty or too large"})
        try:
            export = json.loads(self.rfile.read(n))
            if export.get("app") != "LiftinStuff" or not isinstance((export.get("data") or {}).get("workouts"), list):
                raise ValueError("not a LiftinStuff export")
        except (ValueError, AttributeError) as e:
            return self.reply(400, {"error": str(e)})
        with lock:
            os.makedirs(RAW, exist_ok=True)
            stamp = dt.datetime.now().strftime("%Y-%m-%d_%H%M%S")
            with open(os.path.join(RAW, stamp + ".json"), "w") as f:
                json.dump(export, f)
            for old in sorted(os.listdir(RAW))[:-KEEP_RAW]:
                os.remove(os.path.join(RAW, old))
            have, incoming = lift_dataset.count_workouts(DB), len(export["data"]["workouts"])
            # A phone that lost data shouldn't wipe the dataset. The copy is
            # still saved in raw/, so nothing is lost either way.
            if have >= 5 and incoming < have * 0.8:
                log(f"Kept the dataset: phone sent {incoming} workouts, Mac has {have} (saved raw/{stamp}.json)")
                return self.reply(409, {"error": f"Phone has {incoming} workouts but the Mac has {have}; kept the Mac's dataset. The upload was still saved."})
            counts = lift_dataset.build(export, HERE)
        log(f"Ingested {counts}")
        self.reply(200, {"ok": True, **counts})

    def log_message(self, fmt, *args):  # quieter than the default access log
        pass


os.umask(0o077)  # dataset, raw copies and key: readable by you only
KEY = pairing_key()

if __name__ == "__main__":
    if "--show-key" in sys.argv:
        print(KEY)
        sys.exit(0)
    os.makedirs(RAW, exist_ok=True)
    log(f"Listening on 127.0.0.1:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
