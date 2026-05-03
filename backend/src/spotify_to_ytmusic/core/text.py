"""String utilities shared across the codebase."""
import re
import unicodedata


def normalize(s: str) -> str:
    """Lowercase, strip accents and punctuation. Used for fuzzy comparisons."""
    ascii_only = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^\w\s]", " ", ascii_only).lower().strip()
