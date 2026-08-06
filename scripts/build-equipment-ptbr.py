#!/usr/bin/env python3
"""Generate the pt-BR equipment catalog while preserving source mechanics."""

from __future__ import annotations

import copy
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "equipment.json"
TARGET = ROOT / "data" / "equipment.pt-BR.json"


CATEGORY_PT = {
    "fashion": ("Moda", "Os estilos de roupa de 2020 podem ser reduzidos a cinco manifestações básicas da moda."),
    "tools": ("Ferramentas", "Ferramentas"),
    "personalElectronics": ("Eletrônicos Pessoais", "Eletrônicos Pessoais"),
    "dataSystems": ("Sistemas de Dados", "Sistemas de Dados"),
    "communications": ("Comunicações", "Comunicações"),
    "surveillance": ("Patrulhamento", "Patrulhamento"),
    "entertainment": ("Entretenimento", "Entretenimento"),
    "security": ("Segurança", "Segurança"),
    "medical": ("Medicamentos", "Medicamentos"),
    "furnshing": ("Equipamentos", "Equipamentos"),
    "vehicles": ("Veículos", "Veículos típicos do início do século XXI. Cibercontroles dobram o custo indicado."),
    "lifestyle": ("Estilo de Vida", "Estilo de Vida"),
    "groceries": ("Mantimentos", "Mantimentos"),
    "housing": ("Residência", "Residência"),
}


FASHION_TYPES_PT = {
    "Roupa Normal Elegante": (
        "1x",
        "A roupa padrão das ruas, confeccionada com componentes modulares coloridos. Predominam cintos, casacos, faixas e botas.",
    ),
    "Roupa Esporte": (
        "2x",
        "O equivalente à moda esportiva do século XXI: roupas acolchoadas, com logotipos esportivos ou de Corporações.",
    ),
    "Roupas Formais": (
        "3x",
        "O equivalente ao terno: cores austeras, prendedores de gravata e sapatos de couro legítimo. Lã e outros tecidos naturais são apropriados para Corporativos promissores.",
    ),
    "Alta Costura": (
        "4x",
        "Roupas sofisticadas e caras para as classes superiores, com grifes como Miyake, Si-fui Yan e Anne Calvin.",
    ),
    "Moda Urbana": (
        "2x",
        "Videojaquetas, tecidos que mudam de cor, camuflagem, couro, tachas, logotipos, jeans, saias de couro e botas: o lado mais selvagem da cibermoda.",
    ),
}


ENTERTAINMENT_MODIFIERS_PT = {"Médio": "1x", "Bom": "2x", "Excelente": "3x"}


