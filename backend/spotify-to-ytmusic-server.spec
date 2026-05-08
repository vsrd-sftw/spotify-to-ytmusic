# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec for the spotify-to-ytmusic sidecar (--onefile)."""
import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files

here = Path(SPECPATH).resolve()
src = here / "src"

# ytmusicapi loads gettext .mo translation files at YTMusic() construction
# time. Without these data files the sidecar throws
# FileNotFoundError: No translation file found for domain: 'base'
# the moment any code instantiates YTMusicClient — which the /health
# endpoint does on every request, surfacing as ytmusic:false in the UI
# even with a valid browser.json.
ytmusicapi_data = collect_data_files("ytmusicapi")

a = Analysis(
    [str(src / "spotify_to_ytmusic" / "api" / "sidecar_server.py")],
    pathex=[str(src)],
    binaries=[],
    datas=ytmusicapi_data,
    hiddenimports=[
        "spotify_to_ytmusic",
        "spotify_to_ytmusic.api",
        "spotify_to_ytmusic.api.routes",
        "spotify_to_ytmusic.api.routes.health",
        "spotify_to_ytmusic.api.routes.auth",
        "spotify_to_ytmusic.api.routes.library",
        "spotify_to_ytmusic.api.routes.migrate",
        "spotify_to_ytmusic.api.routes.reports",
        "spotify_to_ytmusic.core",
        "spotify_to_ytmusic.core.config",
        "spotify_to_ytmusic.core.events",
        "spotify_to_ytmusic.core.models",
        "spotify_to_ytmusic.core.migrator",
        "spotify_to_ytmusic.core.spotify_client",
        "spotify_to_ytmusic.core.ytmusic_client",
        "spotify_to_ytmusic.core.track_cache",
        "spotify_to_ytmusic.core.report",
        "spotify_to_ytmusic.core.text",
        "spotify_to_ytmusic.core.headers_parser",
        "fastapi",
        "uvicorn",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "starlette",
        "pydantic",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        "tkinter",
        "matplotlib",
        "numpy",
        "scipy",
        "pandas",
        "PIL",
        "cv2",
        "test",
        "pytest",
        "unittest",
        "pdb",
        "distutils",
        "setuptools",
        "pip",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    a.zipfiles,
    [],
    name="spotify-to-ytmusic-server",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False if sys.platform == "win32" else True,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
