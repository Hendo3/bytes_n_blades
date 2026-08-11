#!/usr/bin/env python3
"""Generate the pt-BR chip tables with stable skill IDs."""

from __future__ import annotations

import copy
import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "chip-rates.json"
TARGET = ROOT / "data" / "chip-rates.pt-BR.json"


SKILLS_PT = {
    "Personal Grooming": "Cuidados Pessoais", "Wardrobe & Style": "Roupa & Estilo",
    "Accounting": "Contabilidade", "Anthropology": "Antropologia", "Biology": "Biologia",
    "Botany": "Botânica", "Chemistry": "Química", "Education & Gen. Know": "Educação & Cultura Geral",
    "Expert (pick subject)": "Especialista (escolha um assunto)", "Geology": "Geologia", "History": "História",
    "Know Language (choose)": "Idioma Conhecido (escolha um)", "Mathematics": "Matemática", "Physics": "Física",
    "Programming": "Programação", "Stock Market": "Mercado de Ações", "Wilderness Survival": "Sobrevivência",
    "Zoology": "Zoologia", "Daytimer-Chip": "Daytimer-Chip", "Swimming": "Natação",
    "Archery": "Arquerismo", "Dance": "Dança", "Driving": "Condução", "Fencing": "Esgrima",
    "Handgun": "Armas Curtas", "Heavy Weapons": "Armas Pesadas", "Martial Art (choose type)": "Arte Marcial (escolha um tipo)",
    "Melee": "Armas Brancas", "Motorcycle": "Motocicleta", "Operate Hvy. Machinery": "Operação de Maquinário Pesado",
    "Pilot (Gyro)": "Pilotagem (Giro)", "Pilot (Fixed Wing)": "Pilotagem (Asa Fixa)",
    "Pilot (Dirigible)": "Pilotagem (Dirigível)", "Pilot (Vect. Thrust Vehicle)": "Pilotagem (Veículo de Impulso Vetorial)",
    "Rifle": "Fuzil", "Submachinegun": "Submetralhadora", "Aero Tech": "Aero-Tecnologia",
    "AV Tech": "AV Tecnologia", "Basic Tech": "Tecnologia Básica", "Cryotank Operation": "Operação de Tanques Criogênicos",
    "Cyberdeck Design": "Projeto de Ciberterminal", "CyberTech": "Cibertecnologia", "Demolitions": "Demolições",
    "Disguise": "Disfarce", "Electronics": "Eletrônica", "Elect Security": "Segurança Eletrônica",
    "First Aid": "Primeiros Socorros", "Forgery": "Falsificação", "Gyro Tech": "Giro Tech",
    "Pharmaceuticals": "Medicamentos", "Pick Lock": "Arrombamento", "Pick Pocket": "Punga",
    "Play Instrument": "Tocar Instrumento", "Weaponsmith": "Armeiro", "Techie": "Técnico",
    "Corporate": "Corporativo", "Police": "Policial", "Military": "Militar", "Rocker": "Roqueiro",
    "Secretarial": "Secretariado",
}


SECTION_PT = {
    "attr_mram": "ATR (MRAM)", "int_mram": "INT (MRAM)", "body_aptr": "Corpo (PART)",
    "ref_aptr": "REF (PART)", "tech_aptr": "TEC (PART)", "visual_profiles": "Perfis de Reconhecimento Visual",
}


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", normalized.lower()).strip("_")


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))

    # Stable IDs are language-independent and belong in the EN-US source too.
    for spec in source["data"].values():
        for section in spec["sections"]:
            for item in section["items"]:
                item["id"] = item.get("id") or slug(item["skill"])
    SOURCE.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    result = copy.deepcopy(source)
    result["title"] = "Preços dos Chips de Perícia"
    result["description"] = "Tabelas de preço por nível para chips PART, MRAM e de Reconhecimento Visual."
    result["data"]["aptr"]["label"] = "PART"
    result["data"]["visual_recognition"]["label"] = "Reconhecimento Visual"

    for spec in result["data"].values():
        for section in spec["sections"]:
            section["label"] = SECTION_PT[section["id"]]
            for item in section["items"]:
                item["skill"] = SKILLS_PT[item["skill"]]
                if item.get("note") == "Ref decision":
                    item["note"] = "Decisão do Mestre"
                elif item.get("note") == "3x base profile":
                    item["note"] = "3x o perfil básico"

    TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
