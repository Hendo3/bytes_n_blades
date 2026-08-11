#!/usr/bin/env python3
"""Restore the EN-US drug catalog from the Cyberpunk 2020 Corebook."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data" / "drugs.json"


STREET_STOCK = {
    "synthcoke": {
        "name": "SynthCoke",
        "type": "stimulant",
        "strength": "+1",
        "difficulty": 20,
        "price": "1000",
        "duration": "1D6+1 minutes",
        "effects": "Stimulant high; paranoia and psychological addiction",
        "description": "The second-generation synthetic replacement for cocaine. Like the original, its side effects are nasty: paranoia and psychological addiction.",
    },
    "stim": {
        "name": "Stim",
        "type": "stimulant",
        "strength": "+3",
        "difficulty": 10,
        "price": "500",
        "duration": "1D6+1 minutes",
        "effects": "Increases endurance and alertness",
        "description": "Stim increases endurance, allowing the user to stay alert for longer periods. Side effects include mental delusions.",
    },
    "syncomp_15": {
        "name": "Syncomp 15",
        "type": "antidote",
        "strength": "+3",
        "difficulty": 13,
        "price": "650",
        "duration": "1D6+1 turns",
        "effects": "Broad-spectrum antidote",
        "description": "Syncomp is a broad-spectrum poison antidote used to treat nerve and biotoxins. REF is reduced at the rate of 1 point per dose.",
    },
    "speedheal": {
        "name": "Speedheal",
        "type": "healing-drug",
        "strength": "+2",
        "difficulty": 33,
        "price": "1650",
        "duration": "1D6+1 hours",
        "effects": "Enhances natural healing",
        "description": "Speedheal is designed to enhance the natural healing processes. Side effects reduce REF by 1D6/3 for one week after use.",
    },
    "boost": {
        "name": "Boost",
        "type": "int-booster",
        "strength": "+4",
        "difficulty": 12,
        "price": "600",
        "duration": "1D6+1 hours",
        "effects": "Raises INT by +1 temporarily",
        "description": "Boost increases INT by +1 for a 2-7 hour period. A Boost addict who has gained full tolerance can no longer increase INT and must have more Boost within twelve hours or suffer screaming fits and hallucinations.",
    },
    "blue_glass": {
        "name": "Blue Glass",
        "type": "hallucinogenic",
        "strength": "+1",
        "difficulty": 18,
        "price": "900",
        "duration": "1D6+1 minutes",
        "effects": "Hallucinogenic flashout risk",
        "description": "Blue Glass was originally developed as a biological weapon. Under stress, there is a 3 in 10 chance of flashing out and staring blankly at the pretty colors in your mind. Reduce INT by 1 per dose.",
    },
    "smash": {
        "name": "Smash",
        "type": "euphoric",
        "strength": "+1",
        "difficulty": 2,
        "price": "100",
        "duration": "1D6+1 minutes",
        "effects": "Euphoria and party state",
        "description": "Smash is 2020's answer to alcohol. It is yellow, foamy, comes in cans, and makes you loose, happy and ready to party. Withdrawal can trigger suicidal episodes and total catatonia.",
        "pack": "6 pk",
    },
    "dorph": {
        "name": "'Dorph",
        "type": "pain-negation",
        "strength": "+2",
        "difficulty": 5,
        "price": "250",
        "duration": "1D6+1 turns",
        "effects": "Reduces pain, stun and shock",
        "description": "Designed as a combat drug and painkiller, endorphins reduce pain and stress. 'Dorph lets you reduce the effects of stun or shock, but it damages the nervous system: each use adds one extra 1D10 roll; on a 1, the user permanently loses 1 REF.",
    },
    "black_lace": {
        "name": "Black Lace",
        "type": "pain-negation",
        "strength": "+3",
        "difficulty": 13,
        "price": "650",
        "duration": "1D6+1 hours",
        "effects": "Euphoria, adrenal rush and pain invulnerability",
        "description": "A high-powered version of 'Dorph that imparts euphoria, an adrenal rush and invulnerability to pain. CL rises by 2 and the user resists stun or shock. Failed addiction can cause EMP loss and cyberpsychosis.",
    },
}


RISK_RULES = {
    "psychological_addiction": "The character must roll under CL each hour after the last dose. Failure causes extreme anxiety, fear and depression and drives the character to seek more of the drug. Kicking the addiction requires a Very Difficult Endurance check and as much time as the Referee decides.",
    "physiological_addiction": "The character must roll under BT each hour after the last dose. Failure causes intense pain and 2D6 damage each hour until the habit is kicked with a Very Difficult Endurance check.",
    "death": "Each use requires a Death Save with a negative modifier equal to the drug's Strength minus one.",
    "reduced_ref": "Reduces REF by 1 point per dose for the duration; the penalty is cumulative if another dose is taken before the last wears off.",
    "reduced_int": "Reduces INT by 1 point per dose for the duration; the penalty is cumulative if another dose is taken before the last wears off.",
    "tremors": "Causes painful tremors in the hands and face and applies -2 REF.",
    "hallucinations": "Causes hallucinations of colors, voices and strange shapes. As a hallucinogen side effect, the character always has recurring visions at the Referee's discretion.",
    "paranoia": "Causes paranoid delusions. The character must devote all actions to defending against the perceived threat, as decided by the Referee.",
    "delusions": "The character believes false realities and must devote all actions to maintaining the delusion, as decided by the Referee.",
    "sterility": "Causes permanent sterility on a 3 in 10 chance.",
    "carcinogenic": "Has a 3 in 10 chance of causing cancer. If cancer develops, the character takes 1 point of permanent damage unless cured with a Very Difficult Medical Tech check.",
    "psychotic_rage": "May cause a psychotic rage in which the character attacks anyone within range.",
    "aggressive_behavior": "Makes the character irritable and aggressive, with a 5 in 10 chance of starting a fight with the nearest person.",
    "irrational_fear": "Causes irrational fear of everything. The character drops everything and cowers in near catatonia until the drug wears off.",
    "nerve_degeneration": "Causes severe nerve damage and permanently reduces REF by 2.",
}


def main() -> None:
    payload = json.loads(TARGET.read_text(encoding="utf-8"))
    payload["data"]["street_stock"]["items"] = STREET_STOCK
    payload["data"]["street_stock"]["Description"] = "Common street drugs from the Cyberpunk 2020 Corebook."
    payload["data"]["generatorOptions"]["Description"] = "Official drug creation tables transcribed from the Cyberpunk 2020 Corebook."

    risks = payload["data"]["generatorOptions"]["riskOptions"]
    for risk in risks:
        risk["rule"] = RISK_RULES[risk["id"]]

    payload["data"]["generatorOptions"]["warnings"] = [
        "Drugs are dangerous and can permanently damage attributes.",
        "Side effects lower a drug's creation difficulty.",
        "Final street cost is 25 eb per point of final creation difficulty.",
    ]
    TARGET.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
