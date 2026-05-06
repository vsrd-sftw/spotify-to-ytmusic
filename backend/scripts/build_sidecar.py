"""Build the spotify-to-ytmusic sidecar binary with PyInstaller.

Produces a ``--onedir`` binary named
``spotify-to-ytmusic-server-{target-triple}`` in
``frontend/src-tauri/binaries/`` for the current platform.

Usage::

    python scripts/build_sidecar.py          # build for the current platform
    python scripts/build_sidecar.py --clean  # remove build/ and dist/ first
"""
import argparse
import platform
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
SPEC_FILE = Path(__file__).resolve().parents[1] / "spotify-to-ytmusic-server.spec"
OUTPUT_DIR = REPO_ROOT / "frontend" / "src-tauri" / "binaries"


def _target_triple() -> str:
    """Return a user-facing target triple used for the binary filename."""
    system = platform.system().lower()
    if system == "windows":
        return "x86_64-pc-windows-msvc"
    if system == "linux":
        return "x86_64-unknown-linux-gnu"
    return f"{platform.machine().lower()}-{system}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the sidecar binary")
    parser.add_argument("--clean", action="store_true", help="Remove build/ and dist/ first")
    args = parser.parse_args()

    target = _target_triple()
    binary_name = f"spotify-to-ytmusic-server-{target}"
    if platform.system().lower() == "windows":
        binary_name += ".exe"

    if args.clean:
        for d in ("build", "dist"):
            p = Path(d)
            if p.exists():
                shutil.rmtree(p)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        str(SPEC_FILE),
        "--distpath",
        str(Path("dist")),
        "--workpath",
        str(Path("build")),
    ]
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(REPO_ROOT / "backend"))
    if result.returncode != 0:
        print("PyInstaller failed", file=sys.stderr)
        sys.exit(result.returncode)

    source = REPO_ROOT / "backend" / "dist" / "spotify-to-ytmusic-server" / f"spotify-to-ytmusic-server{'.exe' if platform.system().lower() == 'windows' else ''}"
    dest = OUTPUT_DIR / binary_name

    if not source.exists():
        print(f"Expected binary not found: {source}", file=sys.stderr)
        sys.exit(1)

    shutil.copy2(source, dest)
    print(f"Sidecar binary written to {dest}")
    print(f"Size: {dest.stat().st_size / (1024 * 1024):.1f} MB")


if __name__ == "__main__":
    main()
