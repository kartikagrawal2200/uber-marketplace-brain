import re

try:
    from app.agents.base import IDK, Context, Specialist, ToolBox, phrase
except ImportError:
    from .base import IDK, Context, Specialist, ToolBox, phrase

_ZONE = re.compile(r"\bzone\s*[:#]?\s*([A-Za-z0-9_-]+)", re.I)
_DRIVER = re.compile(r"\bdriver\s*(?:id)?\s*[:#]?\s*([A-Za-z0-9_-]*\d[A-Za-z0-9_-]*)", re.I)


class MarketplaceAgent(Specialist):
    name = "marketplace"
    allowed_tools = ("get_zone_forecast",)

    def _answer(self, question: str, ctx: Context, box: ToolBox) -> str:
        m = _ZONE.search(question)
        zone = (m.group(1) if m else None) or ctx.zone
        if not zone:
            return "Which zone would you like to know about?"
        data = box.call("get_zone_forecast", zone_id=zone)
        if not data:
            return f"I don't have a forecast for zone {zone}."
        tmpl = (f"In {data.get('zone', zone)}, forecast demand is {data.get('demand', 0)} "
                f"with {data.get('supply', 0)} drivers (congestion {data.get('congestion', 0)}).")
        return phrase(self.provider, question, data, tmpl)


class EarningsAgent(Specialist):
    name = "earnings"
    allowed_tools = ("get_driver_earnings",)

    def _answer(self, question: str, ctx: Context, box: ToolBox) -> str:
        m = _DRIVER.search(question)
        driver_id = (m.group(1) if m else None) or ctx.driver_id
        if not driver_id:
            return "Please sign in or tell me your driver ID so I can look up your earnings."
        data = box.call("get_driver_earnings", driver_id=driver_id, token=ctx.token)
        if not data:
            return "I couldn't find earnings for that driver ID."
        tmpl = (f"You've earned ₹{data.get('today', 0)} today over {data.get('trips', 0)} trips "
                f"({data.get('hours', 0)} hours online).")
        return phrase(self.provider, question, data, tmpl)


class OnboardingAgent(Specialist):
    name = "onboarding"
    allowed_tools = ("get_onboarding_checklist",)

    def _answer(self, question: str, ctx: Context, box: ToolBox) -> str:
        m = _DRIVER.search(question)
        driver_id = (m.group(1) if m else None) or ctx.driver_id
        if not driver_id:
            return "What's your driver ID? I'll check what steps you have left."
        items = box.call("get_onboarding_checklist", driver_id=driver_id, token=ctx.token)
        if items is None:
            return "I couldn't find your onboarding checklist."
        pending = [it["item"] for it in items if not it.get("done")]
        if not pending:
            return "You're all set and fully approved to drive!"
        tmpl = f"You still need to complete: {', '.join(pending)}."
        return phrase(self.provider, question, items, tmpl)
