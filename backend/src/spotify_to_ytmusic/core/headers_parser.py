"""Parses raw browser request headers pasted by the user."""
import re

_HEADER_LINE = re.compile(r"^[a-zA-Z][a-zA-Z0-9-]*:\s")


def normalize_headers(text: str) -> str:
    """Convert pasted headers (either 'name: value' or alternating-line format)
    into the canonical 'name: value' format expected by ytmusicapi. Pseudo-headers
    (':authority', ':method', ...) and their values are stripped.
    """
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    if _is_standard_format(lines):
        return "\n".join(ln for ln in lines if not ln.startswith(":"))
    return _pair_alternating_lines(lines)


def _is_standard_format(lines: list[str]) -> bool:
    first_real = next((ln for ln in lines if not ln.startswith(":")), "")
    return bool(_HEADER_LINE.match(first_real))


def _pair_alternating_lines(lines: list[str]) -> str:
    paired = []
    for i in range(0, len(lines) - 1, 2):
        name, value = lines[i], lines[i + 1]
        if name.startswith(":"):
            continue
        paired.append(f"{name}: {value}")
    return "\n".join(paired)
