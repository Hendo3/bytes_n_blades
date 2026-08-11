#!/usr/bin/env python3
"""Generate the pt-BR drug catalog while preserving source mechanics."""

from __future__ import annotations

import copy
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "drugs.json"
TARGET = ROOT / "data" / "drugs.pt-BR.json"


STREET_PT = {
    "synthcoke": ("Sintecoca", "Estimulante", "Euforia estimulante; paranoia e dependência psicológica", "A segunda geração e o substituto sintético da cocaína. Como no original, os efeitos secundários são horríveis: paranoia e dependência psicológica."),
    "stim": ("Stim", "Estimulante", "Aumenta a resistência e o estado de alerta", "Stim aumenta a resistência, permitindo ao usuário permanecer alerta durante longos períodos. Os efeitos secundários são ilusões mentais."),
    "syncomp_15": ("Syncomp 15", "Antídoto", "Antídoto de amplo espectro", "Syncomp é um antídoto para venenos de amplo espectro, usado para tratar os nervos e biotoxinas. Para cada dose é subtraído um ponto de velocidade aos REF."),
    "speedheal": ("Speedheal", "Medicação", "Acelera a recuperação natural", "Speedheal foi projetada para acelerar o processo de recuperação natural. Os efeitos secundários reduzem os REF em 1D6/3 durante uma semana depois de seu uso."),
    "boost": ("Boost", "Amplificador de INT", "Aumenta temporariamente a INT em +1", "Aumenta a INT em +1 durante um período de 2 a 7 horas. Um viciado que tenha desenvolvido tolerância completa não consegue mais aumentar sua INT e deverá consumir mais Boost a cada 12 horas ou sofrer terríveis ataques e alucinações."),
    "blue_glass": ("Blue Glass", "Alucinógeno", "Risco de apagar-se em alucinações", "Blue Glass foi desenvolvida originalmente como arma biológica. Diante do estresse, você terá 3 possibilidades entre 10 de apagar-se e ficar deslumbrado com os desenhos em sua mente. Reduza a INT em 1 ponto por dose."),
    "smash": ("Smash", "Eufórica", "Euforia e estado festivo", "Smash é a resposta do ano 2020 ao álcool. É amarela, espumosa e vem em latas. Você fica despreocupado, feliz e disposto. Quando passa seu efeito, a dependência psicológica pode torná-lo suicida ou provocar catatonia total."),
    "dorph": ("Endorfina", "Supressor de dor", "Reduz a dor, o atordoamento e o choque", "Projetadas como droga de combate e analgésico, as endorfinas reduzem a dor e os efeitos do estresse. Reduzem os efeitos do choque e do atordoamento, mas causam grave dano ao sistema nervoso: a cada uso, jogue 1D10 adicional; num resultado 1, perca 1 ponto de REF permanentemente."),
    "black_lace": ("Black Lace", "Supressor de dor", "Euforia, descarga de adrenalina e invulnerabilidade à dor", "Uma versão muito poderosa da Endorfina que produz euforia, elevação da adrenalina e invulnerabilidade à dor. Seu AuCon se eleva em 2 pontos e você resiste ao atordoamento e ao choque. Um fracasso contra o vício pode causar perda de EMP e ciberpsicose."),
}


TYPE_LABELS = {
    "stimulant": "Estimulante",
    "euphoric": "Eufórica",
    "hallucinogenic": "Alucinógeno",
    "pain-negation": "Supressor de dor",
    "healing-drug": "Medicação",
    "antidote": "Antídoto",
    "int-booster": "Amplificador de INT",
}


EFFECT_LABELS = {
    "increase_ref": "Aumenta os REF em uma quantidade igual à Força da droga",
    "increase_int": "Aumenta a INT em uma quantidade igual à Força da droga",
    "increase_cl": "Aumenta o AuCon em uma quantidade igual à Força da droga",
    "enhanced_perception": "Melhora a Percepção (some a Força aos testes de Atenção)",
    "healing_rate": "Aumenta a recuperação em 1 ponto por ponto de Força",
    "antidote": "Antídoto (+1 ao Teste de Vitalidade por ponto de Força)",
    "increased_endurance": "Aumenta a Resistência (some a Força aos testes de Resistência)",
    "negate_pain": "Analgésico (some a Força ao Teste de Vitalidade contra Atordoamento)",
    "depressant": "Depressivo (subtraia a Força da Atenção)",
    "euphoric": "Eufórico (faz você se sentir bem)",
    "hallucinogenic": "Alucinógeno (faz você ver coisas)",
    "reduce_stun": "Redutor de Atordoamento (some a Força aos Testes de Vitalidade contra Atordoamento)",
    "soporific": "Soporífero (subtraia a Força dos Testes de Vitalidade contra sono)",
    "aphrodesiac": "Afrodisíaco (subtraia a Força para resistir aos testes de Sedução)",
    "contraceptive": "Anticoncepcional (masculino ou feminino)",
    "antibiotic": "Antibiótico (some a Força aos Testes de Vitalidade contra doença)",
}


