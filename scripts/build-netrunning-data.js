const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const supplements = require("./netrunning-supplements.js");

const classes = [
  ["intrusion", "Intrusion", "Intrusão"],
  ["decryption", "Decryption", "Decifrador"],
  ["detection_alarm", "Detection/Alarm", "Detecção/Alarme"],
  ["anti_system", "Anti-System", "Anti-sistema"],
  ["evasion_stealth", "Evasion/Stealth", "Evasão/Furtividade"],
  ["protection", "Protection", "Proteção"],
  ["anti_program", "Anti-Program", "Anti-programa"],
  ["anti_personnel", "Anti-Personnel", "Anti-pessoal"],
  ["controller", "Controller", "Controlador"],
  ["utility", "Utility", "Utilitário"],
  ["demon", "Demon", "Demônio"],
  ...supplements.classes,
];

function program(id, classId, name, ptName, strength, memory, price, effect, ptEffect, icon, ptIcon, extra = {}) {
  return {
    id,
    class_id: classId,
    name,
    pt_name: ptName,
    strength: typeof strength === "number" ? { base: strength } : strength,
    memory,
    price,
    effect,
    pt_effect: ptEffect,
    icon,
    pt_icon: ptIcon,
    source: { book: "Cyberpunk 2020 Core Rulebook", pages: "137-141" },
    ...extra,
  };
}

