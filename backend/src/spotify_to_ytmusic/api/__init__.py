"""FastAPI application factory."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "tauri://localhost",
    "https://tauri.localhost",
]


def create_app() -> FastAPI:
    app = FastAPI(title="spotify-to-ytmusic API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from spotify_to_ytmusic.api.routes.health import router as health_router
    from spotify_to_ytmusic.api.routes.auth import router as auth_router

    app.include_router(health_router)
    app.include_router(auth_router)

    return app


app = create_app()
