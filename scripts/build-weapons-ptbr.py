#!/usr/bin/env python3
"""Build the Brazilian Portuguese weapons catalog from the restored EN-US file."""

from __future__ import annotations

import copy
import importlib.util
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "data" / "weapons.json"
OUTPUT_PATH = ROOT / "data" / "weapons.pt-BR.json"
NOTES_PATH = ROOT / "scripts" / "ptbr" / "weapons_notes.py"


CLASS_NAMES = {
    "Light Handgun": "Automáticas Leves",
    "Medium Handgun": "Automáticas Médias",
    "Heavy Handgun": "Automáticas Pesadas",
    "Very Heavy Handgun": "Automáticas Muito Pesadas",
    "Light SMG": "Submetralhadoras Leves",
    "Medium SMG": "Submetralhadoras Médias",
    "Heavy SMG": "Submetralhadoras Pesadas",
    "Shotgun": "Espingardas",
    "Assault Rifle": "Fuzis de Assalto",
    "Sniper Rifle": "Fuzis de Precisão",
    "Other Rifle": "Outros Fuzis",
    "Machinegun": "Metralhadoras",
    "Heavy Weapon": "Armas Pesadas",
    "Ammo": "Munição",
}


# Names printed in the Brazilian Corebook take precedence over adaptations.
OFFICIAL_CORE_NAMES = {
    "weapon_dai_lung_cybermag_15": "Dai Lung Cibermag 15",
    "weapon_dai_lung_streetmaster": "Dai Lung Street Master",
    "weapon_sternmeyer_p_35": "Sternmeyer Type 35",
    "weapon_colt_amt_model_2000": "Colt AMT Modelo 2000",
    "weapon_federated_arms_tech_assault_ii": "Federated Arms Assalto Tecnológico II",
    "weapon_arasaka_wma_minami_10": "Arasaka Minami 10",
    "weapon_militech_ronin_light_assault": "Militech Ronin Assalto Leve",
    "weapon_akr_20_medium_assault": "AKR-20 Assalto Médio",
    "weapon_fn_ral_heavy_assault_rifle": "FN-RAL Fuzil de Assalto Pesado",
    "weapon_kalashnikov_a_80_heavy_assault_rifle": "Kalishnikov A-80 Fuzil de Assalto Pesado",
    "weapon_arasaka_wcaa_rapid_assault_shot_12": "Arasaka Assalto Rápido 12",
    "weapon_barrett_arasaka_light_20": "Barrett-Arasaka Leve 20mm",
    "weapon_militech_scorpion_16_surface_to_air_missile": "Scorpion 16 Lança-Mísseis",
    "weapon_militech_rpg_a_grenade_launcher": "Militech Arms RPG-A",
    "weapon_royal_enfield_ordnance_liquid_propellant_assault_rifle_lpa1": "Royal Enfield Ordnance LPA1 Fuzil de Assalto de Propelente Líquido",
    "weapon_arasaka_wssa_sniper_system": "Sistema de Precisão Arasaka WSSA",
    "weapon_nomad_personal_weapon_derivatives": "Derivados da 'Arma Pessoal' Nomad",
    "weapon_rheinmetall_mauser_mex_cannon": "Canhão MEX Rheinmetall-Mauser",
    "weapon_commercial_grenade_launcher": "Lança-Granadas Comercial",
    "weapon_royal_enfield_ordnance_25mm_cockerill_assault_cannon": "Royal Enfield Ordnance Canhão de Assalto Cockerill 25mm",
    "weapon_light_handgun_light_smg_ammo_box_100": "Caixa de Munição para Automáticas Leves e Submetralhadoras Leves (100)",
    "weapon_medium_handgun_medium_smg_ammo_box_100": "Caixa de Munição para Automáticas Médias e Submetralhadoras Médias (100)",
    "weapon_heavy_handgun_heavy_smg_ammo_box_100": "Caixa de Munição para Automáticas Pesadas e Submetralhadoras Pesadas (100)",
    "weapon_very_heavy_handgun_ammo_box_100": "Caixa de Munição para Automáticas Muito Pesadas (100)",
    "weapon_airgun_pellets_box_100": "Caixa de Chumbinhos para Arma de Ar (100)",
    "weapon_acid_or_drug_pellets_box_100": "Caixa de Chumbinhos de Ácido ou Droga (100)",
    "weapon_needle_rounds_box_100": "Caixa de Projéteis de Agulha (100)",
    "weapon_20mm_cannon_round_each": "Projétil de Canhão 20mm (Unidade)",
    "weapon_flamethrower_reload": "Recarga de Lança-Chamas",
    "weapon_shotgun_shells_box_12": "Caixa de Cartuchos de Espingarda (12)",
    "weapon_assault_rifle_ammo_box_100": "Caixa de Munição para Fuzil de Assalto (100)",
}