ITEM_NAMES_PT = {
    "fashion": {
        "pants": "Calças", "top": "Top", "jacket": "Jaqueta", "footwear": "Calçados",
        "accessory": "Joias", "mirrorshades": "Óculos Espelhados",
        "contactlenses": "Lentes de Contato", "glasses": "Óculos",
    },
    "tools": {
        "techscanner": "Tecscanner", "cuttingtorch": "Maçarico", "techToolkit": "Kit de Ferramentas",
        "breakingEnteringTools": "Ferramentas B&E", "eletronicToolkit": "Kit de Ferramentas Eletrônicas",
        "protectiveGoggles": "Óculos de Proteção", "flashtube": "Lanterna", "glowstick": "Bastão de Luz",
        "flashpaint": "Tinta Luminosa", "flashtape": "Fita Luminosa", "rope": "Corda",
        "breathmask": "Máscara de Pintor",
    },
    "personalElectronics": {
        "hologen": "Gerador de Holografia", "videoBoard": "Monitor de Vídeo", "dataChip": "Datachip",
        "logcompass": "Logbússola", "digitalRecorder": "Gravador Digital", "digitalCamera": "Câmera Digital",
        "videoCam": "Vídeo Câmera", "tapePlayer": "Toca-Fitas de Áudio/Vídeo", "tape": "Fita de Vídeo",
        "pocketTV": "TV de Bolso", "chipPlayer": "Reprodutor de Chip Digital", "chip": "Chip Digital de Música",
        "eletricGuitar": "Guitarra Elétrica", "eletronicKeyboard": "Teclado Eletrônico",
        "drumSynthesizer": "Sintetizador de Bateria", "amplifier": "Amplificador",
    },
    "dataSystems": {
        "laptop": "Computador Laptop", "pocketComputer": "Computador de Bolso", "cybermodem": "Cibermodem",
        "cellularCybermodem": "Cibermodem Celular", "interfaceCables": "Cabos de Interface",
        "lowImpedance": "Cabos de Baixa Impedância", "trodeSet": "Conjunto de Eletrodos",
        "keyboard": "Teclado", "terminal": "Terminal",
    },
    "communications": {
        "mastoid": "Comunicador Mastóide", "pocketCommo": "Comunicador de Bolso",
        "cellularPhone": "Telefone Celular", "miniCellPhone": "Mini Telefone Celular",
    },
    "surveillance": {
        "binglasses": "Óculos Binoculares", "binocular": "Binóculos",
        "lightBoosterGoogle": "Óculos de Intensificação Luminosa", "irGoogles": "Óculos de Infravermelho",
        "irFlash": "Lanterna de Infravermelho",
    },
    "entertainment": {
        "movie": "Filme", "chipRental": "Aluguel de Fita/Chip de Vídeo", "braindance": "Dança Cerebral",
        "liveConcert": "Concerto ao Vivo/Evento Esportivo", "fastFood": "Refeição Fast Food",
        "wellDrink": "Água de Fonte", "restaurant": "Refeição em Restaurante",
    },
    "security": {
        "keylock": "Fechadura", "cardlock": "Fechadura de Cartão", "vocolock": "Fechadura de Voz",
        "lineTap": "Grampo Telefônico", "codeDecryptor": "Decifrador de Fechaduras de Cartão",
        "vocDecryptor": "Decodificador de Voz", "securityScanner": "Scanner de Segurança",
        "poisonSniffer": "Detector de Veneno", "jammingTransmitter": "Transmissor de Interferências",
        "scannerPlate": "Placa de Leitura via Scanner", "movementSensor": "Sensor de Movimento",
        "passCard": "Cartão de Passe", "trackingDevice": "Aparelho de Rastreamento",
        "tracerButton": "Botões Rastreadores", "remoteSensors": "Sensores Remotos",
        "plasKuffs": "Algemas de Plástico", "stripwireBlinders": "Fita Reforçada",
    },
    "medical": {
        "dermalStapler": "Grampeador Dérmico", "spraySkin": "Spray para a Pele",
        "slapPatch": "Cobertura para Ferimentos", "criotank": "Tanque Criogênico",
        "medkit": "Kit Médico", "surgicalKit": "Kit Cirúrgico", "firstAidKit": "Kit de Primeiros Socorros",
        "medscanner": "Scanner Médico", "drugAnalyzer": "Analisador de Drogas", "airhypho": "Hipodérmica de Ar",
        "clinicVisit": "Visita a uma Clínica", "dayInHospital": "Dia no Hospital", "dayInICU": "Dia na UTI",
        "cloneLimbReplacement": "Substituição de Membro Clonado",
    },
    "furnshing": {
        "nylonCarryBag": "Mochila de Nylon", "sleepingBag": "Saco de Dormir", "inflatableBed": "Cama Inflável",
        "futon": "Futon", "realWoodFurniture": "Mobília de Madeira de Verdade",
        "sintheticFurniture": "Mobília Sintética", "apartmentCube": "Apartamento Cubo",
        "lamp": "Lâmpada", "cleaningRobot": "Robô de Limpeza", "vocalSwitchSystem": "Sistema de Ativação Vocal",
    },
    "vehicles": {
        "scooter": "Lambreta", "motorcycle": "Motocicleta", "cityCar": "Carro para a Cidade",
        "smallSubcompact": "Pequeno Subcompacto", "mediumSedan": "Sedan Médio",
        "sportsCar": "Carro Esporte", "luxurySedan": "Sedan de Luxo",
    },
    "lifestyle": {
        "cellPhoneService": "Serviço de Telefonia Celular", "standardPhoneService": "Serviço de Telefonia Padrão",
        "payPhoneCall": "Chamada Telefônica Paga", "dataTermUse": "Utilização de Terminal de Dados",
        "credChipAccount": "Chip de Crédito", "healthPlan": "Plano de Saúde",
        "traumaTeamSilver": "Plano Prata do Trauma Team", "traumaTeamGold": "Plano Ouro do Trauma Team",
        "traumaTeamPlatinum": "Plano Platina do Trauma Team", "traumaTeamDiamond": "Plano Diamante do Trauma Team",
        "air": "Ar", "maglevChip": "Passagem de Mag Lev", "taxi": "Táxi", "avTaxi": "AV-Táxi",
        "cableTV": "TV a Cabo",
    },
    "groceries": {
        "kibble": "Kibble (Mingau)", "genericPrepak": "Pré-cozidos Genéricos",
        "goodPrepak": "Pré-cozidos de Qualidade", "freshFood": "Comida Fresca",
    },
    "housing": {
        "coffin": "Caixão", "hotelRoom": "Quarto de Hotel", "apartment": "Apartamento em Condomínio",
        "house": "Casa", "utilities": "Utilidades",
    },
}


