#!/usr/bin/env python3
"""Capture the four VICE HEAT screenshot scenes at their literal post sizes.

Reads shots.json (name, query, w, h), serves app/ with `node serve.ts`,
and shoots each scene with Playwright Chromium into --out/ as JPEG, lowering
the quality (never below 50) until each file is under 256 KiB. Used by
main.ts only when MAKEFUN_CAPTURE=1; it never runs in the grader.

Usage: python3 capture-shots.py --out <dir> [--port 8091]
"""

import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME_1255 = os.path.expanduser("~/.cache/ms-playwright/chromium-1255/chrome-linux/chrome")
MAX_BYTES = 262144
QUALITY_FLOOR = 50


def wait_for_server(port, timeout=20):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)
    return False


def launch_browser(pw):
    try:
        return pw.chromium.launch(executable_path=CHROME_1255, args=["--no-sandbox"])
    except Exception:
        return pw.chromium.launch(args=["--no-sandbox"])


def shoot(pw, port, shot, out_dir):
    from PIL import Image

    browser = launch_browser(pw)
    try:
        page = browser.new_page(viewport={"width": shot["w"], "height": shot["h"]})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"http://127.0.0.1:{port}/{shot['query']}", wait_until="load")
        page.wait_for_function("window.__shotReady === true", timeout=20000)
        page.wait_for_timeout(400)
        path = os.path.join(out_dir, shot["name"])
        quality = 88
        # Shoot, then prove the file is a whole JPEG before trusting it: a
        # truncated write must be retried here, not discovered at the gate.
        for attempt in range(2):
            while True:
                page.screenshot(path=path, type="jpeg", quality=quality)
                size = os.path.getsize(path)
                if size <= MAX_BYTES or quality <= QUALITY_FLOOR:
                    break
                quality = max(QUALITY_FLOOR, quality - 10)
            try:
                with Image.open(path) as im:
                    im.verify()
                break
            except Exception:
                if attempt == 1:
                    raise
                page.wait_for_timeout(500)
        with Image.open(path) as im:
            dims = im.size
        print(f"{shot['name']}: {dims[0]}x{dims[1]} {size} bytes quality={quality} console_errors={len(errors)}")
        for err in errors[:5]:
            print(f"  console error: {err[:200]}")
        return {"name": shot["name"], "w": dims[0], "h": dims[1], "bytes": size, "quality": quality}
    finally:
        browser.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--port", type=int, default=8091)
    args = parser.parse_args()

    with open(os.path.join(HERE, "shots.json"), encoding="utf-8") as f:
        shots = json.load(f)
    os.makedirs(args.out, exist_ok=True)

    server = subprocess.Popen(
        ["node", "serve.ts", "--port", str(args.port)],
        cwd=HERE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        if not wait_for_server(args.port):
            print("capture-shots.py: serve.ts did not come up", file=sys.stderr)
            return 1
        from playwright.sync_api import sync_playwright

        results = []
        with sync_playwright() as pw:
            for shot in shots:
                results.append(shoot(pw, args.port, shot, args.out))
        bad = [r for r in results if r["bytes"] > MAX_BYTES]
        if bad:
            print(f"capture-shots.py: {len(bad)} shot(s) still over 256 KiB at quality floor", file=sys.stderr)
            return 1
        print(f"capture-shots.py: {len(results)} shots captured to {args.out}")
        return 0
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    raise SystemExit(main())