NAME_REPLACEMENTS = [
    (r"Heavy Flechette Pistol", "Pistola Pesada de Flechetes"),
    (r"Multi-Ammunition Pistol", "Pistola Multimunição"),
    (r"Autoloading Pistol", "Pistola Autocarregável"),
    (r"Bolt Pistol", "Pistola de Ferrolho"),
    (r"Ramjet Pistol", "Pistola Ramjet"),
    (r"Light Assault Weapon", "Arma de Assalto Leve"),
    (r"Bullpup Assault Weapon", "Arma de Assalto Bullpup"),
    (r"Mini-Grenade Launcher", "Lança-Minigranadas"),
    (r"Anti-Armor Rifle", "Fuzil Antiblindagem"),
    (r"Anti-Matter Rifle", "Fuzil Antimatéria"),
    (r"Automatic Grenade Launcher", "Lança-Granadas Automático"),
    (r"Grenade Launcher", "Lança-Granadas"),
    (r"Surface-To-Air Missile", "Míssil Superfície-Ar"),
    (r"Missile Launcher", "Lançador de Mísseis"),
    (r"Assault Cannon", "Canhão de Assalto"),
    (r"Squad Assault/Automatic Weapon", "Arma de Assalto/Automática de Pelotão"),
    (r"Squad Automatic Weapon", "Arma Automática de Pelotão"),
    (r"Squad Support Weapon", "Arma de Apoio de Pelotão"),
    (r"Advanced Squad Automatic", "Arma Automática Avançada de Pelotão"),
    (r"Crowd Control Weapon", "Arma de Controle de Multidões"),
    (r"Close Assault Weapon", "Arma de Assalto Próximo"),
    (r"Advanced Infantry Combat Weapon", "Arma Avançada de Combate de Infantaria"),
    (r"Advanced Submachine Gun", "Submetralhadora Avançada"),
    (r"Sub-Machine Gun", "Submetralhadora"),
    (r"Submachine Gun", "Submetralhadora"),
    (r"Submachinegun", "Submetralhadora"),
    (r"Machine Pistol", "Pistola-Metralhadora"),
    (r"Machine Carbine", "Carabina-Metralhadora"),
    (r"Medium Machine Gun", "Metralhadora Média"),
    (r"Heavy Assault Rifle", "Fuzil de Assalto Pesado"),
    (r"Assault Rifle", "Fuzil de Assalto"),
    (r"Gyro-Sniper Rifle", "Fuzil de Precisão Girojato"),
    (r"Sniper Rifle", "Fuzil de Precisão"),
    (r"Long Rifle", "Fuzil Longo"),
    (r"Rocket Rifle", "Fuzil-Foguete"),
    (r"Cyborg Rifle", "Fuzil Ciborgue"),
    (r"Ramjet Rifle", "Fuzil Ramjet"),
    (r"Automatic Carbine", "Carabina Automática"),
    (r"Lever-Action Carbine", "Carabina de Alavanca"),
    (r"Lever-Action Rifle", "Fuzil de Alavanca"),
    (r"Bolt-Action Rifle", "Fuzil de Ferrolho"),
    (r"Railgun", "Canhão Eletromagnético"),
    (r"Autocannon", "Canhão Automático"),
    (r"Rifle", "Fuzil"),
    (r"Assault Shotgun", "Espingarda de Assalto"),
    (r"Riot Shotgun", "Espingarda Antimotim"),
    (r"Shotgun", "Espingarda"),
    (r"Police Pistol", "Pistola Policial"),
    (r"Battle Pistol", "Pistola de Combate"),
    (r"Competition Pistol", "Pistola de Competição"),
    (r"Flechette Pistol", "Pistola de Flechetes"),
    (r"Gyrojet Pistol", "Pistola Girojato"),
    (r"Pistol", "Pistola"),
    (r"Revolver", "Revólver"),
    (r"Handcannon", "Canhão de Mão"),
    (r"Autopistol", "Pistola Automática"),
    (r"Autoloader", "Pistola Automática"),
    (r"Sidearm", "Arma Curta"),
    (r"Assault Weapon", "Arma de Assalto"),
    (r"Weapon System", "Sistema de Armas"),
    (r"Light Assault", "Assalto Leve"),
    (r"Medium Assault", "Assalto Médio"),
    (r"Racegun", "Pistola de Competição"),
    (r"Sub-Flechette Gun", "Arma de Subflechetes"),
    (r"Light Mortar", "Morteiro Leve"),
    (r"Flamethrower", "Lança-Chamas"),
    (r"Commercial", "Comercial"),
    (r"Cannon", "Canhão"),
    (r"Under-Barrel MicroMissile Pod", "Pod de Micromíssil Sob o Cano"),
    (r"Wrist Racate", "Racate de Pulso"),
    (r"Liquid Propellant", "de Propelente Líquido"),
    (r"Pump Model", "Modelo por Bombeamento"),
    (r"Drum Model", "Modelo de Tambor"),
    (r"Selective-Fire", "Tiro Seletivo"),
    (r"Camouflaged", "Camuflada"),
    (r"Basic", "Básica"),
    (r"Revised", "Revisada"),
    (r"Disposable", "Descartável"),
    (r"Ammo Box", "Caixa de Munição"),
    (r"Shotgun Shells Box", "Caixa de Cartuchos de Espingarda"),
    (r"Box", "Caixa"),
    (r"Reload", "Recarga"),
    (r"Cannon Round", "Projétil de Canhão"),
    (r"Needle Rounds", "Projéteis de Agulha"),
    (r"Pellets", "Chumbinhos"),
]


