"""
Single wrapper around the LLM provider -- currently OpenRouter (OpenAI-
compatible API, gives access to many models through one key). Every other
module goes through generate_text()/generate_json(); if the provider ever
changes again, this is the only file that needs to change.

Default model is a solid, cheap, JSON-mode-capable option. Override via
OPENROUTER_MODEL in .env if you want to try something else -- browse
options at https://openrouter.ai/models (look for "JSON mode" support if
you change it, since generate_json() depends on that).
"""
import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

DEFAULT_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key or api_key.strip() in ("", "your-openrouter-key", "unused-for-now"):
            raise RuntimeError(
                "OPENROUTER_API_KEY is not set to a real key in backend/.env -- "
                "get one at https://openrouter.ai/keys and set it there."
            )
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
    return _client


def generate_text(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Plain text generation. Raises RuntimeError if OPENROUTER_API_KEY is unset."""
    response = _get_client().chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


def generate_json(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """
    Same as generate_text, but requests JSON-mode output (no markdown
    fences, no preamble). Caller is still responsible for json.loads()-ing
    the result and handling malformed output -- models occasionally don't
    perfectly comply even in JSON mode.
    """
    response = _get_client().chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content