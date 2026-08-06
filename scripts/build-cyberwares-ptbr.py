#!/usr/bin/env python3
"""Build the pt-BR cyberware catalog without duplicating mechanical data."""

from __future__ import annotations

import copy
import importlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "cyberwares.json"
TARGET = ROOT / "data" / "cyberwares.pt-BR.json"

CATEGORY_NAMES = {
    "Fashionware": "Cibermoda",
    "Cyberware Customisation": "Personalização de Ciberware",
    "NeuralWare": "Equipamento Neural",
    "Implants": "Implantes",
    "Voice Box": "Módulo Vocal",
    "BioWare & Nanotech": "Bioequipamento e Nanotecnologia",
    "Biotech": "Biotecnologia",
    "Bioenhancement Tabs": "Pastilhas de Bioaprimoramento",
    "RNA Memory Tabs": "Pastilhas de Memória RNA",
    "Bodyweapons": "Ciberarmas Corporais",
    "Cyberoptics": "Ciberópticos",
    "Cyberoptics Options": "Opções de Ciberópticos",
    "Cyberaudio": "Ciberáudio",
    "Cyberaudio Options": "Opções de Ciberáudio",
    "Cyberlimbs": "Cibermembros",
    "Cyberlimbs Options": "Opções de Cibermembros",
    "Hands & Feet": "Mãos e Pés",
    "Fingers": "Ciberdedos",
    "Cyberlimbs Builtins": "Instalações Internas",
    "Cyberweapons Builtins": "Ciberarmas de Cibermembro",
    "Linear Frame": "Armações Lineares",
    "Bodyplating": "Blindagem Corporal",
    "Full'Borgs": "Full 'Borgs",
    "Full Borg Options": "Opções de Full 'Borg",
    "Exotic Modifications": "Modificações Exóticas",
    "Exotic Package": "Pacotes Exóticos",
    "Chipware": "Chipware",
    "Behaviour Chips": "Chips de Comportamento",
}

CATEGORY_DESCRIPTIONS = {
    "Fashionware": "Ciberware cosmético e alterações de aparência.",
    "Cyberware Customisation": "Personalização de cromos já existentes.",
    "NeuralWare": "Processadores, amplificadores, conexões e interfaces neurais.",
    "Implants": "Ciberware implantado diretamente no corpo.",
    "Voice Box": "Implantes e opções para voz, garganta e emissão sonora.",
    "BioWare & Nanotech": "Melhorias biológicas, enxertos e nanotecnologia médica.",
    "Biotech": "Alterações biotecnológicas permanentes.",
    "Bioenhancement Tabs": "Bioaprimoramentos temporários em forma de pastilha.",
    "RNA Memory Tabs": "Pastilhas de RNA que concedem perícias temporárias.",
    "Bodyweapons": "Armas implantadas no corpo.",
    "Cyberoptics": "Módulos oculares cibernéticos.",
    "Cyberoptics Options": "Opções instaladas em módulos ciberópticos.",
    "Cyberaudio": "Módulos auditivos cibernéticos.",
    "Cyberaudio Options": "Opções instaladas em módulos de ciberáudio.",
    "Cyberlimbs": "Braços, pernas e outros cibermembros completos.",
    "Cyberlimbs Options": "Reforços, coberturas e modificações para cibermembros.",
    "Hands & Feet": "Mãos e pés conectados a cibermembros.",
    "Fingers": "Ferramentas e dispositivos instalados em ciberdedos.",
    "Cyberlimbs Builtins": "Equipamentos instalados dentro de cibermembros.",
    "Cyberweapons Builtins": "Armas instaladas dentro de cibermembros.",
    "Linear Frame": "Exoesqueletos implantados para ampliar a força.",
    "Bodyplating": "Exoarmaduras implantadas para proteger o corpo.",
    "Full'Borgs": "Conversões integrais para corpos ciborgues.",
    "Full Borg Options": "Aprimoramentos para corpos Full 'Borg.",
    "Exotic Modifications": "Alterações corporais para aparências não humanas.",
    "Exotic Package": "Pacotes completos de modificação exótica.",
    "Chipware": "Chips de reflexo, memória e funções especializadas.",
    "Behaviour Chips": "Chips que alteram personalidade e comportamento.",
}

