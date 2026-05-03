"""Interactive setup: captures browser request headers and writes browser.json."""
import sys

from ytmusicapi.auth.browser import setup_browser

from spotify_to_ytmusic.core.config import BROWSER_AUTH_FILE
from spotify_to_ytmusic.core.headers_parser import normalize_headers


INSTRUCTIONS = """\
======================================================================
YouTube Music browser authentication
======================================================================

Steps:
  1. Open https://music.youtube.com (logged in).
  2. F12 → Network tab → reload (F5).
  3. Filter for:  /browse  (any /youtubei/v1/... POST request works).
  4. Click the request → Headers panel → 'Request Headers' section.
  5. Select all the headers in that panel and copy them.
  6. Paste below, then press Enter, Ctrl+Z, Enter (Windows)
     or Ctrl+D (Linux/Mac) to finish.
======================================================================
"""


def main() -> None:
    print(INSTRUCTIONS)
    print("Paste headers and press Enter, Ctrl+Z, Enter:")
    raw = sys.stdin.read()
    headers = normalize_headers(raw)
    setup_browser(filepath=BROWSER_AUTH_FILE, headers_raw=headers)
    print(f"\nAuthentication completed. {BROWSER_AUTH_FILE} generated.")


if __name__ == "__main__":
    main()