DESCRIPTIONS_PT = {
    "tools": {
        "techscanner": "Um pequeno microcomputador de mão com vários conectores de entrada e saída e sondas. Executa programas de diagnóstico, identifica e examina componentes defeituosos e mostra esquemas internos numa pequena tela.",
        "cuttingtorch": "O maçarico comum de oxiacetileno, portátil e com cerca de 30 cm. Modelos mais potentes, inclusive lanças de termite, custam entre 5 e 15 vezes o preço normal.",
        "techToolkit": "Um conjunto de ferramentas diversas para reparar objetos mecânicos, geralmente guardado numa maleta de 10 por 40 por 5 cm.",
        "eletronicToolkit": "Um conjunto de ferramentas diversas para reparar equipamentos eletrônicos.",
        "protectiveGoggles": "Proteção para os olhos durante soldagem, trabalho com metais, mistura de produtos químicos e atividades semelhantes.",
        "flashtube": "Uma lanterna comum com alcance entre 30 e 35 metros. Lanternas de bolso com um quarto do alcance custam metade do preço normal.",
        "glowstick": "Composto químico luminoso num tubo plástico de 15 cm. Sacuda ou quebre para ativar. A luz suave dura até seis horas e pode ser verde, azul ou vermelha.",
        "flashpaint": "Tinta fluorescente que emite uma luz suave equivalente à de um Bastão de Luz e dura até quatro horas.",
        "flashtape": "O mesmo material da Tinta Luminosa, em forma de fita. Dura seis horas e existe em várias larguras.",
        "rope": "Fibras sintéticas trançadas em várias grossuras e pesos. Suporta até 450 kg.",
        "breathmask": "Máscara comum de pintor que cobre boca e nariz, com dois filtros laterais substituíveis. Um pacote com dez filtros custa 1 eb. Boa para evitar a fumaça e a poluição.",
    },
    "personalElectronics": {
        "hologen": "Uma pequena caixa, com cerca de 10 por 5 por 15 cm, que projeta uma imagem holográfica a partir de um chip substituível. Aceita chips da maioria das câmeras digitais e pode ser conectada a um gravador/reprodutor digital.",
        "videoBoard": "Monitor de tela plana com tecnologia de cristal líquido. Tem no máximo 2,5 cm de espessura e conectores para servir de monitor a outros aparelhos; os modelos grandes são usados como painéis publicitários.",
        "dataChip": "O meio de armazenamento do futuro. Normalmente envoltos em plástico, os chips podem ter forma de botões, quadrados achatados ou lascas triangulares; adaptadores permitem que qualquer gravador leia qualquer formato.",
        "logcompass": "Uma bússola inercial programável que registra mudanças de direção a partir de um ponto e de um rumo estabelecidos.",
        "digitalRecorder": "Aparelho de gravação de áudio baseado em datachips. A maioria tem o tamanho de dois livros de bolso empilhados, embora alguns sejam menores que um maço de cartas.",
        "digitalCamera": "Digitaliza imagens estáticas e as armazena num cartucho de chip. Tem o tamanho aproximado de um maço de cigarros.",
        "videoCam": "Pode ser instalada na cabeça, no ombro ou usada com as mãos. Som e imagem são gravados numa fita compacta ou transmitidos diretamente por cabos. O preço indicado corresponde ao modelo de ombro mais barato.",
        "tapePlayer": "Reproduz fitas de Vídeo Câmera e muitas fitas antigas de áudio.",
        "tape": "Meio digital de alta densidade capaz de armazenar sinais de áudio e imagens.",
        "pocketTV": "Usa uma tela plana num aparelho de aproximadamente 12 por 12 por 2 cm ou menor e capta a maioria das estações VHF e UHF.",
        "chipPlayer": "Reproduz chips digitais de áudio e vídeo. Deve ser conectado a um Monitor de Vídeo para exibir a faixa de vídeo.",
        "chip": "Armazena de um a seis álbuns musicais em plástico e semicondutores. Também existe em versão de leitura e gravação.",
        "eletricGuitar": "Mais leve e flexível que a guitarra clássica, por vezes nem possui uma forma reconhecível. Cordas e trastes podem ter sido substituídos por bancos de teclas.",
        "eletronicKeyboard": "Pouco mudou em relação aos teclados atuais, exceto pelo tamanho e pela potência.",
        "drumSynthesizer": "Um conjunto de elementos de percussão e uma caixa de ritmos. Cabe em duas malas e pode ser arranjado como o baterista preferir.",
        "amplifier": "Equipamento de amplificação para instrumentos eletrônicos.",
    },
    "dataSystems": {
        "laptop": "Computador portátil com disco rígido interno, Monitor de Vídeo removível e slots para chips de dados ou programas. Não possui os processadores e a memória de um computador normal e não pode ser usado para operações na Rede.",
        "pocketComputer": "Calculadora programável com teclado e slots para chips, capaz de armazenar até 100 páginas de memória alfanumérica.",
        "cybermodem": "Veja a seção Netrunning.",
        "cellularCybermodem": "Veja a seção Netrunning, página 133.",
        "interfaceCables": "Cabos comuns com plugues usados para ligar uma máquina controlada ciberneticamente aos conectores de interface de uma pessoa.",
        "lowImpedance": "Cabos especiais de baixa resistência e interferência que melhoram a transferência de dados. Concedem +1 em tarefas de Interface, como controlar cibervéiculos ou operar na Rede.",
        "trodeSet": "Dispositivo de baixa eficiência usado na cabeça para pegar carona na Rede. Impõe -2 à perícia Interface.",
        "keyboard": "Pode ser conectado ao seu cibermodem ou a outros equipamentos eletrônicos.",
        "terminal": "Estação de trabalho com teclado, Monitor de Vídeo e conectores de entrada e saída. Pode ser usada na Rede, tornando o Netrunner imune à maioria dos programas Negros, mas impõe -5 à Interface. Seus operadores são chamados de tartarugas da Rede.",
    },
    "communications": {
        "mastoid": "Rádio transceptor colado ao maxilar e à têmpora. Transmite por subvocalização e recebe por vibrações silenciosas. Alcance: 15 km.",
        "pocketCommo": "Um walkie-talkie pequeno e comum. Alcance: 15 km.",
        "cellularPhone": "Comunicação móvel em qualquer lugar coberto por uma rede de radiotelefonia. O serviço custa 100 eb por mês.",
        "miniCellPhone": "Cabe num maço de cigarros.",
    },
    "surveillance": {
        "binglasses": "Visores de alta tecnologia que combinam binóculos com telêmetro laser e, às vezes, lentes infravermelhas. Modelos mais caros podem incluir uma câmera digital.",
        "binocular": "Binóculos comuns.",
        "lightBoosterGoogle": "Amplificam a luz ambiente para visão noturna por tecnologia Starlite, mas podem ser ofuscados por luz súbita. Com um ajuste Difícil, também detectam feixes infravermelhos ativos.",
        "irGoogles": "Captam fontes difusas de infravermelho. Normalmente usados com uma fonte ativa para produzir iluminação invisível.",
        "irFlash": "Fonte ativa de luz infravermelha. A versão ultravioleta é semelhante e pode ser usada com o ciberóptico apropriado.",
    },
    "security": {
        "keylock": "Trava mecânica para portas. Possui quatro níveis: Segurança Baixa (15), Média (20), Alta (25) e Máxima (30).",
        "cardlock": "Trava eletrônica que usa um cartão codificado magneticamente. Possui quatro níveis: Segurança Baixa (15), Média (20), Alta (25) e Máxima (30).",
        "vocolock": "Trava eletrônica com reconhecimento de voz. Possui quatro níveis: Segurança Baixa (15), Média (20), Alta (25) e Máxima (30).",
        "lineTap": "Capta voz ou dados de uma linha de telecomunicações para gravar ou retransmitir. Modelos avançados funcionam a cerca de 30 cm da linha e aceitam controle remoto. Não funciona em sistemas instalados ou atualizados após a adoção total de fibra óptica em 2008.",
        "codeDecryptor": "A sonda substitui o cartão normal de uma Fechadura de Cartão e acrescenta +5 ao teste de TEC + Segurança Eletrônica + 1D10 contra a fechadura.",
        "vocDecryptor": "Modulador vocal usado para penetrar Fechaduras de Voz.",
        "securityScanner": "Procura campos eletromagnéticos produzidos por alarmes, com 75% de chance de localizar um sistema. Um teste de TEC ou INT pode identificar o tipo de alarme.",
        "poisonSniffer": "Pode procurar venenos específicos no ar ou em líquidos, ou apenas alertar sobre substâncias estranhas. Precisão: 85%.",
        "jammingTransmitter": "Geralmente ocupa duas ou três malas grandes, embora possa preencher um furgão. Interfere em transmissões eletromagnéticas num raio de 300 m, incluindo telefones celulares e parte dos ciberware.",
        "scannerPlate": "Leitor de impressão da mão que pode ser conectado a uma Fechadura de Cartão ou de Voz como camada adicional de segurança.",
        "movementSensor": "Sistema de alarme com sensores sísmicos, sonar e redes fixas de infravermelho ou luz visível. Detecta movimento numa área definida com 95% de confiabilidade; o processador tem o tamanho de um maço de cigarros.",
        "passCard": "O dispositivo mais comum para abrir uma Fechadura de Cartão.",
        "trackingDevice": "Equipamento portátil ou em forma de maleta para detectar e seguir Botões Rastreadores. Alcance: 1,5 km.",
        "tracerButton": "Variam do tamanho de uma caixa de fósforos ao de um alfinete e usam radioatividade ou transmissões de rádio para revelar a posição daquilo a que estão presos. Alguns podem ser ligados ou desligados remotamente.",
        "plasKuffs": "Algemas resistentes feitas de ligas modernas. Rompê-las é Quase Impossível; metade utiliza uma Fechadura de Cartão.",
        "stripwireBlinders": "Tiras plásticas reforçadas e descartáveis para algemas temporárias de mãos e pernas. São Muito Difíceis de romper, resistem a cortes graças a fibras cerâmicas e são à prova de fogo.",
    },
    "medical": {
        "dermalStapler": "Fecha automaticamente as bordas de uma ferida com grampos de material orgânico comprimido que se dissolvem depois de algum tempo.",
        "spraySkin": "Gel espesso em spray para tratar abrasões graves. Antisséptico, esterilizado e permeável ao ar, desprende-se em cerca de duas semanas.",
        "slapPatch": "Pequena cobertura plástica com uma dose de medicamento, aplicada à pele para absorção gradual. Veja a seção do Trauma Team para drogas e preços.",
        "criotank": "Tanque avançado de refrigeração que reduz o corpo a níveis de conservação enquanto o suporte vital mantém o fluxo de sangue e oxigênio, preservando um moribundo em estase relativa.",
        "medkit": "Mala padrão de médico ou paramédico militar com antídotos, curativos, drogas, aplicadores, remédios e instrumentos de exame.",
        "surgicalKit": "Conjunto completo de instrumentos cirúrgicos e dos compostos ou aparelhos necessários para manter o campo operatório esterilizado.",
        "firstAidKit": "Caixa doméstica de primeiros socorros com bandagens, antissépticos e um analgésico simples.",
        "medscanner": "Mede temperatura corporal, batimentos cardíacos, pressão sanguínea, respiração e glicemia. Seu banco de dados em chip concede +2 à perícia Diagnose.",
        "drugAnalyzer": "Varia do tamanho de um livro ao de uma maleta. Determina a pureza de drogas conhecidas ou identifica a estrutura molecular e os possíveis efeitos de substâncias semelhantes às registradas em sua biblioteca.",
        "airhypho": "Usa um jato de ar comprimido para introduzir uma droga líquida através da pele. Veja a seção do Trauma Team para drogas e preços.",
    },
    "furnshing": {
        "nylonCarryBag": "Mochila esportiva de carga do século XXI, disponível em vários tamanhos e com muitos logotipos.",
        "sleepingBag": "Mais leve e capaz de suportar temperaturas de até -73 °C. Comprime-se num pacote de aproximadamente 30 por 15 por 10 cm.",
        "inflatableBed": "Colchão auto-inflável altamente comprimido. Dobrado, mede cerca de 15 por 5 por 10 cm.",
        "futon": "Cama dobrável portátil com acolchoado, de origem japonesa.",
        "realWoodFurniture": "Mobília feita de madeira verdadeira.",
        "sintheticFurniture": "Mobília feita de materiais sintéticos.",
        "apartmentCube": "Módulo habitável de 3 por 3 por 2 m com móveis e utensílios ocultos em recessos nas paredes. Inclui cama, armário, fogão, refrigerador, TV, centro de entretenimento digital, cadeiras, escrivaninha e mesa removível, e pode ser transportado como uma unidade.",
        "lamp": "Emite luz e existe numa infinidade de formas e cores.",
        "cleaningRobot": "Pequeno aparelho robótico de limpeza pré-programado, geralmente do tamanho de um aspirador portátil. Não é muito inteligente.",
        "vocalSwitchSystem": "Controles ativados por voz para luzes e outros utensílios.",
    },
    "vehicles": {
        "scooter": "Lambreta elétrica atualizada, com velocidade máxima de cerca de 80 km/h e seis horas de autonomia por abastecimento rápido.",
        "motorcycle": "Normalmente possui desenho reclinado e carenagem plástica. Modelos elétricos alcançam cerca de 105 km/h e oito horas por carga; versões a CHOOH2 chegam a 240 km/h com tanque de 15 litros.",
        "cityCar": "Carro corporativo de três rodas e um lugar, com velocidade máxima de cerca de 65 km/h e quatro horas por carga. Também pode ser alugado em quiosques de áreas corporativas.",
        "smallSubcompact": "Geralmente movido a metanol ou CHOOH2, com velocidade máxima de cerca de 145 km/h, tanque de 40 litros e quatro lugares.",
        "mediumSedan": "Movido a metanol ou CHOOH2, com velocidade máxima de cerca de 145 km/h, tanque de 55 litros e quatro lugares.",
        "sportsCar": "Quase sempre movido a CHOOH2, com velocidade máxima de cerca de 340 km/h, tanque de 40 litros e dois lugares.",
        "luxurySedan": "Movido a metanol ou CHOOH2, com velocidade máxima de cerca de 145 km/h, tanque de 75 litros e seis lugares.",
    },
    "lifestyle": {
        "credChipAccount": "Um cartão de débito usado para carregar dinheiro eletronicamente no lugar de uma carteira.",
        "air": "Em regiões muito poluídas, ar limpo é vendido por bares de ar, lojas, vendedores de rua e máquinas automáticas.",
    },
    "groceries": {
        "kibble": "Nutriente produzido em série que satisfaz a maioria das necessidades alimentares, mas parece, cheira e tem gosto de ração seca para animais.",
        "genericPrepak": "Refeição básica embalada que pode ser aquecida no micro-ondas ou refrigerada. Muitas vêm com pastilhas químicas para aquecimento ou resfriamento.",
        "goodPrepak": "Boa refeição de restaurante dentro de um pacote, a melhor comida pré-preparada normalmente disponível.",
        "freshFood": "Comida realmente fresca ou, pelo menos, algo que foi comido por alguém que já a viu.",
    },
    "housing": {
        "coffin": "Caixa de dormir empilhável e operada por moedas, encontrada em aeroportos e pensões. Há espaço apenas para virar-se ou ler na cama; modelos caros podem incluir telefone ou mini-TV.",
    },
}