COMPATIBILITY_NOTES = {
    "Cannot connect to a cybermodem; other Link controls suffer the listed -1 penalty.":
        "Não conecta a cibermodens; os demais controles por Conexão sofrem a penalidade de -1 indicada.",
    "The prehensile leads are the interface cables; no separate cable is required.":
        "Os fios preênseis já são os cabos de interface; nenhum cabo separado é necessário.",
    "Dedicated to Braindance equipment; not a universal connector for Neuralware Links.":
        "Dedicados a equipamento de Braindance; não funcionam como conector universal para Conexões Neurais.",
    "Mag-Duct Spots and Braindance Plugs are not valid cybermodem connectors.":
        "Pontos Mag-Duct e Conectores de Braindance não são conectores válidos para cibermodens.",
    "A cybermodem built into a cyberlimb uses its internal connection and needs no external plug or cable.":
        "Um cibermodem embutido em cibermembro usa a conexão interna e dispensa conector ou cabo externo.",
    "Mag-Duct Spots can carry its other Link functions, but not the cybermodem function.":
        "Pontos Mag-Duct atendem às outras funções da Conexão Universal, mas não à função de cibermodem.",
    "Weapon-only induction interface; external Interface Plugs are not required.":
        "Interface por indução exclusiva para armas; Conectores Neurais externos não são necessários.",
    "Uses the cyberlimb's internal connection; external Interface Plugs and interface cables are not required.":
        "Usa a conexão interna do cibermembro; Conectores Neurais e cabos de interface externos não são necessários.",
    "Braindance Plugs are not a general-purpose recorder connection.":
        "Conectores de Braindance não servem como conexão genérica para gravadores.",
}

SKILL_NAMES = {
    "Culture": "Cultura",
    "General Knowledge": "Conhecimento Geral",
    "Geography": "Geografia",
    "Highrider Culture": "Cultura Highrider",
    "Interaction": "Interação",
    "Language": "Idioma",
    "Perform": "Atuação",
    "Resist Intimidation": "Resistir a Intimidação",
    "Seduction": "Sedução",
    "Space Survival": "Sobrevivência Espacial",
    "Specific Knowledge": "Conhecimento Específico",
}

SCOPES = {
    "EMP-related": "relacionado a EMP",
    "subject profile": "perfil do alvo",
    "3 uses per 24h": "três usos a cada 24 horas",
}

PRICE_NOTES = {
    "APTR price varies by specific skill chip": "O preço APTR varia conforme o chip de perícia específico.",
    "Base V.R. chips cost 100ed per level, up to +3": "Chips R.V. básicos custam 100 eb por nível, até +3.",
    "Chips older than 2 years cost half value": "Chips com mais de dois anos custam metade do valor.",
    "Cost 270ed per level, up to +3": "Custa 270 eb por nível, até +3.",
    "Cost equal to the paired APTR chip": "Custa o mesmo que o chip APTR correspondente.",
    "Cost scales by level, up to +3": "O custo aumenta por nível, até +3.",
    "Cost varies between 50% and 75% of a normal skill chip": "Custa entre 50% e 75% de um chip de perícia normal.",
    "Custos e HL aplicados por sentido adicional": "Custos e PH aplicados por sentido adicional.",
    "Daily/weekly updates charge one-time fee equal to 2.5x normal price": "Atualizações diárias ou semanais cobram uma taxa única de 2,5x o preço normal.",
    "Dedicated update terminal package": "Pacote de terminal dedicado a atualizações.",
    "MRAM price varies by specific skill chip": "O preço MRAM varia conforme o chip de perícia específico.",
    "Military variant costs 3x normal value": "A variante militar custa 3x o valor normal.",
    "Rocker profile uses 100ed per level, max +3": "O perfil Rocker custa 100 eb por nível, até +3.",
    "Secretarial profile uses base value per level, max +3": "O perfil de Secretariado usa o valor-base por nível, até +3.",
    "Techie chip uses base value per level, max +3": "O chip de Técnico usa o valor-base por nível, até +3.",
}


