"""Shared pieces: context, tool recording, strict-grounding helpers."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional

try:
    from app.agents import tools
    from app.auth.auth import AuthError
except ImportError:
    try:
        from . import tools
        from ..auth.auth import AuthError
    except ImportError:
        import tools
        from auth import AuthError

IDK = "I don't know."

SYSTEM_PROMPT = ("You are a driver-support assistant. Answer ONLY from the JSON facts given. "
                 "Never add numbers, names or advice that are not in the facts. "
                 "If the facts do not answer the question, reply exactly: I don't know.")


@dataclass
class Context:
    driver_id: Optional[str]
    token: Optional[str]
    zone: Optional[str] = None


@dataclass
class AgentResult:
    answer: str
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)


class ToolBox:
    def __init__(self, allowed: Iterable[str]):
        self.allowed = frozenset(allowed)
        self.calls: List[Dict[str, Any]] = []

    def call(self, name: str, **kwargs):
        if name not in self.allowed or name not in tools.TOOLS:
            raise PermissionError(f"tool not allowed: {name}")
        entry = {"tool": name, "args": {k: v for k, v in kwargs.items() if k != "token"}}
        self.calls.append(entry)
        try:
            data = tools.TOOLS[name](**kwargs)
        except AuthError:
            entry.update(ok=False, error="unauthorized")
            raise
        except Exception:
            entry.update(ok=False, error="tool_error")
            return None
        entry.update(ok=True, found=bool(data))
        return data


_NUM = re.compile(r"\d+(?:\.\d+)?")


def _numbers(s: str) -> set:
    s = re.sub(r"(?<=\d),(?=\d{3})", "", s)
    return {round(float(x), 2) for x in _NUM.findall(s)}


def phrase(provider, question: str, data: Any, template: str) -> str:
    facts = json.dumps(data, sort_keys=True, default=str)
    prompt = f"Driver question: {question}\nFacts (JSON): {facts}\nAnswer in at most 3 sentences."
    res = provider.generate(prompt, system=SYSTEM_PROMPT, fallback=template)
    if res.source == "template":
        return template
    if not _numbers(res.text) <= (_numbers(facts) | _numbers(question)):
        return template
    return res.text.strip()


class Specialist:
    name = ""
    allowed_tools: tuple = ()

    def __init__(self, provider):
        self.provider = provider

    def handle(self, question: str, ctx: Context) -> AgentResult:
        box = ToolBox(self.allowed_tools)
        try:
            answer = self._answer(question, ctx, box)
        except AuthError:
            answer = "I can't share that: the request doesn't match your signed-in driver account."
        return AgentResult(answer, box.calls)

    def _answer(self, question: str, ctx: Context, box: ToolBox) -> str:
        raise NotImplementedError
