#!/usr/bin/env python3
"""Align cyberware dependencies with the fields consumed by Byte & Blades."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


if len(sys.argv) != 4:
    raise SystemExit(
        "usage: finalize_installation_data.py CYBERWARE_JSON SCHEMA_JSON EQUIPMENT_JSON"
    )

cyberware_path = Path(sys.argv[1])
schema_path = Path(sys.argv[2])
equipment_path = Path(sys.argv[3])

data = json.loads(cyberware_path.read_text(encoding="utf-8"))
schema = json.loads(schema_path.read_text(encoding="utf-8"))
equipment = json.loads(equipment_path.read_text(encoding="utf-8"))


def item_map(category: dict[str, Any]) -> dict[str, dict[str, Any]]:
    for field in ("itens", "items", "list"):
        value = category.get(field)
        if isinstance(value, dict):
            return value
    raise KeyError("category has no item map")


items: dict[tuple[str, str], dict[str, Any]] = {}
for category_name, category in data["data"].items():
    for item_key, item in item_map(category).items():
        items[(category_name, item_key)] = item
        item.pop("operation", None)


def get(category: str, key: str) -> dict[str, Any]:
    try:
        return items[(category, key)]
    except KeyError as exc:
        raise KeyError(f"unknown item {category}/{key}") from exc


def item_id(category: str, key: str) -> str:
    item = get(category, key)
    return str(item.get("id") or key)


def unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(str(value) for value in values if str(value).strip()))


def installation(category: str, key: str) -> dict[str, Any]:
    item = get(category, key)
    rule = item.setdefault("installation", {})
    if not isinstance(rule, dict):
        raise TypeError(f"invalid installation at {category}/{key}")
    return rule


def set_requires(category: str, key: str, values: list[str]) -> None:
    installation(category, key)["requires"] = unique(values)


def set_requires_any(category: str, key: str, values: list[str]) -> None:
    installation(category, key)["requiresAny"] = unique(values)


def set_additional_any_groups(
    category: str,
    key: str,
    groups: list[list[str]],
) -> None:
    normalized = [unique(group) for group in groups]
    installation(category, key)["requiresAnyGroups"] = [
        group for group in normalized if group
    ]


def set_notes(category: str, key: str, notes: list[str]) -> None:
    installation(category, key)["compatibilityNotes"] = unique(notes)


processor = item_id("NeuralWare", "neuralware_processor")
interface_cable = "interfaceCables"
interface_plugs = item_id("NeuralWare", "interface_plugs")
mag_duct_spots = item_id("NeuralWare", "mag_duct_spots")
livewires = item_id("NeuralWare", "livewires")
model_100_plugs = item_id("NeuralWare", "model_100_plugs")
braindance_plugs = item_id("NeuralWare", "braindance_plugs")

general_connectors = [
    interface_plugs,
    mag_duct_spots,
    livewires,
    model_100_plugs,
]
cybermodem_connectors = [
    interface_plugs,
    livewires,
    model_100_plugs,
    item_id("Cyberlimbs Builtins", "cybermodem"),
    item_id("Cyberlimbs Builtins", "cellular_cybermodem"),
]

# The cable belongs to the physical connector, not to the neural Link. This
# lets requires/requiresAny express the official alternatives without creating
# a separate operation model that the storefront does not consume.
for connector_key in ("interface_plugs", "mag_duct_spots", "model_100_plugs"):
    set_requires("NeuralWare", connector_key, [processor, interface_cable])
set_requires("NeuralWare", "livewires", [processor])
set_requires("NeuralWare", "braindance_plugs", [processor, interface_cable])

set_notes(
    "NeuralWare",
    "mag_duct_spots",
    ["Cannot connect to a cybermodem; other Link controls suffer the listed -1 penalty."],
)
set_notes(
    "NeuralWare",
    "livewires",
    ["The prehensile leads are the interface cables; no separate cable is required."],
)
set_notes(
    "NeuralWare",
    "braindance_plugs",
    ["Dedicated to Braindance equipment; not a universal connector for Neuralware Links."],
)

for link_key in (
    "vehicle_link",
    "smartgun_link",
    "machine_tech_link",
    "dataterm_link",
):
    set_requires("NeuralWare", link_key, [processor])
    set_requires_any("NeuralWare", link_key, general_connectors)

set_requires("NeuralWare", "cybermodem_link", [processor])
set_requires_any("NeuralWare", "cybermodem_link", cybermodem_connectors)
set_notes(
    "NeuralWare",
    "cybermodem_link",
    [
        "Mag-Duct Spots and Braindance Plugs are not valid cybermodem connectors.",
        "A cybermodem built into a cyberlimb uses its internal connection and needs no external plug or cable.",
    ],
)

set_requires("NeuralWare", "universal_link", [processor])
set_requires_any("NeuralWare", "universal_link", general_connectors)
set_notes(
    "NeuralWare",
    "universal_link",
    ["Mag-Duct Spots can carry its other Link functions, but not the cybermodem function."],
)
set_notes(
    "NeuralWare",
    "subdermal_smartgun_link",
    ["Weapon-only induction interface; external Interface Plugs are not required."],
)

# Built-in cybermodems still occupy a cyberlimb slot, while independently
# indicating their processor and Link requirements.
cybermodem_links = [
    item_id("NeuralWare", "cybermodem_link"),
    item_id("NeuralWare", "universal_link"),
]
for builtin_key in ("cybermodem", "cellular_cybermodem"):
    rule = installation("Cyberlimbs Builtins", builtin_key)
    set_requires("Cyberlimbs Builtins", builtin_key, [processor])
    set_additional_any_groups("Cyberlimbs Builtins", builtin_key, [cybermodem_links])
    rule["compatibilityNotes"] = [
        "Uses the cyberlimb's internal connection; external Interface Plugs and interface cables are not required."
    ]

audio_hosts = [
    item_id("Cyberaudio", "cyberaudio"),
    item_id("Cyberaudio", "spectrum_cyberaudio"),
    item_id("Cyberaudio", "soviet_cyberaudio"),
]
recorder_implants = [
    item_id("Implants", "digital_recorder"),
    item_id("Cyberlimbs Builtins", "digital_recorder"),
]

set_requires_any("Cyberaudio Options", "micro_recorder_link", audio_hosts)
set_additional_any_groups(
    "Cyberaudio Options",
    "micro_recorder_link",
    [recorder_implants + general_connectors],
)
set_notes(
    "Cyberaudio Options",
    "micro_recorder_link",
    ["Braindance Plugs are not a general-purpose recorder connection."],
)

set_requires_any("Cyberaudio Options", "digital_recording_link", audio_hosts)
set_additional_any_groups(
    "Cyberaudio Options",
    "digital_recording_link",
    [recorder_implants],
)

set_additional_any_groups(
    "NeuralWare",
    "pacemaker_coprocessor",
    [[item_id("NeuralWare", "cybermodem_link"), item_id("NeuralWare", "universal_link")]],
)
set_additional_any_groups(
    "NeuralWare",
    "cyber_detection_computer",
    [[item_id("NeuralWare", "machine_tech_link"), item_id("NeuralWare", "universal_link")]],
)
set_additional_any_groups(
    "Chipware",
    "navigation_orientation_chip",
    [[item_id("Cyberaudio Options", "phone_splice"), item_id("Cyberaudio Options", "radio_link")]],
)

# Schema additions used by the storefront's real warning model.
installation_schema = schema["definitions"]["item"]["properties"]["installation"]["properties"]
installation_schema["requiresAnyGroups"] = {
    "type": "array",
    "items": {
        "type": "array",
        "minItems": 1,
        "items": {"type": "string"},
        "uniqueItems": True,
    },
}
installation_schema["compatibilityNotes"] = {
    "type": "array",
    "items": {"type": "string"},
    "uniqueItems": True,
}

data["version"] = "1.02"
data["date"] = "2026-08-06"

# Cross-catalog reference integrity. Equipment keys are IDs when no explicit ID
# is present, exactly as the catalog loader treats them.
known_ids = {
    str(item.get("id") or key)
    for (_, key), item in items.items()
}
equipment_data = equipment.get("data", equipment)
for category in equipment_data.values():
    if not isinstance(category, dict):
        continue
    try:
        equipment_items = item_map(category)
    except KeyError:
        continue
    for key, item in equipment_items.items():
        if isinstance(item, dict):
            known_ids.add(str(item.get("id") or key))

canonical_ids = [str(item.get("id") or key) for (_, key), item in items.items()]
duplicates = [value for value, count in Counter(canonical_ids).items() if count > 1]
if duplicates:
    raise ValueError(f"duplicate cyberware IDs: {duplicates}")

reference_count = 0
for (category, key), item in items.items():
    rule = item.get("installation") or {}
    reference_lists = [rule.get("requires", []), rule.get("requiresAny", [])]
    reference_lists.extend(rule.get("requiresAnyGroups", []))
    for references in reference_lists:
        for reference in references:
            reference_count += 1
            if reference not in known_ids:
                raise ValueError(f"broken reference {reference} at {category}/{key}")

if mag_duct_spots in installation("NeuralWare", "cybermodem_link")["requiresAny"]:
    raise ValueError("Cybermodem Link must not accept Mag-Duct Spots")
if braindance_plugs in installation("NeuralWare", "universal_link")["requiresAny"]:
    raise ValueError("Universal Link must not accept Braindance Plugs")

cyberware_path.write_text(
    json.dumps(data, ensure_ascii=False, indent=4) + "\n",
    encoding="utf-8",
)
schema_path.write_text(
    json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

print(
    json.dumps(
        {
            "items": len(items),
            "items_with_installation": sum(
                bool(item.get("installation")) for item in items.values()
            ),
            "dependency_references": reference_count,
            "cross_catalog_ids": len(known_ids),
        }
    )
)