def item_map(category: dict) -> dict:
    for field in ("itens", "items", "list"):
        value = category.get(field)
        if isinstance(value, dict):
            return value
    raise KeyError("categoria sem mapa de itens")


def load_translations() -> dict[tuple[str, str], tuple[str, ...]]:
    combined: dict[tuple[str, str], tuple[str, ...]] = {}
    for number in range(1, 7):
        module = importlib.import_module(f"ptbr.catalog_{number:02d}")
        overlap = set(combined).intersection(module.DATA)
        if overlap:
            raise ValueError(f"traduções duplicadas: {sorted(overlap)}")
        combined.update(module.DATA)
    return combined


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    result = copy.deepcopy(source)
    translations = load_translations()
    expected: set[tuple[str, str]] = set()

    result["$id"] = "./data/cyberwares.pt-BR.json"
    result["title"] = "Lista de Ciberware"
    result["description"] = (
        "Catálogo de ciberware para Cyberpunk 2020, com preços, cirurgia, "
        "Perda de Humanidade e descrições."
    )

    for category_key, category in result["data"].items():
        category["name"] = CATEGORY_NAMES[category_key]
        description_field = "Description" if "Description" in category else "description"
        category[description_field] = CATEGORY_DESCRIPTIONS[category_key]

        for item_key, item in item_map(category).items():
            path = (category_key, item_key)
            expected.add(path)
            try:
                localized = translations[path]
            except KeyError as exc:
                raise KeyError(f"tradução ausente: {category_key}/{item_key}") from exc

            if len(localized) not in (2, 3):
                raise ValueError(f"tradução inválida: {category_key}/{item_key}")
            item["name"], item["description"] = localized[:2]

            source_has_note = "note" in item
            if source_has_note != (len(localized) == 3):
                raise ValueError(f"tradução de nota inconsistente: {category_key}/{item_key}")
            if source_has_note:
                item["note"] = localized[2]

            installation = item.get("installation")
            if isinstance(installation, dict) and "compatibilityNotes" in installation:
                installation["compatibilityNotes"] = [
                    COMPATIBILITY_NOTES[note] for note in installation["compatibilityNotes"]
                ]

            for bonus in item.get("skillBonuses", []):
                if "skill" in bonus:
                    bonus["label"] = SKILL_NAMES[bonus["skill"]]
                if "scope" in bonus:
                    bonus["scopeLabel"] = SCOPES[bonus["scope"]]
            for bonus in item.get("attributeBonuses", []):
                if "scope" in bonus:
                    bonus["scopeLabel"] = SCOPES[bonus["scope"]]
            for modifier in item.get("priceModifiers", []):
                if "note" in modifier:
                    modifier["note"] = PRICE_NOTES[modifier["note"]]

    extra = set(translations).difference(expected)
    if extra:
        raise ValueError(f"traduções sem item correspondente: {sorted(extra)}")
    if set(CATEGORY_NAMES) != set(result["data"]):
        raise ValueError("mapa de nomes de categoria fora de sincronia")
    if set(CATEGORY_DESCRIPTIONS) != set(result["data"]):
        raise ValueError("mapa de descrições de categoria fora de sincronia")

    TARGET.write_text(
        json.dumps(result, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
    )
    print(f"gerado {TARGET.relative_to(ROOT)} com {len(expected)} itens")


if __name__ == "__main__":
    main()
