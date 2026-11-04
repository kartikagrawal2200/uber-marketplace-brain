"""Supply forecast per zone.  ALL DATA IS SYNTHETIC.

    supply = idle + incoming - finishing

idle      drivers free in the zone right now (fresh GPS only)
incoming  drivers that will be free in the zone within 15 min (repositioning there, or trips ending there)
finishing queued requests in the zone that will absorb the first free drivers (trips about to start)
"""


def predict_supply(snapshot):
    zones = sorted(snapshot.get("idle", {}))
    return {z: float(snapshot["idle"].get(z, 0)) + float(snapshot.get("incoming", {}).get(z, 0))
               - float(snapshot.get("finishing", {}).get(z, 0)) for z in zones}
