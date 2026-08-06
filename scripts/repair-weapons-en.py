#!/usr/bin/env python3
"""Restore the firearms catalog from Blackhand's Street Weapons 2020.

The store intentionally covers the book's firearm lanes and basic ammunition,
not its melee, exotic, grenade, mine, or full-borg sections.  This script keeps
that established scope, repairs transcription errors, restores omissions inside
the covered lanes, and assigns language-independent IDs.
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "weapons.json"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", ascii_value.lower()).strip("_")


PATCHES = {
    "Astra Style-6": {
        "concealment": "P",
        "Note": "Ubiquitous Spanish polymer holdout firing 5mm fragmenting plastic rounds.",
    },
    "BudgetArms C-13": {
        "concealment": "P",
        "Note": "Light-duty holdout commonly sold as a 'lady's gun.'",
    },
    "Dai Lung Cybermag 15": {
        "concealment": "P",
        "availability": "C",
        "Note": "Cheap Hong Kong knockoff often carried by boosters and other street trash.",
    },
    "Federated Arms Impact": {
        "ammo_type": ".22",
        "reliability": "VR",
        "Note": "Ten-shot low-caliber pistol with unusually good reliability.",
    },
    "Federated Arms X-22": {
        "ammo_type": "6mm",
        "price": 50,
        "price_max": 150,
        "Note": "Polymer one-shot sold in 13 colors. The 6mm model costs 50-150eb; a .22 caseless version deals 1D6 damage and costs 25-50eb.",
    },
    "Federated Arms X-38": {
        "damage": "2D6",
        "ammo_type": ".38",
        "Note": "Inexpensive .38 caseless automatic.",
    },
    "Towa Manufacturing Type-12 Police Pistol": {
        "Note": "Standard Japanese police sidearm. A smartgun version provides WA +5 and costs 810eb.",
    },
    "Arasaka WSA Autopistol": {
        "Note": "Standard sidearm for Arasaka troops and executives.",
    },
    "BudgetArms C-41": {
        "Note": "Ten-shot high-caliber pistol with good reliability.",
    },
    "CCMMC Goaxing Xiuxi CM-3": {
        "ammo_type": "9mm",
        "Note": "The most powerful handgun civilians may legally own in mainland China; unavailable elsewhere.",
    },
    "Dai Lung Streetmaster": {
        "Note": "Another Dai Lung cheapie, built for the Street.",
    },
    "Federated Arms X-9mm": {
        "Note": "Sturdy sidearm used by state militias in the United States.",
    },
    "Kang Tao Type 97": {
        "Note": "Compact polymer service pistol from Kang Tao.",
    },
    "LeRoi Maxi-10": {
        "Note": "High-capacity 10mm pistol aimed at the professional security market.",
    },
    "Militech Arms Avenger": {
        "Note": "Militech's reliable standard heavy-caliber sidearm.",
    },
    "Sci Fi Starrior 4": {
        "Note": "Flashy four-shot pistol designed for style-conscious buyers.",
    },
    "Sternmeyer P-41 Autoloading Pistol": {
        "Note": "Reliable European autoloading service pistol.",
    },
    "Teen Dreem": {"price": 36},
    "Nova Model 338 Citygun": {
        "Note": "Uses disposable seven-round Ammo Cassettes. Empty cassettes cost 5eb, boxed ammunition costs 15eb, and preloaded cassettes cost 7eb.",
    },
    "Sternmeyer P-35": {
        "Note": "Heavy European police and military autoloader.",
    },
    "Ameritech Magnum": {
        "Note": "Large-frame magnum autoloader built for the American market.",
    },
    "Armalite 44": {
        "Note": "Standard very-heavy handgun from the Cyberpunk 2020 Corebook.",
    },
    "Colt AMT Model 2000": {
        "Note": "Large, powerful autoloader chambered for 12mm caseless ammunition.",
    },
    "Militech .477 Boomer Buster": {
        "accuracy": [1, -1],
        "concealment": ["J", "L"],
    },
    "Federated Arms Tech-Assault II": {
        "Note": "Improved light machine pistol derived from the original Tech-Assault.",
    },
    "Heckler & Koch MPK-9": {
        "Note": "Compact 9mm submachine gun for security and close-protection work.",
    },
    "Militech Mini-Gat Machine Carbine": {
        "Note": "Five-barrel electronic Gatling carbine with a 120-round helical magazine and rechargeable magazine battery.",
    },
    "Setsuko-Arasaka \"PM5\" Sub-Machine Gun": {
        "name": "Setsuko-Arasaka \"PMS\" Sub-Machine Gun",
    },
    "Uzi Miniauto 9": {
        "Note": "All-polymer security weapon with a rotary electric magazine and adjustable trigger.",
    },
    "Beretta 93-R Advanced Submachine Gun": {
        "name": "Beretta M-24 Advanced Submachine Gun",
        "Note": "Standard Interpol SMG with integral smart link and recoil compensator. Smartchipped price is 1250eb.",
    },
    "Heckler & Koch MP-2013": {
        "Note": "Modernized MP-5K design with composite construction and integral suppression.",
    },
    "Malorian Arms Sub-Flechette Gun": {
        "Note": "Fires six penetrators per caseless flechette round. Roll 1D6 penetrator hits; each deals 1D6 damage and treats armor as one-quarter SP.",
    },
    "Militech Viper Submachinegun": {
        "Note": "Special-operations SMG. The optional suppressor costs 150eb and reduces accuracy by 1.",
    },
    "Mustang Arms ARS-5C Submachinegun": {
        "name": "Mustang Arms ARS-5SC Submachinegun",
    },
    "Sten": {
        "price": 200,
        "weapon_range_m": [50, 100],
        "reliability": "ST/UR",
    },
    "Heckler & Koch MPK-11": {
        "Note": "Compact 12mm heavy submachine gun built around the proven MPK action.",
    },
    "Ingram MAC 14": {
        "Note": "Compact, high-rate heavy submachine gun descended from the classic MAC series.",
    },
    "Sternmeyer SMG-21": {"accuracy": [0, -1]},
    "Arasaka WCAA \"Rapid Assault Shot 12\"": {
        "Note": "Arasaka selective-fire combat shotgun with single-shot and automatic modes.",
    },
    "Constitution Arms Hurricane Assault Weapon": {
        "Note": "Selective-fire assault shotgun with four-round burst and full-auto modes.",
    },
    "Enfield-Ubichi LastChance": {
        "Note": "Compact shotgun intended as a powerful last-resort weapon.",
    },
    "Luigi Franchi P.16": {
        "Note": "Selective-fire combat shotgun with three-round burst and automatic fire.",
    },
    "Military M-12 Close Assault Weapon": {
        "Note": "Military automatic shotgun with a rotary magazine and ammunition selector. Selecting a different loaded round reduces ROF to 1 for that shot.",
    },
    "Militech Bulldog Compact Assault Shotgun": {
        "Note": "Selective-fire 12-gauge combat shotgun with an integral laser pattern indicator. The factory smartgun rig costs 500eb extra.",
    },
    "Militech Crusher SSG": {
        "accuracy": [-1, -3],
        "damage": ["3D6", "1D6+2"],
        "weapon_range_m": [12, 25],
    },
    "Militech Military/Police Shotgun": {
        "accuracy": [0, -1],
        "concealment": ["N", "L"],
        "damage": ["4D6", "5D6"],
        "ammo_type": ["12ga/#00", "10ga/#00"],
        "magazine_capacity": [8, 6],
    },
    "Mustang Arms Close-Control 20": {
        "Note": "Compact 20-gauge bullpup for close quarters, compatible with buckshot, slugs, riot batons, and flechettes.",
    },
    "Mustang Arms \"Raider\" Riot Shotgun": {
        "accuracy": [0, -1],
        "concealment": ["N", "L"],
        "magazine_capacity": [5, 9],
    },
    "Sternmeyer Stakeout 10": {
        "Note": "Light-duty 12-gauge stakeout shotgun used by police and security forces.",
    },
    "Tsunami Arms \"Ragnarok\" Close Assault Weapon": {
        "Note": "Electrothermal close-assault shotgun with dual reciprocating barrels, hydroshock recoil compensation, and stock-mounted batteries.",
    },
    "Arasaka WAA Bullpup Assault Weapon": {
        "magazine_capacity": [5, 15, 30],
    },
    "Darra-Polytechnic M-9 Assault Rifle": {
        "accuracy": [0, -1],
        "concealment": ["N", "L"],
    },
    "FN-RAL Heavy Assault Rifle": {
        "accuracy": [-1, -2],
        "concealment": ["N", "L"],
    },
    "Kalashnikov A-80 Heavy Assault Rifle": {
        "Note": "Rugged heavy assault rifle descended from the Kalashnikov family.",
    },
    "Militech Dragon Light Assault Weapon": {
        "Note": "Compact light assault weapon from Militech's infantry line.",
    },
    "Militech Ronin Light Assault": {
        "Note": "Reliable light assault rifle widely used by corporate and military forces.",
    },
    "Sternmeyer M-95A4 (CG-13R) Assault Weapon": {
        "name": "Sternmeyer M-95A4 (CG-13B) Assault Weapon",
        "price_max": 750,
    },
    "Nomad .357 Magnum Automatic Carbine": {"accuracy": [0, 1]},
    "Nomad \"Personal Weapon\" Derivatives": {
        "damage": ["2D6+3", "4D6+1", "3D6"],
        "ammo_type": ["10mm", "12mm", "5.7mm"],
        "Note": "Current derivatives usually fire 10mm caseless ammunition for 2D6+3 or 12mm caseless ammunition for 4D6+1; older versions use 5.7mm cased rounds for 3D6. The design may be treated as either a heavy SMG or an assault rifle.",
    },
    "FN MG-6 \"One-on-One\"": {
        "Note": "Heavy squad-support weapon designed to dominate a single firing lane.",
    },
    "M2A5HB Browning .50cal HMG": {
        "Note": "Modernized heavy Browning machine gun using .50-caliber cased ammunition.",
    },
    "M-60D Medium Machine Gun": {
        "Note": "Vehicle and door-gun variant of the classic M-60 medium machine gun.",
    },
    "Sternmeyer M-5A Squad Automatic Weapon": {
        "Note": "European squad automatic weapon built for sustained infantry support fire.",
    },
    "Militech AM-3 \"Anti-Matter Rifle\"": {"accuracy": [0, 1, 0]},
    "Militech RPG-A Grenade Launcher": {
        "Note": "Shoulder-fired rocket-powered grenade launcher widely used in the Central American conflicts.",
    },
    "Rhinemetall EMG-85 Railgun": {
        "name": "Rheinmetall EMG-85 Railgun",
        "cadence_full_auto": 0.5,
    },
    "Wrist Racate": {"name": "Rostovic Wrist Racate"},
    "Tsunami Arms Type-17 Anti-Armor Rifle": {"magazine_capacity": 12},
    "Heavy Handgun & Heavy SMG Ammo Box (100)": {"price": 36},
    "Very Heavy Handgun & Very Heavy SMG Ammo Box (100)": {
        "name": "Very Heavy Handgun Ammo Box (100)",
        "ammo_type": "Very Heavy Handgun",
    },
    "Shotgun shells": {"name": "Shotgun Shells Box (12)"},
}


RESTORED = [
    {
        "name": "Tsunami Express Racegun",
        "type_code": "P",
        "accuracy": 3,
        "concealment": "L",
        "availability": "P",
        "damage": "2D6+3",
        "ammo_type": "5.2mm ET",
        "weapon_range_m": 5,
        "magazine_capacity": 24,
        "cadence_full_auto": 3,
        "reliability": "VR",
        "class": "Medium Handgun",
        "price": 5300,
        "Note": "Competition electrothermal pistol with an integral Zeiss-Nikon COT sight. Ammunition costs 50eb per 50 and the 50-shot battery costs 10eb. A 125eb replacement grip changes concealment to J and WA to +2; the barrel compensator prevents suppression.",
    },
    {
        "name": "Wondernines",
        "type_code": "P",
        "accuracy": 1,
        "concealment": "J",
        "availability": "E",
        "damage": "2D6+1",
        "ammo_type": "9mm",
        "weapon_range_m": 50,
        "magazine_capacity": [15, 20],
        "cadence_full_auto": 2,
        "reliability": "VR",
        "class": "Medium Handgun",
        "price": 250,
        "price_max": 300,
        "Note": "Generic modern 9mm caseless service pistols. Capacity is 14+1D6 rounds and price is 240eb plus 10eb times the same die result.",
    },
    {
        "name": "Assault Rifle Ammo Box (100)",
        "type_code": "AMMO",
        "accuracy": 0,
        "concealment": "-",
        "availability": "E",
        "damage": "N/A",
        "ammo_type": "Assault Rifle",
        "weapon_range_m": 0,
        "magazine_capacity": 100,
        "cadence_full_auto": 0,
        "reliability": "N/A",
        "class": "Ammo",
        "price": 40,
    },
]


def main() -> None:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    weapons = payload.get("weapons")
    if not isinstance(weapons, list):
        raise ValueError("weapons.json does not contain a weapons array")
    if len(weapons) not in {192, 195}:
        raise ValueError(f"unexpected starting weapon count: {len(weapons)}")

    by_name = {weapon["name"]: weapon for weapon in weapons}
    missing_patch_targets = sorted(set(PATCHES) - set(by_name))
    # Idempotence: renamed targets no longer exist after the first successful run.
    renamed_old = {
        old for old, patch in PATCHES.items()
        if patch.get("name") and patch["name"] in by_name
    }
    missing_patch_targets = [name for name in missing_patch_targets if name not in renamed_old]
    if missing_patch_targets:
        raise ValueError(f"patch targets missing: {missing_patch_targets}")

    for old_name, patch in PATCHES.items():
        target = by_name.get(old_name)
        if target is not None:
            target.update(patch)

    current_names = {weapon["name"] for weapon in weapons}
    restored_by_class = {
        "Medium Handgun": [item for item in RESTORED if item["class"] == "Medium Handgun"],
        "Ammo": [item for item in RESTORED if item["class"] == "Ammo"],
    }
    for class_name, additions in restored_by_class.items():
        additions = [item for item in additions if item["name"] not in current_names]
        if not additions:
            continue
        last_index = max(i for i, weapon in enumerate(weapons) if weapon["class"] == class_name)
        weapons[last_index + 1:last_index + 1] = additions
        current_names.update(item["name"] for item in additions)

    seen_ids: set[str] = set()
    for weapon in weapons:
        weapon_id = f"weapon_{slugify(weapon['name'])}"
        if weapon_id in seen_ids:
            raise ValueError(f"duplicate generated weapon ID: {weapon_id}")
        seen_ids.add(weapon_id)
        weapon["id"] = weapon_id

    if len(weapons) != 195:
        raise ValueError(f"unexpected restored weapon count: {len(weapons)}")

    payload.update({
        "$id": "/data/weapons.json",
        "title": "Weapons",
        "description": "Firearms and basic ammunition restored from Blackhand's Street Weapons 2020; the site's established catalog scope is preserved.",
        "version": 1,
        "locale": "en-US",
        "source": "Blackhand's Street Weapons 2020",
    })
    CATALOG_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"restored weapons catalog ({len(weapons)} items)")


if __name__ == "__main__":
    main()
