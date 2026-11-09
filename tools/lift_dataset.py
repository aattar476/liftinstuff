"""Turn a LiftinStuff export (the JSON the app's "Export" makes) into a
queryable dataset:

  liftinstuff.sqlite   tables: workouts, sets, bodyweight; view: top_sets
  csv/*.csv            the same tables as spreadsheets

Standard library only. Used by lift_receiver.py; can also be run by hand on
an export file:  python3 lift_dataset.py liftinstuff-export.json
"""
import csv, datetime as dt, json, os, sqlite3, sys

KG_TO_LB = 2.20462


def weight_lb(ex, s):
    unit = ex.get("wUnit") or ex.get("unit")
    return (s.get("weight") or 0) * (KG_TO_LB if unit == "kg" else 1)


def counts_for_volume(ex):
    return not ex.get("isCardio") and ex.get("unit") not in ("s", "min")


def parse_time(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def local_day(iso):
    """Calendar date on this Mac's clock (an evening workout is still that day)."""
    return parse_time(iso).astimezone().date().isoformat()


def rows(export):
    """Returns (workouts, sets, bodyweight) row lists from an app export."""
    data = export.get("data") or {}
    workouts, sets = [], []
    for w in data.get("workouts") or []:
        if not isinstance(w, dict) or not w.get("startTime"):
            continue
        start, prog = w["startTime"], w.get("program") or {}
        day = local_day(start)
        dur = w.get("durationSec")
        if not dur and w.get("totalDuration"):
            dur = w["totalDuration"] * 60
        if not dur and w.get("endTime"):
            dur = (parse_time(w["endTime"]) - parse_time(start)).total_seconds()
        vol, done_sets = 0.0, 0
        for order, ex in enumerate(w.get("exercises") or [], 1):
            unit = ex.get("unit")
            per_side, per_hand = bool(ex.get("perSide")), bool(ex.get("perHand"))
            timed = unit == "min" or (ex.get("isCardio") and unit != "s")
            for n, s in enumerate(ex.get("sets") or [], 1):
                done, wl = bool(s.get("done")), weight_lb(ex, s)
                if done:
                    done_sets += 1
                    if counts_for_volume(ex):  # same rule as the app's "lb moved"
                        vol += wl * (s.get("reps") or 0) * (2 if per_hand else 1) * (2 if per_side else 1)
                sets.append({
                    "workout_id": w.get("id"), "date": day, "exercise_order": order,
                    "exercise_id": ex.get("exerciseId"), "exercise": ex.get("name"),
                    "equipment": ex.get("equip"), "set_no": n, "done": int(done),
                    "weight": s.get("weight") or 0,
                    "weight_unit": ex.get("wUnit") or ("kg" if unit == "kg" else "lb"),
                    "weight_lb": round(wl, 2),
                    "reps": None if timed or unit == "s" else (s.get("reps") or 0),
                    "seconds": s.get("secs") if unit == "s" else None,
                    "minutes": (s.get("reps") or ex.get("durationMin") or 0) if timed else None,
                    "calories": s.get("calories"),
                    "per_side": int(per_side), "per_hand": int(per_hand),
                    "new_best": int(bool(s.get("pr"))), "skipped": int(bool(ex.get("skipped"))),
                    "exercise_note": ex.get("note") if n == 1 else None,
                })
        workouts.append({
            "id": w.get("id"), "name": w.get("name"), "date": day, "start_time": start,
            "end_time": w.get("endTime"), "duration_min": round(dur / 60, 1) if dur else None,
            "session_id": prog.get("sessionId"), "week": prog.get("weekLabel"), "cycle": prog.get("cycle"),
            "notes": w.get("notes") or None, "volume_lb": round(vol), "sets_done": done_sets,
        })
    bw = [{"date": b["date"], "weight_lb": b.get("weight")}
          for b in data.get("bodyweight") or [] if isinstance(b, dict) and b.get("date")]
    workouts.sort(key=lambda r: r["start_time"])
    sets.sort(key=lambda r: (r["date"], r["workout_id"] or "", r["exercise_order"], r["set_no"]))
    bw.sort(key=lambda r: r["date"])
    return workouts, sets, bw


SCHEMA = """
CREATE TABLE workouts(id TEXT PRIMARY KEY, name TEXT, date TEXT, start_time TEXT, end_time TEXT,
  duration_min REAL, session_id TEXT, week TEXT, cycle INTEGER, notes TEXT, volume_lb REAL, sets_done INTEGER);
CREATE TABLE sets(workout_id TEXT REFERENCES workouts(id), date TEXT, exercise_order INTEGER,
  exercise_id TEXT, exercise TEXT, equipment TEXT, set_no INTEGER, done INTEGER,
  weight REAL, weight_unit TEXT, weight_lb REAL, reps INTEGER, seconds INTEGER, minutes REAL, calories REAL,
  per_side INTEGER, per_hand INTEGER, new_best INTEGER, skipped INTEGER, exercise_note TEXT);
CREATE TABLE bodyweight(date TEXT PRIMARY KEY, weight_lb REAL);
CREATE INDEX sets_by_exercise ON sets(exercise_id, date);
-- Heaviest completed set per exercise per workout (lifts only, not timed work).
CREATE VIEW top_sets AS
  SELECT date, workout_id, exercise_id, exercise, MAX(weight_lb) AS top_lb,
         MAX(weight) AS top_weight, weight_unit, MAX(reps) AS reps
  FROM sets WHERE done = 1 AND weight > 0 AND reps IS NOT NULL GROUP BY workout_id, exercise_id;
"""


def count_workouts(path):
    if not os.path.exists(path):
        return 0
    try:
        con = sqlite3.connect(path)
        n = con.execute("SELECT COUNT(*) FROM workouts").fetchone()[0]
        con.close()
        return n
    except sqlite3.Error:
        return 0


def write_sqlite(path, tables):
    tmp = path + ".tmp"
    if os.path.exists(tmp):
        os.remove(tmp)
    con = sqlite3.connect(tmp)
    con.executescript(SCHEMA)
    for name, rs in tables.items():
        if rs:
            cols = list(rs[0])
            con.executemany(f"INSERT OR REPLACE INTO {name}({','.join(cols)}) VALUES({','.join('?' * len(cols))})",
                            [[r[c] for c in cols] for r in rs])
    con.commit()
    con.close()
    os.replace(tmp, path)  # readers never see a half-written file


def write_csv(folder, tables):
    os.makedirs(folder, exist_ok=True)
    for name, rs in tables.items():
        with open(os.path.join(folder, name + ".csv"), "w", newline="") as f:
            if rs:
                wr = csv.DictWriter(f, fieldnames=list(rs[0]))
                wr.writeheader()
                wr.writerows(rs)


def build(export, folder):
    """Rebuilds the dataset in `folder`. Returns the row counts."""
    workouts, sets, bw = rows(export)
    tables = {"workouts": workouts, "sets": sets, "bodyweight": bw}
    write_sqlite(os.path.join(folder, "liftinstuff.sqlite"), tables)
    write_csv(os.path.join(folder, "csv"), tables)
    return {"workouts": len(workouts), "sets": len(sets), "bodyweight": len(bw)}


if __name__ == "__main__":
    with open(sys.argv[1]) as f:
        print(build(json.load(f), os.path.dirname(os.path.abspath(__file__))))
