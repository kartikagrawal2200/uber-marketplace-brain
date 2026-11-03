"""LLM provider chain: local Ollama -> Gemini (rotated key) -> rule-based template."""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Optional

try:
    from app.agents.llm.cache import ResponseCache
    from app.agents.llm.key_rotator import KeyRotator
except ImportError:
    from .cache import ResponseCache
    from .key_rotator import KeyRotator


@dataclass
class GenResult:
    text: str
    source: str          # "ollama" | "gemini" | "template"
    cached: bool = False


class GeminiHTTPError(Exception):
    def __init__(self, status: int, body: str = "", retry_after: Optional[float] = None):
        super().__init__(f"gemini http {status}")
        self.status, self.body, self.retry_after = status, body, retry_after


class LLMProvider:
    def __init__(self, *, ollama_url: Optional[str] = None, ollama_model: Optional[str] = None,
                 gemini_model: Optional[str] = None, rotator: Optional[KeyRotator] = None,
                 cache: Optional[ResponseCache] = None, timeout_s: float = 15.0,
                 ollama_backoff_s: float = 60.0):
        self.ollama_url = (ollama_url or os.environ.get("OLLAMA_URL", "http://localhost:11434")).rstrip("/")
        self.ollama_model = ollama_model or os.environ.get("OLLAMA_MODEL", "llama3.2")
        self.gemini_model = gemini_model or os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
        self.rotator = rotator if rotator is not None else KeyRotator.from_env()
        self.cache = cache if cache is not None else ResponseCache()
        self.timeout_s, self.ollama_backoff_s = timeout_s, ollama_backoff_s
        self._ollama_down_until = 0.0

    def generate(self, prompt: str, *, system: str = "", fallback: str) -> GenResult:
        key = self.cache.make_key(f"{self.gemini_model}|{system}", prompt)
        hit = self.cache.get(key)
        if hit:
            return GenResult(hit[0], hit[1], cached=True)

        for source, fn in (("gemini", self._try_gemini), ("ollama", self._try_ollama)):
            text = fn(prompt, system)
            if text:
                self.cache.set(key, text, source)
                return GenResult(text, source)
        return GenResult(fallback, "template")

    def _call_ollama(self, prompt: str, system: str) -> str:
        body = json.dumps({"model": self.ollama_model, "prompt": prompt, "system": system,
                           "stream": False, "options": {"temperature": 0}}).encode()
        req = urllib.request.Request(f"{self.ollama_url}/api/generate", data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=self.timeout_s) as r:
            return json.loads(r.read())["response"]

    def _try_ollama(self, prompt: str, system: str) -> Optional[str]:
        if time.monotonic() < self._ollama_down_until:
            return None
        try:
            text = (self._call_ollama(prompt, system) or "").strip()
            return text or None
        except Exception:
            self._ollama_down_until = time.monotonic() + self.ollama_backoff_s
            return None

    def _call_gemini(self, key: str, prompt: str, system: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent"
        payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                   "generationConfig": {"temperature": 0, "maxOutputTokens": 400}}
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={
            "Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=self.timeout_s) as r:
                data = json.loads(r.read())
        except urllib.error.HTTPError as e:
            ra = e.headers.get("Retry-After") if e.headers else None
            raise GeminiHTTPError(e.code, e.read().decode(errors="replace")[:300],
                                  float(ra) if ra and ra.isdigit() else None)
        parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts") or []
        return "".join(p.get("text", "") for p in parts)

    def _try_gemini(self, prompt: str, system: str) -> Optional[str]:
        for _ in range(min(len(self.rotator), 4)):
            key = self.rotator.acquire()
            if key is None:
                return None
            try:
                text = self._call_gemini(key, prompt, system).strip()
            except GeminiHTTPError as e:
                if e.status == 429:
                    self.rotator.report_rate_limited(key, e.retry_after)
                elif e.status in (401, 403) or (e.status == 400 and "API_KEY_INVALID" in e.body):
                    self.rotator.report_invalid(key)
                elif e.status >= 500:
                    self.rotator.report_error(key)
                else:
                    return None
                continue
            except Exception:
                self.rotator.report_error(key)
                continue
            self.rotator.report_success(key)
            if text:
                return text
        return None