const programs = [
  program("hammer", "intrusion", "Hammer", "Martelo", 4, 1, 400,
    "Reduces a Data Wall by 2D6 Strength per hit and alerts defenses within 10 spaces.",
    "Reduz a Força de um Muro de Dados em 2D6 por acerto e alerta defesas num raio de 10 espaços.",
    "A glowing red hammer.", "Um martelo vermelho brilhante."),
  program("jackhammer", "intrusion", "Jackhammer", "Britadeira", 2, 2, 360,
    "A quieter intrusion attack that reduces a Data Wall by 1D6 Strength per hit.",
    "Um ataque de intrusão mais silencioso que reduz a Força de um Muro de Dados em 1D6 por acerto.",
    "A red jackhammer firing white energy bolts.", "Uma britadeira vermelha disparando raios brancos de energia."),
  program("worm", "intrusion", "Worm", "Minhoca", 2, 5, 660,
    "Opens a Code or Data Wall from inside in two turns without raising an alarm.",
    "Abre um Muro de Código ou Dados por dentro em dois turnos sem disparar o alarme.",
    "A gold robotic worm with neon-green eyes.", "Uma minhoca robótica dourada com olhos verde-neon."),

  program("codecracker", "decryption", "Codecracker", "Quebra-Códigos", 3, 2, 380,
    "Breaks Code Gates by dismantling their program structure.",
    "Rompe Portões de Acesso desmontando sua estrutura de programa.",
    "A thin white beam passing through the gate.", "Um fino feixe branco atravessando o portão."),
  program("wizards_book", "decryption", "Wizard's Book", "Grimório", {
    base: 4,
    situational: [{ value: 6, when: "against Code Gates", pt_when: "contra Portões de Acesso" }],
  }, 2, 400,
    "Tests billions of keys; its Strength rises to 6 against Code Gates.",
    "Testa bilhões de chaves; sua Força sobe para 6 contra Portões de Acesso.",
    "A stream of blazing white symbols.", "Uma corrente de símbolos brancos brilhantes."),
  program("raffles", "decryption", "Raffles", "Sorteio", 5, 3, 560,
    "Uses a sequence of questions to reveal passwords for Code Gates and File Locks.",
    "Usa uma sequência de perguntas para revelar senhas de Portões de Acesso e Fechaduras de Arquivo.",
    "A dapper young man in early-1990s evening clothes.", "Um jovem elegante com roupas de festa do início dos anos 1990."),

  program("watchdog", "detection_alarm", "Watchdog", "Cão de Guarda", 4, 5, 610,
    "Detects illegal entry and alerts its owner or an external alarm.",
    "Detecta entradas ilegais e alerta seu dono ou um alarme externo.",
    "A large black metal dog with red eyes.", "Um grande cachorro preto de metal com olhos vermelhos."),
  program("bloodhound", "detection_alarm", "Bloodhound", "Cão de Caça", 3, 5, 700,
    "Detects an intruder, traces the entry to its source and alerts its owner.",
    "Detecta um intruso, rastreia a entrada até a origem e alerta seu dono.",
    "A gunmetal hound with blue eyes and a neon collar.", "Um cão cinza-metálico com olhos azuis e coleira de neon."),
  program("pit_bull", "detection_alarm", "Pit Bull", "Pit Bull", 2, 6, 780,
    "Detects and traces an intruder, then repeatedly cuts that access line.",
    "Detecta e rastreia um intruso, depois corta repetidamente aquela linha de acesso.",
    "A compact steel dog with red eyes and a red neon collar.", "Um cão compacto de aço com olhos vermelhos e coleira de neon vermelho."),
  program("see_ya", "detection_alarm", "See Ya", "Te Vejo", 3, 1, 280,
    "Reveals invisible icons within one subgrid.",
    "Revela ÍCONES invisíveis dentro de uma subgrade.",
    "A shimmering silver screen.", "Uma tela prateada de brilho difuso."),
  program("hidden_virtue", "detection_alarm", "Hidden Virtue", "Virtude Oculta", 3, 1, 280,
    "Distinguishes real icons and data objects from virtual simulations.",
    "Distingue ÍCONES e objetos de dados reais de simulações virtuais.",
    "A glowing green ring used as a lens.", "Um anel verde brilhante usado como lente."),
  program("speedtrap", "detection_alarm", "Speedtrap", "Radar", 4, 4, 600,
    "Detects offensive programs within 10 spaces, but not their exact position.",
    "Detecta programas ofensivos num raio de 10 espaços, mas não sua posição exata.",
    "A flat crystal disk that displays a robotic monster.", "Um disco plano de cristal que exibe um monstro robótico."),

  program("flatline", "anti_system", "Flatline", "Linha Reta", 3, 2, 570,
    "Destroys a cyberdeck's operating interface chip.",
    "Destrói o chip de interface operacional de um ciberterminal.",
    "A yellow neon beam fired from the fingertips.", "Um feixe de neon amarelo disparado pelas pontas dos dedos."),
  program("poison_flatline", "anti_system", "Poison Flatline", "Linha Reta Venenoso", 2, 2, 540,
    "Destroys both the deck interface and its memory, requiring full replacement.",
    "Destrói a interface e a memória do terminal, exigindo substituição completa.",
    "A green neon beam fired from the fingertips.", "Um feixe de neon verde disparado pelas pontas dos dedos."),
  program("krash", "anti_system", "Krash", "Krash", 3, 2, 570,
    "Crashes the nearest CPU for 1D6+1 turns; a deck drops its Netrunner immediately.",
    "Derruba a CPU mais próxima por 1D6+1 turnos; um terminal expulsa o Netrunner imediatamente.",
    "A large cartoon anarchist bomb.", "Uma enorme bomba anarquista de desenho animado."),
  program("deckkrash", "anti_system", "DeckKRASH", "TermiKRASH", 4, 2, 600,
    "A deck-only Krash that drops its Netrunner for 1D6 turns.",
    "Um Krash exclusivo para terminais que expulsa o Netrunner por 1D6 turnos.",
    "A cartoon stick of dynamite.", "Uma banana de dinamite de desenho animado."),
  program("murphy", "anti_system", "Murphy", "Murphy", 3, 2, 600,
    "Forces the target deck or system to launch applications randomly.",
    "Força o terminal ou sistema alvo a iniciar aplicativos aleatoriamente.",
    "Unpredictable by design.", "Imprevisível por definição."),
  program("virizz", "anti_system", "Virizz", "Virizz", 4, 2, 600,
    "Blocks one action of the target system or deck until shutdown.",
    "Bloqueia uma ação do sistema ou terminal alvo até ele ser desligado.",
    "A glittering DNA chain made of neon lights.", "Uma cadeia de DNA cintilante feita de luzes de neon."),
  program("viral_15", "anti_system", "Viral 15", "Viral 15", 4, 2, 590,
    "Randomly erases one selected file or program each turn until shutdown.",
    "Apaga aleatoriamente um arquivo ou programa selecionado a cada turno até o desligamento.",
    "Blue metallic fog around a white neon DNA helix.", "Névoa azul metálica ao redor de uma hélice de DNA em neon branco."),

  program("invisibility", "evasion_stealth", "Invisibility", "Invisibilidade", 3, 1, 300,
    "Masks the deck signal as harmless static so the Netrunner can pass unnoticed.",
    "Mascara o sinal do terminal como estática inofensiva para o Netrunner passar despercebido.",
    "A flickering iridescent sheet.", "Uma camada tremeluzente e iridescente."),
  program("stealth", "evasion_stealth", "Stealth", "Furtividade", 4, 3, 480,
    "Mutes the cyber-signal so offensive programs do not react, though Netrunners still can.",
    "Abafa o cibersinal para programas ofensivos não reagirem, embora Netrunners ainda possam vê-lo.",
    "A sheet of black energy over the user's icon.", "Uma camada de energia negra sobre o ÍCONE do usuário."),
  program("replicator", "evasion_stealth", "Replicator", "Replicador", {
    base: 3,
    situational: [{ value: 4, when: "against Dog programs and Hellhound", pt_when: "contra programas Cão e Cão Infernal" }],
  }, 2, 320,
    "Creates false traces to mislead pursuers; Strength 4 against Dog programs and Hellhound.",
    "Cria rastros falsos para enganar perseguidores; Força 4 contra programas Cão e Cão Infernal.",
    "A chrome sphere projecting many holographic copies.", "Uma esfera cromada projetando muitas cópias holográficas."),

  program("shield", "protection", "Shield", "Escudo", 3, 1, 150,
    "Stops a direct attack against the Netrunner on a successful defense.",
    "Detém um ataque direto contra o Netrunner quando a defesa é bem-sucedida.",
    "A shifting circular energy field.", "Um campo circular mutante de energia."),
  program("force_shield", "protection", "Force Shield", "Escudo de Força", 4, 2, 160,
    "A stronger form of Shield.", "Uma versão mais forte do Escudo.",
    "A flickering silver energy barrier.", "Uma barreira prateada e bruxuleante de energia."),
  program("reflector", "protection", "Reflector", "Refletor", 5, 2, 160,
    "Repels Stun, Hellbolt and Knockout attacks, but no other Anti-Personnel programs.",
    "Repele Atordoador, Raio Infernal e Nocaute, mas nenhum outro programa Anti-pessoal.",
    "Blue-green light forming a mirrored bowl.", "Luz verde-azulada formando um globo espelhado."),
  program("armor", "protection", "Armor", "Armadura", 4, 2, 170,
    "Stops Anti-Personnel attacks or reduces listed black-program damage by 3 on a failed defense.",
    "Detém ataques Anti-pessoal ou reduz em 3 o dano dos programas negros listados quando a defesa falha.",
    "Glowing golden high-tech armor.", "Armadura dourada brilhante de alta tecnologia."),
  program("flak", "protection", "Flak", "Antiaéreo", {
    base: 4,
    situational: [{ value: 2, when: "against Dog programs and Hellhound", pt_when: "contra programas Cão e Cão Infernal" }],
  }, 2, 180,
    "Creates visual static that helps evade attacks; only Strength 2 against Dog programs.",
    "Cria estática visual para facilitar a evasão; tem apenas Força 2 contra programas Cão.",
    "A blinding cloud of multicolored lights.", "Uma nuvem cegante de luzes multicoloridas."),

  program("killer_ii", "anti_program", "Killer II", "Killer II", 2, 5, 1320,
    "Inflicts 1D6 damage to the Strength of any program.", "Causa 1D6 de dano à Força de qualquer programa.",
    "A metallic samurai robot with a glowing katana.", "Um robô samurai metálico com uma katana brilhante.", { copy_restricted: true }),
  program("killer_iv", "anti_program", "Killer IV", "Killer IV", 4, 5, 1400,
    "Inflicts 1D6 damage to the Strength of any program.", "Causa 1D6 de dano à Força de qualquer programa.",
    "A metallic samurai robot with a glowing katana.", "Um robô samurai metálico com uma katana brilhante.", { copy_restricted: true }),
  program("killer_vi", "anti_program", "Killer VI", "Killer VI", 6, 5, 1480,
    "Inflicts 1D6 damage to the Strength of any program.", "Causa 1D6 de dano à Força de qualquer programa.",
    "A metallic samurai robot with a glowing katana.", "Um robô samurai metálico com uma katana brilhante.", { copy_restricted: true }),
  program("manticore", "anti_program", "Manticore", "Manticora", 2, 3, 880,
    "Locates and destroys Demon programs; ignores targets without a Demon.",
    "Localiza e destrói programas Demônio; ignora alvos que não possuem um.",
    "A red-neon lion shape with a scorpion tail.", "Uma silhueta de leão em neon vermelho com cauda de escorpião.", { copy_restricted: true }),
  program("hydra", "anti_program", "Hydra", "Hidra", 3, 3, 920,
    "A stronger Demon-hunting program.", "Um programa caçador de Demônios mais forte.",
    "Glittering blue fog that encloses its target.", "Névoa azul brilhante que envolve o alvo.", { copy_restricted: true }),
  program("dragon", "anti_program", "Dragon", "Dragão", 4, 3, 960,
    "The strongest standard Demon-hunting program.", "O mais forte dos caçadores de Demônios padrão.",
    "A golden robotic dragon wrapped in electrical arcs.", "Um dragão robótico dourado envolto em descargas elétricas.", { copy_restricted: true }),
  program("aardvark", "anti_program", "Aardvark", "Aardvark", {
    base: 4,
    situational: [{ value: 0, when: "against anything except Worm", pt_when: "contra qualquer alvo que não seja Minhoca" }],
  }, 3, 1000,
    "Finds and destroys Worm programs, including Demon subroutines; has no effect on other targets.",
    "Encontra e destrói programas Minhoca, inclusive subrotinas de Demônio; não afeta outros alvos.",
    "A tightening matrix of thin yellow neon lines.", "Uma matriz de finas linhas amarelas de neon que se fecha sobre o alvo.", { copy_restricted: true }),

  program("stun", "anti_personnel", "Stun", "Atordoador", 3, 3, 6000,
    "Freezes the Netrunner in place for 1D6 turns.", "Paralisa o Netrunner no lugar por 1D6 turnos.",
    "A bolt of blue flame from an open palm.", "Um raio de chama azul saindo da palma da mão.", { copy_restricted: true }),
  program("hellbolt", "anti_personnel", "Hellbolt", "Raio Infernal", 4, 4, 6750,
    "Inflicts 1D10 physical damage per successful attack.", "Causa 1D10 de dano físico por ataque bem-sucedido.",
    "A bolt of crimson fire.", "Um raio de fogo escarlate.", { copy_restricted: true }),
  program("sword", "anti_personnel", "Sword", "Espada", 3, 4, 6250,
    "Inflicts 1D6 physical damage per successful attack.", "Causa 1D6 de dano físico por ataque bem-sucedido.",
    "A glowing energy katana.", "Uma katana de energia brilhante.", { copy_restricted: true }),
  program("brainwipe", "anti_personnel", "Brainwipe", "Lavagem Cerebral", 3, 4, 6500,
    "Tracks the victim and permanently reduces INT by 1D6 each turn until death at zero.",
    "Rastreia a vítima e reduz permanentemente a INT em 1D6 por turno até a morte em zero.",
    "An acid-green electrical arc rising from the floor.", "Um arco elétrico verde-ácido saindo do chão.", { copy_restricted: true }),
  program("zombie", "anti_personnel", "Zombie", "Zumbi", 5, 4, 7500,
    "A stronger Brainwipe that destroys 1D6 INT per turn.", "Uma Lavagem Cerebral mais forte que destrói 1D6 de INT por turno.",
    "A decaying skeletal figure in foul grey mist.", "Uma figura esquelética apodrecida numa névoa cinzenta.", { copy_restricted: true }),
  program("liche", "anti_personnel", "Liche", "Lichi", 4, 4, 7250,
    "Selectively removes 1D6 INT and leaves room for a controlled pseudo-personality.",
    "Remove seletivamente 1D6 de INT e deixa espaço para uma pseudopersonalidade controlada.",
    "A crowned metal skeleton in black robes.", "Um esqueleto metálico coroado em robes negros.", { copy_restricted: true }),
  program("firestarter", "anti_personnel", "Firestarter", "Incendiário", 4, 4, 6250,
    "Traces the intruder and sends a power surge through the real electrical system.",
    "Rastreia o intruso e envia um surto pela instalação elétrica do mundo real.",
    "A pillar of fire that speaks the victim's name.", "Uma coluna de fogo que pronuncia o nome da vítima.", { copy_restricted: true }),
  program("hellhound", "anti_personnel", "Hellhound", "Cão Infernal", 6, 6, 10000,
    "Tracks a victim across later connections and inflicts 2D10 physical damage.",
    "Rastreia a vítima em conexões futuras e causa 2D10 de dano físico.",
    "A huge black metal wolf rippling with fire.", "Um imenso lobo negro de metal coberto por ondas de fogo.", { copy_restricted: true }),
  program("spazz", "anti_personnel", "Spazz", "Espasmo", 4, 3, 6250,
    "Halves the Netrunner's REF for 1D6 turns.", "Reduz pela metade os REF do Netrunner por 1D6 turnos.",
    "A nimbus of electrical energy around the target.", "Uma nuvem de energia elétrica ao redor do alvo.", { copy_restricted: true }),
  program("glue", "anti_personnel", "Glue", "Cola", 5, 4, 6500,
    "Immobilizes the Netrunner for 1D10 turns, allowing a realspace trace.",
    "Imobiliza o Netrunner por 1D10 turnos, permitindo rastreá-lo no espaço real.",
    "Red shapes rising from the floor to entangle the target.", "Formas vermelhas saindo do chão para enredar o alvo.", { copy_restricted: true }),
  program("knockout", "anti_personnel", "Knockout", "Nocaute", 4, 3, 6250,
    "Drops the Netrunner from the Net and leaves them in a coma for 1D6 hours.",
    "Expulsa o Netrunner da Rede e o deixa em coma por 1D6 horas.",
    "A yellow neon boxer striking the target icon.", "Um boxeador amarelo de neon golpeando o ÍCONE alvo.", { copy_restricted: true }),
  program("jack_attack", "anti_personnel", "Jack Attack", "Ataque Rápido", 3, 3, 6000,
    "Prevents the Netrunner from disconnecting for 1D6 turns.",
    "Impede o Netrunner de se desconectar por 1D6 turnos.",
    "Glowing schematic handcuffs around the wrists.", "Algemas esquemáticas brilhantes ao redor dos pulsos.", { copy_restricted: true }),

  program("viddy_master", "controller", "Viddy Master", "Video Master", 4, 1, 140,
    "Controls video boards.", "Controla monitores de vídeo.", "No icon.", "Sem ÍCONE."),
  program("soundmachine", "controller", "Soundmachine", "Máquina de Som", 4, 1, 140,
    "Controls microphones, speakers and voice coders.", "Controla microfones, alto-falantes e codificadores de voz.", "No icon.", "Sem ÍCONE."),
  program("open_sesame", "controller", "Open Sesame", "Abre-te Sésamo", 3, 1, 130,
    "Low-level control of doors and elevators.", "Controle de baixo nível para portas e elevadores.", "No icon.", "Sem ÍCONE."),
  program("genie", "controller", "Genie", "Gênio", 5, 1, 150,
    "High-level control of doors and elevators.", "Controle de alto nível para portas e elevadores.", "No icon.", "Sem ÍCONE."),
  program("hotwire", "controller", "Hotwire", "Hotwire", 3, 1, 130,
    "Controls remote or robotic vehicles.", "Controla veículos remotos ou robotizados.", "No icon.", "Sem ÍCONE."),
  program("dee_2", "controller", "Dee-2", "Dee-2", 3, 1, 130,
    "Controls robots, cleaning mechanisms and automated factories.", "Controla robôs, mecanismos de limpeza e fábricas automatizadas.", "No icon.", "Sem ÍCONE."),
  program("crystal_ball", "controller", "Crystal Ball", "Bola de Cristal", 4, 1, 140,
    "Controls cameras and remote sensors.", "Controla câmeras e sensores remotos.", "No icon.", "Sem ÍCONE."),
  program("news_at_8", "controller", "News At 8", "Noticiário das 8", 4, 1, 140,
    "Accesses DataTerms and screamsheets through the Net.", "Acessa DataTerms e screamsheets pela Rede.", "No icon.", "Sem ÍCONE."),
  program("phone_home", "controller", "Phone Home", "Ligar pra Casa", {
    base: 5,
    situational: [{ value: 2, when: "to intercept calls", pt_when: "para interceptar chamadas" }],
  }, 1, 150,
    "Places and receives calls through the Net; intercepts calls at Strength 2.",
    "Faz e recebe chamadas pela Rede; intercepta ligações com Força 2.",
    "No icon.", "Sem ÍCONE."),

  program("databaser", "utility", "Databaser", "Base de Dados", 8, 2, 180,
    "Creates public files able to store information.", "Cria arquivos públicos para armazenar informação.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("alias", "utility", "Alias", "Alias", 6, 2, 160,
    "Changes a file name to an innocuous false title.", "Troca o nome de um arquivo por um título falso e inofensivo.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("re_rezz", "utility", "Re-Rezz", "Re-Rezz", 3, 1, 130,
    "Recompiles damaged programs or files when a copy is available.", "Recompila programas ou arquivos danificados quando existe uma cópia.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("instant_replay", "utility", "Instant Replay", "Replay Instantâneo", 8, 2, 180,
    "Records a Netrunner's trip so it can be retraced.", "Grava a viagem do Netrunner para que seus passos possam ser refeitos.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("gatemaster", "utility", "GateMaster", "Mestre dos Portões", 5, 1, 150,
    "Finds and destroys Virizz and Viral 15 without shutting down the deck.",
    "Encontra e destrói Virizz e Viral 15 sem desligar o terminal.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("padlock", "utility", "Padlock", "Cadeado", 4, 2, 160,
    "Prevents logon to a deck without the proper code.", "Impede login no terminal sem o código correto.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("electrolock", "utility", "ElectroLock", "Cadeado Eletrônico", 7, 2, 170,
    "Locks a public file as a Strength 3 Code Gate.", "Tranca um arquivo público como um Portão de Acesso de Força 3.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("filelocker", "utility", "Filelocker", "Filelocker", 4, 1, 140,
    "Locks a public file as a Strength 5 Code Gate using a chosen code word.",
    "Tranca um arquivo público como um Portão de Acesso de Força 5 usando uma palavra-código.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("netmap", "utility", "NetMap", "Mapeador da Rede", 4, 1, 150,
    "Maps major Net regions and adds +2 to System Knowledge checks made to find a place.",
    "Mapeia as principais regiões da Rede e soma +2 a testes de Conhecimento de Sistema para achar um lugar.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("file_packer", "utility", "File Packer", "Compactador de Arquivos", 4, 1, 140,
    "Compresses files to half their MU size; unpacking takes two turns.",
    "Compacta arquivos para metade do tamanho em UM; descompactar demora dois turnos.", "No fixed icon.", "Sem ÍCONE fixo."),
  program("backup", "utility", "Backup", "Backup", 4, 1, 140,
    "Copies programs except Anti-Program and Anti-Personnel software; data chips and a reader are required.",
    "Copia programas, exceto Anti-programa e Anti-pessoal; exige chips de dados e leitor.", "No fixed icon.", "Sem ÍCONE fixo."),

  program("imp", "demon", "Imp", "Imp", 3, 3, 1000,
    "Carries two programs as subroutines, which use the Demon's Strength.",
    "Transporta dois programas como subrotinas, que usam a Força do Demônio.",
    "A small orange sphere with playful red eyes.", "Uma pequena esfera laranja com olhos vermelhos divertidos.", { demon_capacity: 2 }),
  program("afreet", "demon", "Afreet", "Afreet", 3, 4, 1160,
    "Carries three programs as subroutines, which use the Demon's Strength.",
    "Transporta três programas como subrotinas, que usam a Força do Demônio.",
    "A tall muscular man in elegant clothes and a turban.", "Um homem alto e musculoso com roupas elegantes e turbante.", { demon_capacity: 3 }),
  program("succubus", "demon", "Succubus", "Succubus", 4, 4, 1200,
    "Carries four programs as subroutines, which use the Demon's Strength.",
    "Transporta quatro programas como subrotinas, que usam a Força do Demônio.",
    "A chrome winged feminine figure.", "Uma figura feminina cromada e alada.", { demon_capacity: 4 }),
  program("balron", "demon", "Balron", "Balron", 5, 5, 1240,
    "Carries four programs as subroutines, which use the Demon's Strength.",
    "Transporta quatro programas como subrotinas, que usam a Força do Demônio.",
    "A massive armored figure with an energy blade and green tendrils.",
    "Uma figura imensa e armadurada com lâmina de energia e tentáculos verdes.", { demon_capacity: 4 }),
];

