# Data metrics and provenance

> **All data in this project is SYNTHETIC.** It is produced by a seeded simulator (`backend/app/simulator/`). Nothing is real ride-hailing data.

| Parameter | Value |
|---|---|
| Zones | 12 (4 x 3 grid), 7 zone types: residential, office, mall, airport, stadium, hospital, transit hub |
| Time step | 1 tick = 1 simulated minute |
| Drivers | 110 in the evaluation, 110 in the live demo (configurable) |
| Seed | 42 (evaluation and live demo). Training the demand model uses its own seed, 1234 |
| Requests | Poisson, lambda = Base x DayFactor x WeatherFactor x EventFactor x PriceFactor |
| Weather | clear / rain / heavy rain (Markov chain, or forced by an event) |
| Rider patience | 6-12 minutes; a request expires if no driver can reach them in time |
| Fares | invented (40 + 14 per km, times surge), in rupees |

## Not real
No real GPS, trip times, earnings, traffic, weather or users. Zone names are invented labels.

## Where the numbers come from
`python -m app.evaluation.run_eval` (run inside `backend/`) writes `backend/app/evaluation/results.json`:
baseline vs proposed fulfilment, the percentage-point gain, forecast error, fallback counts and 5 extra seeds.