def load_notes() -> dict[str, str]:
    spec = importlib.util.spec_from_file_location("weapons_notes", NOTES_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {NOTES_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.NOTES_PT


def localize_name(weapon: dict) -> str:
    weapon_id = weapon["id"]
    if weapon_id in OFFICIAL_CORE_NAMES:
        return OFFICIAL_CORE_NAMES[weapon_id]
    value = weapon["name"]
    for pattern, replacement in NAME_REPLACEMENTS:
        value = re.sub(rf"\b(?:{pattern})\b", replacement, value, flags=re.IGNORECASE)
    return value


def main() -> None:
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    weapons = source.get("weapons", [])
    notes = load_notes()
    expected_note_ids = {weapon["id"] for weapon in weapons if "Note" in weapon}
    missing_notes = sorted(expected_note_ids - set(notes))
    extra_notes = sorted(set(notes) - expected_note_ids)
    if missing_notes or extra_notes:
        raise ValueError(
            f"weapons note memory mismatch; missing={missing_notes}, extra={extra_notes}"
        )

    localized = copy.deepcopy(source)
    localized.update({
        "$id": "/data/weapons.pt-BR.json",
        "title": "Armas",
        "description": "Armas de fogo e munições básicas restauradas a partir de Blackhand's Street Weapons 2020, preservando o recorte estabelecido pelo site.",
        "locale": "pt-BR",
    })

    for weapon in localized["weapons"]:
        weapon["name"] = localize_name(weapon)
        weapon["class"] = CLASS_NAMES[weapon["class"]]
        if "Note" in weapon:
            weapon["Note"] = notes[weapon["id"]]

    OUTPUT_PATH.write_text(
        json.dumps(localized, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"localized weapons catalog ({len(localized['weapons'])} items)")


if __name__ == "__main__":
    main()