const catalogPrograms = [
  ...programs.map((entry) => ({
    class_ids: [entry.class_id],
    memory_model: { kind: "fixed", amount: entry.memory },
    price_model: { kind: "fixed", amount: entry.price },
    platform: "cyberdeck",
    loadable: true,
    availability: "retail",
    catalog_scope: "standard",
    ...entry,
  })),
  ...supplements.standardPrograms,
  ...supplements.convertedPrograms,
];

const decks = [
  {
    id: "kirama_lpd_12",
    name: "Kirama LPD-12",
    description: "Premium cellular deck advertised with expanded memory and high speed.",
    pt_description: "Terminal celular premium anunciado com memória expandida e alta velocidade.",
    price: 8025,
    price_qualifier: "exact",
    cpu: null,
    memory: 20,
    speed: 3,
    data_wall: null,
    portable: true,
    cellular: true,
    armor_sp: null,
    options: ["cellular_link"],
    unspecified: ["cpu", "data_wall"],
    source: { book: "Cyberpunk 2020 Core Rulebook", pages: "148" },
  },
  {
    id: "sgi_elysia",
    name: "SGI Technologies “Elysia”",
    description: "A fully portable high-performance deck with expanded memory and eight-trode input.",
    pt_description: "Um terminal de alto desempenho completamente portátil, com memória expandida e entrada para oito 'Trodos.",
    price: 4260,
    price_qualifier: "exact",
    cpu: 1,
    memory: 20,
    speed: 3,
    data_wall: 5,
    portable: true,
    cellular: false,
    armor_sp: null,
    options: ["keyboard", "video_monitor_12m2", "eight_trode_input", "chip_reader"],
    unspecified: [],
    source: { book: "Cyberpunk 2020 Core Rulebook", pages: "133" },
  },
  {
    id: "zetatech_parraline_5750",
    name: "Zetatech Parraline 5750",
    description: "A midrange deck with improved speed, Data Wall and a large video monitor.",
    pt_description: "Um terminal intermediário com Velocidade e Muro de Dados melhorados e monitor de vídeo grande.",
    price: 3600,
    price_qualifier: "approximate",
    cpu: 1,
    memory: 10,
    speed: 2,
    data_wall: 4,
    portable: false,
    cellular: false,
    armor_sp: null,
    options: ["keyboard", "video_monitor_6m2", "chip_reader"],
    unspecified: [],
    source: { book: "Cyberpunk 2020 Core Rulebook", pages: "133" },
  },
];

