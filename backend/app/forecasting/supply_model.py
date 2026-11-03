"""Predicted supply per zone.  ALL DATA IS SYNTHETIC."""

def predict_supply(snapshot):
    zones = set(snapshot.get("idle", {})) | set(snapshot.get("incoming", {})) | set(snapshot.get("trips", {}))
    supply = {}
    for z in zones:
        idle = float(snapshot.get("idle", {}).get(z, 0))
        incoming = float(snapshot.get("incoming", {}).get(z, 0))
        finishing = float(snapshot.get("trips", {}).get(z, 0))
        supply[z] = idle + incoming - finishing
    return supply