NOTES_PT = {
    "style modifier applies": "aplica-se o modificador de estilo",
    "per pint": "por pinta (0,47 L)",
    "per foot": "por pé (0,30 m)",
    "per square foot": "por pé quadrado (0,093 m²)",
    "restaurant or bar quality modifier applies": "aplica-se o modificador de qualidade do restaurante ou bar",
    "per level": "por nível",
    "set of six": "estojo com seis",
    "box of twelve": "caixa com doze",
    "per can": "por lata",
    "varies by limb": "varia conforme o membro",
    "per month": "por mês",
    "per minute": "por minuto",
    "per station": "por estação",
    "per mile": "por milha",
    "per week": "por semana",
    "per piece": "por peça",
    "per night": "por noite",
    "per room, per month; location modifier applies": "por quarto, por mês; aplica-se o modificador de localização",
    "Paramedic service; surgery billed separately; response in 1D10 turns; per month": "Serviço paramédico; cirurgia cobrada separadamente; resposta em 1D10 turnos; por mês",
    "Paramedic and ambulance service with limited armed escort; surgery billed separately; response in 1D8 turns; per month": "Serviço paramédico e ambulância com escolta armada limitada; cirurgia cobrada separadamente; resposta em 1D8 turnos; por mês",
    "Paramedic, ambulance and armed escort; surgery billed separately; response in 1D6 turns; per month": "Serviço paramédico, ambulância e escolta armada; cirurgia cobrada separadamente; resposta em 1D6 turnos; por mês",
    "Paramedic, ambulance, armed escort and cyberware repair; surgery included; response in 1D4 turns; per month": "Serviço paramédico, ambulância, escolta armada e reparo de ciberware; cirurgia incluída; resposta em 1D4 turnos; por mês",
}