const catalogDecks = [
  ...decks.map((entry) => ({
    price_model: { kind: "fixed", amount: entry.price },
    availability: "retail",
    catalog_scope: "standard",
    ...entry,
  })),
  ...supplements.decks,
];

const builder = {
  base_stats: { cpu: 1, memory: 10, speed: 0, data_wall: 2 },
  limits: { memory: [10, 20], speed: [0, 5], data_wall: [2, 10] },
  chassis: [
    { id: "standard", name: "Standard", pt_name: "Padrão", price: 1000, used_price: 500, portable: false, cellular: false, armor_sp: null },
    { id: "portable", name: "Portable", pt_name: "Portátil", price: 2000, portable: true, cellular: false, armor_sp: null },
    { id: "combat", name: "Combat", pt_name: "Combate", price: 3000, portable: true, cellular: false, armor_sp: 20 },
    { id: "cellular", name: "Cellular", pt_name: "Celular", price: 4000, portable: true, cellular: true, armor_sp: null },
    { id: "cyberlimb", name: "Cyberlimb", pt_name: "Cibermembro", price: 3000, portable: true, cellular: false, armor_sp: null, external_requirement: "compatible_cyberlimb" },
  ],
  upgrades: {
    expanded_memory: { id: "expanded_memory", name: "Expanded Memory (20 MU)", pt_name: "Memória Expandida (20 UM)", price: 5000, memory: 20 },
    speed_per_level: 2000,
    data_wall_per_level: 1000,
  },
  connections: [
    { id: "interface_plugs", name: "Interface Plugs", pt_name: "Conectores de Interface", price: 0, modifier: 0, external_requirement: "interface_plugs" },
    { id: "trodes", name: "'Trodes", pt_name: "'Trodos", price: 10, modifier: -2 },
    { id: "keyboard", name: "Keyboard", pt_name: "Teclado", price: 100, modifier: -4, immune_except: "Firestarter" },
  ],
  options: [
    { id: "video_monitor", name: "Video Monitor", pt_name: "Monitor de Vídeo", pricing: "per_unit", unit: "m²", price_per_unit: 1000, min: 1, max: 20 },
    { id: "printer", name: "Printer", pt_name: "Impressora", pricing: "fixed", price: 300 },
    { id: "chip_reader", name: "Chip Reader/Recorder", pt_name: "Leitor/Gravador de Chips", pricing: "fixed", price: 100 },
    { id: "extra_chips", name: "Extra Data Chips", pt_name: "Chips de Dados Extras", pricing: "per_unit", unit: "chip", pt_unit: "chip", price_per_unit: 10, min: 1, max: 50 },
    { id: "voice_box", name: "Voice Box", pt_name: "Caixa de Voz", pricing: "fixed", price: 300 },
    { id: "scanner", name: "Scanner", pt_name: "Scanner", pricing: "range", choices: [
      { id: "basic", name: "Basic", pt_name: "Básico", price: 100 },
      { id: "standard", name: "Standard", pt_name: "Padrão", price: 200 },
      { id: "professional", name: "Professional", pt_name: "Profissional", price: 300 },
    ] },
  ],
  source: { book: "Cyberpunk 2020 Core Rulebook", pages: "133-134" },
  editorial_notes: [
    "The Netrunning section prices 'Trodes at 10 eb; the general equipment table lists 20 eb.",
    "A standard deck is listed at 500 eb used or 1,000 eb new.",
  ],
};