RISK_PT = {
    "psychological_addiction": ("Dependência Psicológica", "O personagem deve obter um resultado menor que seu AuCon a cada hora desde a última dose. Um fracasso provoca ansiedade, medo e depressão e o impele a buscar mais droga. Superar o vício exige um teste de Resistência Muito Difícil e o tempo decidido pelo Mestre."),
    "physiological_addiction": ("Dependência Fisiológica", "O personagem deve obter, a cada hora desde a última dose, um resultado menor que seu TCO. Um fracasso causa dor intensa e 2D6 de dano por hora até superar o vício com um teste de Resistência Muito Difícil."),
    "death": ("Morte", "Cada uso exige um Teste de Vitalidade contra Morte com modificador negativo igual à Força da droga menos um."),
    "reduced_ref": ("Redução de REF", "Reduz os REF em 1 ponto por dose durante a permanência da droga no organismo; a penalização é cumulativa se outra dose for absorvida antes que a anterior se dissipe."),
    "reduced_int": ("Redução de INT", "Reduz a INT em 1 ponto por dose durante a permanência da droga no organismo; a penalização é cumulativa se outra dose for absorvida antes que a anterior se dissipe."),
    "tremors": ("Tremores", "Causa tremores doloridos nas mãos e no rosto e aplica -2 aos REF."),
    "hallucinations": ("Alucinações", "Causa alucinações de cores, vozes e formas estranhas. Como efeito colateral de um alucinógeno, o personagem sempre terá visões recorrentes a critério do Mestre."),
    "paranoia": ("Paranoia", "Causa ilusões paranoicas. O personagem deve dedicar suas ações a defender-se da ameaça que acredita real, conforme decisão do Mestre."),
    "delusions": ("Ilusões", "O personagem acredita em realidades falsas e deve dedicar suas ações a manter a ilusão, conforme decisão do Mestre."),
    "sterility": ("Esterilidade", "Possui 3 possibilidades em 10 de causar esterilidade permanente."),
    "carcinogenic": ("Cancerígeno", "Possui 3 possibilidades em 10 de causar câncer. Se a doença se desenvolver, o personagem sofre 1 ponto de dano permanente, a menos que consiga uma cura com um teste de Tecnologia Médica Muito Difícil."),
    "psychotic_rage": ("Fúria Psicótica", "Pode fazer o personagem cair numa fúria psicótica e atacar qualquer um ao seu alcance."),
    "aggressive_behavior": ("Comportamento Agressivo", "Torna o personagem irritado e agressivo, com 5 possibilidades em 10 de iniciar uma briga com a pessoa mais próxima."),
    "irrational_fear": ("Medo Irracional", "Faz o personagem ter medo de tudo. Ele larga o que estiver fazendo e se encolhe quase catatônico até o efeito desaparecer."),
    "nerve_degeneration": ("Degeneração Nervosa", "Causa graves danos nervosos e reduz permanentemente os REF em 2."),
}


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    result = copy.deepcopy(source)
    result["title"] = "Catálogo de Drogas"
    result["description"] = "Drogas de rua e opções do sistema de criação do Livro Básico de Cyberpunk 2020."
    result["data"]["street_stock"]["Description"] = "Drogas comuns das ruas no Livro Básico de Cyberpunk 2020."

    for item_id, item in result["data"]["street_stock"]["items"].items():
        name, item_type, effects, description = STREET_PT[item_id]
        item.update(name=name, type=item_type, effects=effects, description=description)
        item["duration"] = (item["duration"]
                            .replace("turns", "turnos")
                            .replace("minutes", "minutos")
                            .replace("hours", "horas"))
        if item_id == "smash":
            item["pack"] = "embalagem com 6"

    options = result["data"]["generatorOptions"]
    options["Description"] = "Tabelas oficiais de criação de drogas transcritas do Livro Básico de Cyberpunk 2020."
    for type_id, entry in options["types"].items():
        entry["label"] = TYPE_LABELS[type_id]
    for entry in options["strengthOptions"]:
        entry["rule"] = "Some a Força da droga ao corpo e à Dificuldade Básica."
    for entry in options["durationOptions"]:
        entry["value"] = entry["value"].replace("turns", "turnos").replace("minutes", "minutos").replace("hours", "horas")
    for entry in options["effectOptions"]:
        entry["label"] = EFFECT_LABELS[entry["id"]]
    for entry in options["riskOptions"]:
        entry["label"], entry["rule"] = RISK_PT[entry["id"]]

    options["formula"]["notes"] = "Efeitos colaterais usam pontos negativos e reduzem a dificuldade; a duração atua como multiplicador."
    options["warnings"] = [
        "Drogas são perigosas e podem danificar atributos permanentemente.",
        "Efeitos colaterais reduzem a dificuldade de criação da droga.",
        "O preço final nas ruas é de 25 eb por ponto da Dificuldade final.",
    ]

    TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