PRICE_TEXT_PT = {
    "between 10.0 and 100.0": "entre 10.0 e 100.0",
    "between 5.0 and 50.0": "entre 5.0 e 50.0",
    "between 100.0 and 500.0": "entre 100.0 e 500.0",
    "between 200.0 and 900.0": "entre 200.0 e 900.0",
    "between 200.0 and 800.0": "entre 200.0 e 800.0",
    "between 500.0 and 1000.0": "entre 500.0 e 1000.0",
    "Varies by design": "Varia conforme o projeto",
    "varies by drug type": "varia conforme o tipo de droga",
    "between 20.0 and 30.0": "entre 20.0 e 30.0",
}


def item_map(category: dict) -> dict:
    return category["list"]


def numeric_signature(value: object) -> tuple[float, ...]:
    import re
    return tuple(float(part) for part in re.findall(r"\d+(?:\.\d+)?", str(value)))


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    result = copy.deepcopy(source)

    result["$id"] = "/data/equipment.pt-BR.json"
    result["title"] = "Equipamentos"
    result["description"] = "Equipamentos do Livro Básico de Cyberpunk 2020, com as extensões existentes do site preservadas."

    expected = set()
    localized = set()
    source_descriptions = set()
    translated_descriptions = set()

    for category_key, category in result["data"].items():
        try:
            category["name"], category["description"] = CATEGORY_PT[category_key]
            names = ITEM_NAMES_PT[category_key]
        except KeyError as exc:
            raise KeyError(f"categoria sem tradução: {category_key}") from exc

        if category_key == "fashion":
            category["modifiers"] = {label: value for label, (value, _) in FASHION_TYPES_PT.items()}
            category["types"] = {label: description for label, (_, description) in FASHION_TYPES_PT.items()}
        elif category_key == "entertainment":
            category["modifiers"] = ENTERTAINMENT_MODIFIERS_PT

        for item_key, item in item_map(category).items():
            path = (category_key, item_key)
            expected.add(path)
            try:
                item["name"] = names[item_key]
            except KeyError as exc:
                raise KeyError(f"item sem nome em pt-BR: {category_key}/{item_key}") from exc
            localized.add(path)

            if "description" in item:
                source_descriptions.add(path)
                try:
                    item["description"] = DESCRIPTIONS_PT[category_key][item_key]
                except KeyError as exc:
                    raise KeyError(f"descrição sem tradução: {category_key}/{item_key}") from exc
                translated_descriptions.add(path)

            if "note" in item:
                try:
                    item["note"] = NOTES_PT[item["note"]]
                except KeyError as exc:
                    raise KeyError(f"nota sem tradução: {category_key}/{item_key}: {item['note']}") from exc

            if item.get("price") in PRICE_TEXT_PT:
                item["price"] = PRICE_TEXT_PT[item["price"]]

    if expected != localized:
        raise ValueError("mapa de nomes pt-BR fora de sincronia")
    if source_descriptions != translated_descriptions:
        raise ValueError("mapa de descrições pt-BR fora de sincronia")
    if set(CATEGORY_PT) != set(result["data"]):
        raise ValueError("mapa de categorias pt-BR fora de sincronia")

    # Localized price strings may change wording, but never their numeric values.
    for category_key, source_category in source["data"].items():
        localized_category = result["data"][category_key]
        for item_key, source_item in item_map(source_category).items():
            localized_item = item_map(localized_category)[item_key]
            if numeric_signature(source_item["price"]) != numeric_signature(localized_item["price"]):
                raise ValueError(f"preço divergente: {category_key}/{item_key}")

    TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    print(f"gerado {TARGET.relative_to(ROOT)} com {len(expected)} itens")


if __name__ == "__main__":
    main()
