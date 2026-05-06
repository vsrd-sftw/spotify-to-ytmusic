"""Pydantic models for API responses with camelCase serialization."""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class APIBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class HealthResponse(APIBase):
    ok: bool
    spotify: bool
    ytmusic: bool


class AuthUrlResponse(APIBase):
    url: str


class OkResponse(APIBase):
    ok: bool


class ErrorResponse(APIBase):
    message: str