builder.chassis.push(...supplements.builder.chassis);
builder.options.push(...supplements.builder.options);
builder.external_products = supplements.builder.external_products;

function localizedPrograms(locale) {
  const pt = locale === "pt-BR";
  return {
    schema_version: "2.0.0",
    locale,
    classes: classes.map(([id, en, br]) => ({ id, label: pt ? br : en })),
    programs: catalogPrograms.map((entry) => {
      const localized = {
        ...entry,
        name: pt ? (entry.pt_name || entry.name) : entry.name,
        effect: pt ? (entry.pt_effect || entry.effect) : entry.effect,
      };
      if (entry.icon || entry.pt_icon) localized.icon = pt ? (entry.pt_icon || entry.icon) : entry.icon;
      delete localized.pt_name;
      delete localized.pt_effect;
      delete localized.pt_icon;
      for (const modelKey of ["price_model", "memory_model"]) {
        const model = localized[modelKey];
        if (!model) continue;
        localized[modelKey] = { ...model };
        if (pt && model.pt_label) localized[modelKey].label = model.pt_label;
        delete localized[modelKey].pt_label;
      }
      if (pt && localized.strength.situational) {
        localized.strength = {
          ...localized.strength,
          situational: localized.strength.situational.map((rule) => ({
            value: rule.value,
            when: rule.pt_when || rule.when,
          })),
        };
      } else if (localized.strength.situational) {
        localized.strength = {
          ...localized.strength,
          situational: localized.strength.situational.map(({ value, when }) => ({ value, when })),
        };
      }
      return localized;
    }),
  };
}

