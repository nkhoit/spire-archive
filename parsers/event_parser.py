"""Event parser for STS1 decompiled Java source."""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import (
    DEFAULT_LOCALIZATION_DIR,
    DEFAULT_SOURCE_DIR,
    clean_description,
    extract_static_id,
    find_java_files,
    load_localization,
    read_java,
    to_upper_snake,
)

EVENT_ACTS = ["exordium", "city", "beyond", "shrines"]


def parse_events(source_dir: str, localization_dir: str) -> list[dict]:
    loc = load_localization(localization_dir, "events.json")
    events = []
    seen_ids = set()

    for act in EVENT_ACTS:
        act_dir = os.path.join(source_dir, "events", act)
        if not os.path.isdir(act_dir):
            continue
        java_files = find_java_files(act_dir, recursive=False)

        for jf in java_files:
            class_name = os.path.basename(jf).replace(".java", "")
            if class_name.startswith("Abstract"):
                continue

            source = read_java(jf)

            event_id_raw = extract_static_id(source)
            if not event_id_raw:
                event_id_raw = class_name

            event_id = to_upper_snake(event_id_raw)
            if event_id in seen_ids:
                continue
            if "DEPRECATED" in event_id:
                continue
            seen_ids.add(event_id)

            # Localization
            loc_entry = loc.get(event_id_raw, loc.get(class_name, {}))
            name = loc_entry.get("NAME", event_id_raw)
            descriptions = loc_entry.get("DESCRIPTIONS", [])
            options = loc_entry.get("OPTIONS", [])

            # First description = intro text
            intro = clean_description(descriptions[0]) if descriptions else ""

            # Build choices from OPTIONS
            choices = []
            # Options often come in pairs: [label, result_text] or single entries
            # Try to match option labels (OPTIONS[0], OPTIONS[2], etc.) with outcomes
            # Just surface the options as-is
            for opt in options:
                opt_clean = clean_description(opt)
                if opt_clean:
                    choices.append({
                        "option": opt_clean,
                        "description": "",
                        "outcome": "",
                    })

            events.append({
                "id": event_id,
                "name": name,
                "act": act,
                "description": intro,
                "choices": choices,
                "image_url": None,
            })

    events.sort(key=lambda e: e["id"])
    return events


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 events")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    events = parse_events(args.source_dir, args.localization_dir)
    out = json.dumps(events, indent=2, ensure_ascii=False)
    if args.output:
        with open(args.output, "w") as f:
            f.write(out)
    else:
        print(out)