function localizedDecks(locale) {
  const pt = locale === "pt-BR";
  const localizeBuilder = JSON.parse(JSON.stringify(builder));
  localizeBuilder.chassis.forEach((entry) => {
    if (pt) entry.name = entry.pt_name;
    delete entry.pt_name;
  });
  localizeBuilder.connections.forEach((entry) => {
    if (pt) entry.name = entry.pt_name;
    delete entry.pt_name;
  });
  localizeBuilder.options.forEach((entry) => {
    if (pt) entry.name = entry.pt_name;
    delete entry.pt_name;
    if (pt && entry.pt_description) entry.description = entry.pt_description;
    delete entry.pt_description;
    if (entry.choices) entry.choices.forEach((choice) => {
      if (pt) choice.name = choice.pt_name;
      delete choice.pt_name;
    });
    if (pt && entry.pt_unit) entry.unit = entry.pt_unit;
    delete entry.pt_unit;
  });
  localizeBuilder.external_products.forEach((entry) => {
    if (pt) entry.name = entry.pt_name;
    delete entry.pt_name;
    if (pt && entry.pt_description) entry.description = entry.pt_description;
    delete entry.pt_description;
    if (pt && entry.pt_unit) entry.unit = entry.pt_unit;
    delete entry.pt_unit;
  });
  if (pt) localizeBuilder.upgrades.expanded_memory.name = localizeBuilder.upgrades.expanded_memory.pt_name;
  delete localizeBuilder.upgrades.expanded_memory.pt_name;
  if (pt) {
    localizeBuilder.editorial_notes = [
      "A seção de Netrunning cobra 10 ed pelos 'Trodos; a tabela geral de equipamentos informa 20 ed.",
      "Um terminal padrão custa 500 ed usado ou 1.000 ed novo.",
    ];
  }

  return {
    schema_version: "2.0.0",
    locale,
    decks: catalogDecks.map((entry) => {
      const localized = { ...entry, description: pt ? entry.pt_description : entry.description };
      delete localized.pt_description;
      if (localized.price_model) {
        localized.price_model = { ...localized.price_model };
        if (pt && localized.price_model.pt_label) localized.price_model.label = localized.price_model.pt_label;
        delete localized.price_model.pt_label;
      }
      return localized;
    }),
    builder: localizeBuilder,
  };
}

for (const [filename, payload] of [
  ["programs.json", localizedPrograms("en-US")],
  ["programs.pt-BR.json", localizedPrograms("pt-BR")],
  ["cyberdecks.json", localizedDecks("en-US")],
  ["cyberdecks.pt-BR.json", localizedDecks("pt-BR")],
]) {
  fs.writeFileSync(path.join(dataDir, filename), `${JSON.stringify(payload, null, 2)}\n`);
}

console.log(`generated ${catalogPrograms.length} programs and ${catalogDecks.length} prebuilt cyberdecks in two locales`);
