"use strict";

const BOOK = "Rache Bartmoss' Brainware Blowout";

const classes = [
  ["multi_purpose", "Multi-Purpose", "Multiuso"],
  ["daemon", "Daemon", "Daemon"],
  ["systemware", "Systemware", "Systemware"],
  ["upgraded_datawall", "Upgraded Data Wall", "Muro de Dados Aprimorado"],
  ["transportation", "Transportation", "Transporte"],
  ["rache_special", "Rache Special", "Especial de Rache"],
  ["misc_anti_program", "Misc. Anti-Program", "Anti-programa Diverso"],
  ["base_link", "Base Link", "Link de Base"],
  ["virus", "Virus", "Vírus"],
  ["ambush", "Ambush", "Emboscada"],
  ["datawall", "Data Wall", "Muro de Dados"],
  ["code_gate", "Code Gate", "Portão de Acesso"],
  ["special", "Special", "Especial"],
];

function strengthModel(value) {
  if (typeof value === "number") return { base: value };
  if (typeof value === "string") return { display: value };
  return value;
}

function priceModel(value) {
  if (typeof value === "number") return { kind: "fixed", amount: value };
  return value;
}

function memoryModel(value, extra = {}) {
  if (extra.memory_model) return extra.memory_model;
  if (typeof value === "number") return { kind: "fixed", amount: value };
  return { kind: "variable", label: String(value || "N/A"), pt_label: String(value || "N/D") };
}

function p(id, classId, name, strength, memory, price, effect, ptEffect, page, extra = {}) {
  const platform = extra.platform || "cyberdeck";
  const modeledPrice = priceModel(price);
  return {
    id,
    class_id: classId,
    class_ids: extra.class_ids || [classId],
    name,
    strength: strengthModel(strength),
    memory: typeof memory === "number" ? memory : null,
    memory_model: memoryModel(memory, extra),
    price: modeledPrice.kind === "fixed" ? modeledPrice.amount : null,
    price_model: modeledPrice,
    effect,
    pt_effect: ptEffect,
    platform,
    loadable: extra.loadable ?? (platform === "cyberdeck" && typeof memory === "number" && modeledPrice.kind === "fixed"),
    availability: extra.availability || (modeledPrice.kind === "not_for_sale" ? "not_for_sale" : "retail"),
    catalog_scope: extra.catalog_scope || "standard",
    source: extra.source || { book: BOOK, pages: String(page) },
    ...extra,
  };
}

const standardPrograms = [
  p("pile_driver", "intrusion", "Pile Driver", 8, 4, 800, "Inflicts 4D6 damage to Data Wall STR.", "Causa 4D6 de dano à FOR do Muro de Dados.", 41),
  p("portal", "intrusion", "Portal", 2, 6, 750, "Opens a door through a Data Wall.", "Abre uma passagem através de um Muro de Dados.", 42),
  p("sledgehammer", "intrusion", "Sledgehammer", 6, 2, 600, "Inflicts 3D6 damage to Data Wall STR.", "Causa 3D6 de dano à FOR do Muro de Dados.", 42),
  p("termite", "intrusion", "Termite", 1, 2, 160, "Inflicts 1D6 damage to Data Wall STR.", "Causa 1D6 de dano à FOR do Muro de Dados.", 42),
  p("dupre", "decryption", "Dupré", "*", 4, 900, "Opens Code Gates and File Locks.", "Abre Portões de Acesso e Fechaduras de Arquivo.", 42),

  p("bulldog", "detection_alarm", "Bulldog", 6, 6, 600, "Detects entry, alerts its master and hangs up on the intruder.", "Detecta a entrada, alerta seu mestre e derruba a conexão do intruso.", 43),
  p("cry_baby", "detection_alarm", "Cry Baby", 4, 4, 430, "Tags itself and adds 4 to traces when copied.", "Marca a própria cópia e acrescenta 4 às tentativas de rastreio.", 44),
  p("clairvoyance", "detection_alarm", "Clairvoyance", 4, 4, 720, "Detects and identifies icons within two subgrids, including invisible icons.", "Detecta e identifica ÍCONES em duas subgrades, inclusive os invisíveis.", 44),
  p("guard_dog", "detection_alarm", "Guard Dog", 4, 5, 720, "Invisible alarm that detects entry and alerts its master.", "Alarme invisível que detecta entradas e alerta seu mestre.", 44),
  p("looking_glass", "detection_alarm", "Looking Glass", "1-6", 3, { kind: "formula", base: 270, label: "270+ eb; varies with STR", pt_label: "270+ ed; varia com a FOR" }, "Detects disguised icons.", "Detecta ÍCONES disfarçados.", 44, { loadable: false, availability: "quote" }),
  p("shadow", "detection_alarm", "Shadow", 4, 3, 540, "Degrades evasion programs.", "Degrada programas de evasão.", 45),
  p("smarteye", "detection_alarm", "Smarteye", 3, 4, 620, "Detects programs within ten spaces and identifies attack programs.", "Detecta programas em dez espaços e identifica programas de ataque.", 45),

  p("cascade", "anti_system", "Cascade", 7, 4, 900, "Erases 2D6 MU of random memory.", "Apaga 2D6 UM aleatórias da memória.", 46),
  p("grid_wave", "anti_system", "Grid Wave", 7, 8, 20000, "Distorts Interface-generation algorithms.", "Distorce algoritmos de geração de Interface.", 46),
  p("hellburner", "anti_system", "HellBurner", 6, 5, 1000, "Destroys the target CPU.", "Destrói a CPU alvo.", 46),
  p("pi_in_the_face", "anti_system", "Pi in the Face", 5, 4, 800, "Forces a CPU to calculate Pi.", "Força uma CPU a calcular Pi.", 47),
  p("swarm", "anti_system", "Swarm", 1, 7, 3000, "Makes the target system produce more Swarm programs.", "Faz o sistema alvo produzir mais programas Swarm.", 47),
  p("typhoid_mary", "anti_system", "Typhoid Mary", 6, 8, 2400, "Infiltrates a runner and deletes files.", "Infiltra o terminal do runner e apaga arquivos.", 48),
  p("weed", "anti_system", "Weed", 2, 3, 630, "Reduces target Speed by 1 per successful attack.", "Reduz a Velocidade do alvo em 1 por ataque bem-sucedido.", 48),

  p("black_mask", "evasion_stealth", "Black Mask", "1-5", "3-4", { kind: "formula", base: 200, label: "200+ eb; varies by version", pt_label: "200+ ed; varia por versão" }, "Makes an icon look like someone or something else.", "Faz um ÍCONE parecer outra pessoa ou coisa.", 48, { loadable: false, availability: "quote" }),
  p("domino", "evasion_stealth", "Domino", 5, 3, 1500, "Makes an icon look native to the current locale.", "Faz um ÍCONE parecer nativo da região atual.", 49),
  p("george", "evasion_stealth", "George", 4, 1, 300, "Adds 4 to Trace Difficulty.", "Acrescenta 4 à Dificuldade de Rastreio.", 49),
  p("spore", "evasion_stealth", "Spore", 7, 7, 2320, "AI suicide-replication sends copies of the core program into the Net.", "Uma IA de replicação suicida espalha cópias do programa central pela Rede.", 50),
  p("superballs", "evasion_stealth", "Superballs", 3, 4, 500, "Distracts the target, imposing -3 Initiative.", "Distrai o alvo e impõe -3 à Iniciativa.", 50),

  p("deckshield_one", "protection", "DeckShield One", 6, 2, 320, "Adds +3 to the deck's Data Wall.", "Acrescenta +3 ao Muro de Dados do deck.", 50),
  p("outjack", "protection", "OutJack", 2, 4, 150, "Jacks the runner out when their body reaches Critical damage.", "Desconecta o runner quando seu corpo atinge dano Crítico.", 51),

  p("bunnies", "anti_program", "Bunnies", 4, 3, 440, "Overloads Vampyre programs.", "Sobrecarrega programas Vampyre.", 52),
  p("chameleon", "anti_program", "Chameleon", 4, 6, 1650, "A Killer IV hidden behind an active disguise.", "Um Killer IV escondido por um disfarce ativo.", 52),
  p("dogcatcher", "anti_program", "Dogcatcher", 10, 7, 1176, "Chases and destroys tracing Dog programs.", "Persegue e destrói programas Cão usados para rastrear.", 52),
  p("eradicator", "anti_program", "Eradicator", { base: 5, situational: [{ value: 8, when: "against Spore", pt_when: "contra Spore" }] }, 7, 1600, "Acts as Killer V and destroys AI spores.", "Age como Killer V e destrói esporos de IA.", 53),
  p("exorcist", "anti_program", "Exorcist", 4, 3, 600, "Removes the effects of Possession.", "Remove os efeitos de Possessão.", 53),
  p("mirror", "anti_program", "Mirror", 5, 4, 1200, "Rebounds Hellbolts.", "Rebate Hellbolts.", 53),
  p("ninja", "anti_program", "Ninja", 5, 5, 1520, "An invisible Killer.", "Um Killer invisível.", 53),
  p("possessor", "anti_program", "Possessor", 4, 3, 1000, "Possesses other programs.", "Possui outros programas.", 53),
  p("raven", "anti_program", "Raven", 5, 4, 1000, "Blinds any program.", "Cega qualquer programa.", 54),
  p("wolf", "anti_program", "Wolf", 4, 6, 1500, "A Killer disguised as a Watchdog.", "Um Killer disfarçado de Watchdog.", 54),

  p("ball_and_chain", "anti_personnel", "Ball and Chain", 3, 3, 5000, "Slows runner movement to one square for 1D6+3 turns.", "Reduz o movimento do runner a um quadrado por 1D6+3 turnos.", 54),
  p("cerebus", "anti_personnel", "Cerebus", 6, 8, 9500, "A Pit Bull that fires Hellbolts.", "Um Pit Bull que dispara Hellbolts.", 54),
  p("fatal_attractor", "anti_personnel", "Fatal Attractor", 7, 7, 10750, "A Hellhound hidden behind an attractive disguise.", "Um Hellhound escondido por um disfarce atraente.", 55),
  p("king_trail", "anti_personnel", "King Trail", 3, 2, 3500, "Leaves a glowing trail behind the runner for 3D6 turns.", "Deixa um rastro brilhante atrás do runner por 3D6 turnos.", 56),
  p("pepe_le_pue", "anti_personnel", "Pepe Le Pue", 6, 5, 7750, "Reduces the runner's INT and REF for 1D6+1 turns.", "Reduz INT e REF do runner por 1D6+1 turnos.", 56),
  p("psychodrome", "anti_personnel", "Psychodrome", 4, 11, 14000, "Causes unconsciousness for 1D6 hours and leaves lasting trauma.", "Causa inconsciência por 1D6 horas e deixa trauma duradouro.", 56),
  p("red_out", "anti_personnel", "Red-Out", 5, 4, 6750, "Paralyzes the runner for 1D6 turns.", "Paralisa o runner por 1D6 turnos.", 57),
  p("stationery", "anti_personnel", "Stationery", 4, 6, 10000, "Prevents the runner from moving for five turns.", "Impede o runner de se mover por cinco turnos.", 57),
  p("audio_virus", "anti_personnel", "The Audio Virus", 5, 5, 8000, "Reduces INT and REF until the runner destroys the program.", "Reduz INT e REF até que o runner destrua o programa.", 57),
  p("threat", "anti_personnel", "Threat", 5, 6, 7000, "Makes the runner so nervous that they jack out.", "Deixa o runner nervoso o bastante para se desconectar.", 57),
  p("werewolf", "anti_personnel", "Werewolf", 6, 6, 13000, "An invisible Hellhound variant.", "Uma variante invisível de Hellhound.", 58),

  p("pictures_worth", "multi_purpose", "A Picture's Worth", 2, 6, 1200, "Hides data inside virtual realities.", "Oculta dados dentro de realidades virtuais.", 58),
  p("black_sky", "multi_purpose", "Black Sky", 5, 8, 4480, "Hides the runner in a cloud that attacks programs with lightning.", "Oculta o runner numa nuvem que ataca programas com relâmpagos.", 58),
  p("dummy", "multi_purpose", "Dummy", 1, 2, 450, "A fake, disguisable program.", "Um programa falso que pode ser disfarçado.", 59),
  p("evil_twin", "multi_purpose", "Evil Twin", 8, 7, 2700, "Combines Shield and Krash functions.", "Combina as funções de Shield e Krash.", 59),
  p("igor", "multi_purpose", "IGOR", 4, 7, 4800, "An online assistant.", "Um assistente online.", 59),
  p("lightning_bug", "multi_purpose", "Lightning Bug", "2 each", 6, 1540, "Six bugs attack ICE before it can act.", "Seis insetos atacam o ICE antes que ele possa agir.", 60),
  p("omnivore", "multi_purpose", "Omnivore", 3, 8, 18500, "Derezzes programs, fries CPU chips and temporarily reduces INT by 2D6.", "Descompila programas, frita chips de CPU e reduz temporariamente INT em 2D6.", 60),
  p("scribe", "multi_purpose", "Scribe", 6, 8, { kind: "not_for_sale", label: "N/A", pt_label: "N/D" }, "Stops and disassembles programs for copying.", "Detém e desmonta programas para cópia.", 60, { availability: "not_for_sale", loadable: false }),
  p("wolfpack", "multi_purpose", "Wolfpack", 6, 8, 15200, "Damages programs and Demons for 1D6 and runners for 1D10.", "Causa 1D6 de dano a programas e Demônios e 1D10 a runners.", 60),

  p("knevil", "controller", "Knevil", 4, 3, 220, "Operates remote vehicles autonomously.", "Opera veículos remotos de forma autônoma.", 61),
  p("rockerbit", "controller", "Rockerbit", 4, 2, 200, "Operates microphones and voice boxes autonomously.", "Opera microfones e caixas de voz de forma autônoma.", 61),
  p("terminator_controller", "controller", "Terminator", 4, 2, 260, "Controls terminals.", "Controla terminais.", 61),

  p("breadcrumbs", "utility", "Breadcrumbs", 4, 4, 290, "Finds new LDL link routes.", "Encontra novas rotas de link LDL.", 62),
  p("cartographer", "utility", "Cartographer", 6, 3, 200, "Maps Data Fortresses.", "Mapeia Fortalezas de Dados.", 62),
  p("dolphin_programs", "utility", "Dolphin Programs", 3, 5, 310, "Cleans Pacifica of junk data.", "Limpa dados inúteis de Pacifica.", 62),
  p("flare_gun", "utility", "Flare Gun", 2, 2, 300, "Broadcasts a Net distress signal.", "Emite um sinal de socorro pela Rede.", 63),
  p("flip_switch_2", "utility", "Flip Switch 2.0", 10, 0, 225, "Controls a Flip Switch.", "Controla um Flip Switch.", 63),
  p("flip_switch_3", "utility", "Flip Switch 3.0", 10, 0, 250, "Controls a Flip Switch with enhanced iconography.", "Controla um Flip Switch com iconografia aprimorada.", 63),
  p("guest_book", "utility", "Guest Book", 4, 2, 200, "Observes activity in an area.", "Observa a atividade de uma área.", 63),
  p("multinetter", "utility", "Multinetter", 10, 20, 2000, "Allows multiple runners to operate through one computer.", "Permite que vários runners operem por um único computador.", 63),
  p("translator_2000", "utility", "Translator 2000", 4, 2, 240, "Turns pictures into virtual objects.", "Transforma imagens em objetos virtuais.", 64),

  p("afreet_ii", "demon", "Afreet II", 3, 4, 1160, "Carries three programs.", "Carrega três programas.", 64, { capacity: 3, version_of: "afreet" }),
  p("balron_ii", "demon", "Balron II", 5, 5, 1240, "Carries four programs.", "Carrega quatro programas.", 64, { capacity: 4, version_of: "balron" }),
  p("imp_ii", "demon", "Imp II", 3, 3, 1000, "Carries two programs.", "Carrega dois programas.", 65, { capacity: 2, version_of: "imp" }),
  p("succubus_ii", "demon", "Succubus II", 4, 4, 1200, "Carries four programs.", "Carrega quatro programas.", 65, { capacity: 4, version_of: "succubus" }),
  p("thug", "demon", "Thug", 3, 6, 10440, "Has permanent subroutines that damage program STR and runners for 1D6.", "Possui sub-rotinas permanentes que causam 1D6 de dano à FOR de programas e a runners.", 65),
  p("vampyre_ii", "demon", "Vampyre II", 6, 7, 2300, "Can absorb up to six programs.", "Pode absorver até seis programas.", 65, { capacity: 6 }),

  p("cream_pie", "daemon", "Cream Pie", 7, 7, 1125, "Carries Poison Flatline, Killer IV and Murphy.", "Carrega Poison Flatline, Killer IV e Murphy.", 66, { capacity: 3 }),
  p("eavesdropper", "daemon", "Eavesdropper", 3, 6, 975, "Carries one program, usually Databaser.", "Carrega um programa, normalmente Databaser.", 66, { capacity: 1 }),

  p("systemware_cloak", "systemware", "Cloak", 6, null, { kind: "per_cpu", amount: 4000, label: "4,000 eb per CPU", pt_label: "4.000 ed por CPU" }, "Cloaks an entire Data Fortress.", "Oculta uma Fortaleza de Dados inteira.", 66, { platform: "data_fortress", loadable: false, availability: "quote", memory_model: { kind: "per_cpu", amount: 5, label: "5 MU per CPU", pt_label: "5 UM por CPU" } }),
  p("dazzler", "systemware", "Dazzler", 5, 14, 14000, "A disguised VR cell with trace capability.", "Uma célula de RV disfarçada com capacidade de rastreio.", 66, { platform: "data_fortress", loadable: false }),
  p("monitor_systemware", "systemware", "Monitor", 4, 7, 950, "Roving internal Net security.", "Segurança interna móvel da Rede.", 67, { platform: "data_fortress", loadable: false }),
  p("panzer", "systemware", "Panzer", 8, 7, 20000, "A Monitor that inflicts 1D6 damage to runners and program STR.", "Um Monitor que causa 1D6 de dano a runners e à FOR de programas.", 67, { platform: "data_fortress", loadable: false }),
  p("shrouded_gate", "systemware", "Shrouded Gate", "variable", 4, { kind: "formula", base: 3000, per_strength: 1000, label: "3,000 + 1,000 eb/STR", pt_label: "3.000 + 1.000 ed/FOR" }, "Makes a Code Gate invisible.", "Torna um Portão de Acesso invisível.", 67, { platform: "data_fortress", loadable: false, availability: "quote", source: { book: "Rache Bartmoss' Guide to the Net", pages: "149" } }),
  p("anti_program_datawalls", "upgraded_datawall", "Anti-Program Data Walls", "1-5", null, { kind: "formula", base: 4960, label: "4,960+ eb", pt_label: "4.960+ ed" }, "Data Walls that attack intrusion programs.", "Muros de Dados que atacam programas de intrusão.", 67, { platform: "data_fortress", loadable: false, availability: "quote" }),
  p("anti_personnel_datawalls", "upgraded_datawall", "Anti-Personnel Data Walls", "1-5", null, { kind: "formula", base: 31000, label: "31,000+ eb", pt_label: "31.000+ ed" }, "Data Walls that attack runners.", "Muros de Dados que atacam runners.", 68, { platform: "data_fortress", loadable: false, availability: "quote" }),

  p("trailer_hitch", "transportation", "Trailer Hitch", 1, 3, 300, "Adds 20% MU and reduces Speed by 1.", "Acrescenta 20% de UM e reduz a Velocidade em 1.", 68, { deck_effects: { memory_multiplier: 1.2, speed_modifier: -1 } }),
  p("eighteen_wheeler", "transportation", "18-Wheeler", 1, 4, 500, "Doubles remaining MU after its own 4 MU cost and reduces Speed by 1.", "Duplica as UM restantes após seu próprio custo de 4 UM e reduz a Velocidade em 1.", 68, { deck_effects: { double_remaining_memory: true, speed_modifier: -1 } }),

  p("bone", "rache_special", "Bone", 4, 4, 270, "Attracts Dog programs from across the Net.", "Atrai programas Cão de toda a Rede.", 68, { availability: "restricted" }),
  p("pirate_uplink", "rache_special", "Pirate Uplink", 5, 7, { kind: "not_for_sale", label: "N/A", pt_label: "N/D" }, "Alerts LDLs to illegal calls.", "Alerta LDLs sobre chamadas ilegais.", 68, { availability: "not_for_sale", loadable: false }),
  p("raches_seeya", "rache_special", "Rache's SeeYa", 6, 2, { kind: "not_for_sale", label: "N/A", pt_label: "N/D" }, "Functions as SeeYa at greater Strength.", "Funciona como SeeYa com FOR maior.", 68, { availability: "not_for_sale", loadable: false }),
  p("rice_burner", "rache_special", "Rice Burner", 2, "2+special", { kind: "not_for_sale", label: "N/A", pt_label: "N/D" }, "Adds 1 to Net movement allowance.", "Acrescenta 1 ao deslocamento na Rede.", 68, { availability: "not_for_sale", loadable: false }),
  p("sidewalker", "rache_special", "SideWalker", 3, 3, { kind: "not_for_sale", label: "N/A", pt_label: "N/D" }, "Allows walking on the sides of the sidewalks in the Olympia region.", "Permite caminhar pelas laterais das calçadas na região de Olympia.", 68, { availability: "not_for_sale", loadable: false }),
];

const conversion = { catalog_scope: "netrunner_conversion", availability: "referee_approval" };
const convertedPrograms = [
  p("nr_dwarf", "intrusion", "Dwarf", 3, 3, 230, "A strong Worm variant.", "Uma variante forte de Worm.", 70, conversion),
  p("nr_grubb", "intrusion", "Grubb", 1, 3, 210, "A weak Worm variant.", "Uma variante fraca de Worm.", 70, conversion),
  p("nr_japanese_water_torture", "intrusion", "Japanese Water Torture", 3, 4, 260, "Takes two turns to work; each extra turn adds +1 STR, to a maximum of 7.", "Leva dois turnos para agir; cada turno extra acrescenta +1 FOR, até o máximo de 7.", 71, conversion),
  p("nr_ramming_piston", "intrusion", "Ramming Piston", 10, 3, 900, "An extremely loud Hammer that inflicts 5D6 damage to Data Wall STR.", "Um Hammer absurdamente barulhento que causa 5D6 de dano à FOR do Muro de Dados.", 71, conversion),
  p("nr_cyfermaster", "decryption", "Cyfermaster", 6, 3, 700, "A Raffles variant.", "Uma variante de Raffles.", 71, conversion),
  p("nr_tinweasel", "decryption", "Tinweasel", 3, 4, 300, "A stealthy decryption program.", "Um programa furtivo de decifração.", 71, conversion),

  p("nr_canis_major_minor", "detection_alarm", "Canis Major/Minor", 4, 5, 610, "Watchdog variants.", "Variantes de Watchdog.", 72, conversion),
  p("nr_data_raven", "detection_alarm", "Data Raven", 5, 6, 1000, "A patient Bloodhound variant.", "Uma variante paciente de Bloodhound.", 72, conversion),
  p("nr_fang", "detection_alarm", "Fang", 4, 6, 1300, "A Pit Bull variant.", "Uma variante de Pit Bull.", 73, conversion),
  p("nr_fang_2", "detection_alarm", "Fang 2.0", 5, 6, 1600, "An improved Pit Bull variant.", "Uma variante aprimorada de Pit Bull.", 73, conversion),
  p("nr_fetch_4_01_1", "detection_alarm", "Fetch 4.01.1", 6, 5, 700, "A Bloodhound variant.", "Uma variante de Bloodhound.", 72, conversion),
  p("nr_hunter", "detection_alarm", "Hunter", 5, 5, 900, "A Bloodhound variant.", "Uma variante de Bloodhound.", 72, conversion),
  p("nr_mouse", "detection_alarm", "Mouse", 5, 5, 350, "Creeps into a fortress to look around.", "Entra sorrateiramente numa Fortaleza para observar.", 72, conversion),
  p("nr_netspace_inverter", "detection_alarm", "Netspace Inverter", 3, 4, 540, "A reconnaissance-drone SeeYa variant.", "Uma variante de SeeYa que age como drone de reconhecimento.", 72, conversion),
  p("nr_rex", "detection_alarm", "Rex", 3, 6, 1000, "A Pit Bull variant.", "Uma variante de Pit Bull.", 73, conversion),

  p("nr_asp", "anti_system", "Asp", 4, 2, 800, "A Flatline variant.", "Uma variante de Flatline.", 73, conversion),
  p("nr_cascade_ii", "anti_system", "Cascade II", 3, 2, 800, "Makes programs switch on and off at random.", "Liga e desliga programas aleatoriamente.", 73, conversion),
  p("nr_clown", "anti_system", "Clown", 3, 5, 1130, "Imposes -1 STR on programs and -1 Initiative on runners, sysops and AIs.", "Impõe -1 FOR a programas e -1 Iniciativa a runners, sysops e IAs.", 73, conversion),
  p("nr_fragmentation_storm", "anti_system", "Fragmentation Storm", 4, 3, 1000, "A Poison Flatline variant.", "Uma variante de Poison Flatline.", 74, conversion),
  p("nr_poltergeist", "anti_system", "Poltergeist", 5, 3, 660, "A Viral 15 variant.", "Uma variante de Viral 15.", 74, conversion),
  p("nr_pox", "anti_system", "Pox", 4, 2, 800, "Has a 30% chance to derez ICE when it activates.", "Tem 30% de chance de descompilar o ICE quando ele é ativado.", 74, conversion),
  p("nr_scatter_shot", "anti_system", "Scatter Shot", 4, 3, 660, "A Poison Flatline variant.", "Uma variante de Poison Flatline.", 74, conversion),
  p("nr_vacuum_link", "anti_system", "Vacuum Link", 5, 3, 1200, "Relocates the runner outside the Data Fortress.", "Reposiciona o runner para fora da Fortaleza de Dados.", 74, conversion),

  p("nr_cloak", "evasion_stealth", "Cloak", 5, 2, 2000, "An Invisibility variant.", "Uma variante de Invisibility.", 75, conversion),
  p("nr_open_ended_mileage", "evasion_stealth", "Open-Ended Mileage", 4, 5, 330, "Routes traces through an extended phone link.", "Desvia rastreios por uma conexão telefônica prolongada.", 75, conversion),
  p("nr_rabbit", "evasion_stealth", "Rabbit", { base: 1, situational: [{ value: 5, when: "against Dog programs", pt_when: "contra programas Cão" }] }, 2, 360, "Has STR 5 against Dogs and adds +2 Speed.", "Tem FOR 5 contra Cães e acrescenta +2 à Velocidade.", 75, conversion),
  p("nr_vewy_vewy_quiet", "evasion_stealth", "Vewy Vewy Quiet", 4, 2, 400, "A Stealth program.", "Um programa de Furtividade.", 75, conversion),

  p("nr_joan_of_arc", "protection", "Joan of Arc", 3, 2, 190, "Absorbs Anti-Personnel damage.", "Absorve dano Anti-pessoal.", 76, conversion),

  p("nr_banpei", "anti_program", "Banpei", 1, 5, 1280, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 76, conversion),
  p("nr_black_dahlia", "anti_program", "Black Dahlia", 7, 7, 2000, "An alluring Killer that inflicts 2D6 damage.", "Um Killer sedutor que causa 2D6 de dano.", 76, conversion),
  p("nr_codeslinger", "anti_program", "Codeslinger", 3, 3, 1000, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 77, conversion),
  p("nr_darc_knight", "anti_program", "D'Arc Knight", 3, 5, 1360, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 76, conversion),
  p("nr_data_naga", "anti_program", "Data Naga", 6, 5, 1480, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 76, conversion),
  p("nr_dropp", "anti_program", "Dropp", 4, 4, 800, "Defends against Anti-Personnel programs, damages program STR and then jacks the runner out.", "Defende contra programas Anti-pessoal, danifica a FOR do programa e então desconecta o runner.", 77, conversion),
  p("nr_ice_pick_willie", "anti_program", "Ice Pick Willie", 2, 5, 1320, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 76, conversion),
  p("nr_looney_goon", "anti_program", "Looney Goon", 2, 3, 600, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 77, conversion),
  p("nr_raptor", "anti_program", "Raptor", 2, 4, 1200, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 77, conversion),
  p("nr_sentinels_prime", "anti_program", "Sentinels Prime", 5, 5, 1440, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 76, conversion),
  p("nr_shaka", "anti_program", "Shaka", 2, 5, 1320, "A Killer variant.", "Uma variante de Killer.", 76, conversion),
  p("nr_snowball", "anti_program", "Snowball", "2+", 5, 3000, "Gains +2 STR whenever it destroys another program.", "Recebe +2 FOR sempre que destrói outro programa.", 77, conversion),
  p("nr_startup_immolator", "anti_program", "Startup Immolator", 4, 5, 1280, "Destroys a target program if it has just been rezzed.", "Destrói o programa alvo se ele acabou de ser ativado.", 77, conversion),
  p("nr_triggerman", "anti_program", "Triggerman", 4, 5, 1400, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 76, conversion),
  p("nr_wild_card", "anti_program", "Wild Card", 1, 3, 920, "A Killer that inflicts 1D6 damage.", "Um Killer que causa 1D6 de dano.", 78, conversion),

  p("nr_ai_boon", "misc_anti_program", "AI Boon", "1-6", 7, 3600, "Damages Data Walls and programs for 1D6 and decrypts Code Gates.", "Causa 1D6 de dano a Muros de Dados e programas e decifra Portões de Acesso.", 78, { ...conversion, class_ids: ["misc_anti_program", "intrusion", "decryption", "anti_program"] }),
  p("nr_blink", "misc_anti_program", "Blink", 5, 7, 1500, "Damages Data Walls and programs for 1D6 and decrypts Code Gates, but may crash.", "Causa 1D6 de dano a Muros de Dados e programas e decifra Portões de Acesso, mas pode travar.", 78, { ...conversion, class_ids: ["misc_anti_program", "intrusion", "decryption", "anti_program"] }),
  p("nr_bartmoss_memorial_icebreaker", "misc_anti_program", "Bartmoss Memorial ICEbreaker", 4, 2, 1500, "Compiles four programs chosen from Anti-Program, Intrusion and Decryption.", "Compila quatro programas escolhidos entre Anti-programa, Intrusão e Decifração.", 78, { ...conversion, class_ids: ["misc_anti_program", "intrusion", "decryption", "anti_program"] }),

  p("nr_bolter_cluster", "anti_personnel", "Bolter Cluster", 4, 4, 8000, "Inflicts 4D6 damage to the runner.", "Causa 4D6 de dano ao runner.", 79, conversion),
  p("nr_cinderella", "anti_personnel", "Cinderella", 6, 4, 9000, "A Firestarter variant.", "Uma variante de Firestarter.", 79, conversion),
  p("nr_code_corpse", "anti_personnel", "Code Corpse", 5, 4, 7500, "A Zombie variant.", "Uma variante de Zombie.", 79, conversion),
  p("nr_cortical_scrub", "anti_personnel", "Cortical Scrub", 3, 4, 6500, "A Brainwipe variant.", "Uma variante de Brainwipe.", 79, conversion),
  p("nr_data_darts", "anti_personnel", "Data Darts", 4, 4, 5500, "Inflicts 3D6 damage to the runner.", "Causa 3D6 de dano ao runner.", 79, conversion),
  p("nr_homewrecker", "anti_personnel", "Homewrecker", 5, 4, 8000, "A Firestarter variant.", "Uma variante de Firestarter.", 79, conversion),
  p("nr_mastiff", "anti_personnel", "Mastiff", 5, 6, 12000, "A Hellhound variant that reduces INT, inflicts damage and alerts its master.", "Uma variante de Hellhound que reduz INT, causa dano e alerta seu mestre.", 79, conversion),
  p("nr_neural_blade", "anti_personnel", "Neural Blade", 3, 4, 6250, "A Sword variant.", "Uma variante de Sword.", 79, conversion),
  p("nr_shock_r", "anti_personnel", "Shock.r", 3, 5, 6000, "A Stun variant.", "Uma variante de Stun.", 80, conversion),
  p("nr_tko_2", "anti_personnel", "TKO 2.0", 4, 3, 6250, "A Knockout variant.", "Uma variante de Knockout.", 80, conversion),

  p("nr_butcher_boy", "utility", "Butcher Boy", 3, 7, 550, "Fills out false purchase orders.", "Preenche ordens de compra falsas.", 80, conversion),
  p("nr_expert_schedule_analyzer", "utility", "Expert Schedule Analyzer", 4, 3, 250, "Skims files from an administration or accounting sector at 1 MU per turn.", "Copia arquivos de um setor administrativo ou contábil a 1 UM por turno.", 80, conversion),
  p("nr_expert_scheme_analyzer", "utility", "Expert Scheme Analyzer", 3, 5, 330, "Correlates data and presents a synopsis.", "Correlaciona dados e apresenta uma sinopse.", 80, conversion),
  p("nr_microtech_ai_interface", "utility", "Microtech AI Interface", 2, 5, 330, "Doubles the data a runner can skim each turn.", "Duplica a quantidade de dados que o runner pode copiar por turno.", 80, conversion),
  p("nr_mystery_box", "utility", "Mystery Box", 5, 4, 300, "Randomly steals programs.", "Rouba programas aleatoriamente.", 81, conversion),
  p("nr_newsgroup_filter", "utility", "Newsgroup Filter", 4, 6, 200, "Skims newsgroups.", "Copia dados de grupos de notícias.", 81, conversion),
  p("nr_rd_protocol_files", "utility", "R&D Protocol Files", 4, 3, 250, "Skims files from a specific R&D sector at 1 MU per turn.", "Copia arquivos de um setor específico de P&D a 1 UM por turno.", 81, conversion),
  p("nr_shredder_uplink_protocol", "utility", "Shredder Uplink Protocol", 5, 3, 250, "Accesses shredded files in a trash buffer.", "Acessa arquivos fragmentados no buffer de lixo.", 82, conversion),
  p("nr_zetatech_software_installer", "utility", "Zetatech Soft-Ware Installer", 1, 1, 300, "Packs one program to half MU and unpacks it instantly at -1 Initiative.", "Compacta um programa para metade das UM e o descompacta instantaneamente com -1 Iniciativa.", 82, conversion),

  p("nr_baedekers_road_map", "base_link", "Baedeker's Road Map", 2, 1, 130, "Sets up multiple phone links for the runner.", "Configura várias conexões telefônicas para o runner.", 83, conversion),
  p("nr_bakdoor", "base_link", "Bakdoor", 3, 2, { kind: "formula", base: 600, label: "600+ eb", pt_label: "600+ ed" }, "Creates Road Map routes with back doors through private phones.", "Cria rotas de Road Map com backdoors por telefones privados.", 83, { ...conversion, availability: "quote", loadable: false }),

  p("nr_false_echo", "daemon", "False Echo", 2, 6, 380, "Triggers false alarms.", "Dispara alarmes falsos.", 83, conversion),
  p("nr_i_spy", "daemon", "i Spy", 3, 6, 400, "An Eavesdropper variant.", "Uma variante de Eavesdropper.", 84, conversion),

  p("nr_boardwalk", "virus", "Boardwalk", 3, 7, 1080, "An Eavesdropper for administration and accounting sectors.", "Um Eavesdropper para setores administrativos e contábeis.", 84, conversion),
  p("nr_cockroach", "virus", "Cockroach", 5, 7, 1600, "Eats files and turns them into more Cockroaches.", "Devora arquivos e os transforma em mais Cockroaches.", 84, conversion),
  p("nr_deep_thought", "virus", "Deep Thought", 3, 7, 1080, "An Eavesdropper for R&D sectors.", "Um Eavesdropper para setores de P&D.", 84, conversion),
  p("nr_fait_accompli", "virus", "Fait Accompli", 3, 7, 570, "Subtly corrupts project files.", "Corrompe sutilmente arquivos de projeto.", 84, conversion),
  p("nr_gremlins", "virus", "Gremlins", 4, 7, 7000, "Produces more Gremlins and randomly launches programs.", "Produz mais Gremlins e inicia programas aleatoriamente.", 85, conversion),
  p("nr_incubator", "virus", "Incubator", 2, 6, 760, "Reproduces other programs.", "Reproduz outros programas.", 85, conversion),
  p("nr_pattels_virus", "virus", "Pattel's Virus", 6, 7, 2200, "Weakens one type of ICE.", "Enfraquece um tipo de ICE.", 85, conversion),
  p("nr_skiwiss", "virus", "Skiwiss", 4, 7, 1320, "Inflates project costs.", "Infla os custos de um projeto.", 86, conversion),

  p("nr_ambush", "ambush", "Ambush", "variable", null, { kind: "variable", label: "Variable", pt_label: "Variável" }, "Adds Invisibility to ICE.", "Acrescenta Invisibilidade ao ICE.", 86, { ...conversion, platform: "data_fortress", loadable: false, availability: "quote" }),
  p("nr_chimera", "ambush", "Chimera", 5, 4, 1160, "An invisible Manticore.", "Uma Manticore invisível.", 86, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_soulkiller_vacant", "ambush", "Soulkiller (Vacant)", 4, null, 500000, "Drains 1D6 INT per turn into computer memory.", "Drena 1D6 INT por turno para a memória do computador.", 86, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_trap", "ambush", "Trap!", "4×3", null, 200000, "A node containing three Asps.", "Um nó contendo três Asps.", 87, { ...conversion, platform: "data_fortress", loadable: false }),

  p("nr_crystal_wall", "datawall", "Crystal Wall", "3+", null, 3000, "A Data Wall.", "Um Muro de Dados.", 87, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_datawall", "datawall", "Datawall", "0+", null, 500, "A Data Wall.", "Um Muro de Dados.", 87, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_datawall_2", "datawall", "Datawall 2.0", "1+", null, 1000, "A Data Wall.", "Um Muro de Dados.", 87, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_fire_wall", "datawall", "Fire Wall", "4+", null, 4000, "A Data Wall.", "Um Muro de Dados.", 87, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_laser_wire", "datawall", "Laser Wire", "2+/2", null, 34000, "A wall that inflicts 1D6 damage to the runner.", "Um muro que causa 1D6 de dano ao runner.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_razor_wire", "datawall", "Razor Wire", "3+/3", null, 36000, "A wall that inflicts 2D6 damage to the runner.", "Um muro que causa 2D6 de dano ao runner.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_reinforced_wall", "datawall", "Reinforced Wall", "4+", null, 4000, "A Data Wall.", "Um Muro de Dados.", 87, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_rock_is_strong", "datawall", "Rock is Strong", "5+", null, 5000, "A Data Wall.", "Um Muro de Dados.", 87, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_shotgun_wire", "datawall", "Shotgun Wire", "5+/5", null, 40000, "A wall that inflicts 2D6 damage to the runner.", "Um muro que causa 2D6 de dano ao runner.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_wall_of_ice", "datawall", "Wall of Ice", "6+/6", null, 44000, "A wall that inflicts 2D6 damage to the runner.", "Um muro que causa 2D6 de dano ao runner.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_wall_of_static", "datawall", "Wall of Static", "2+", null, 2000, "A Data Wall.", "Um Muro de Dados.", 87, { ...conversion, platform: "data_fortress", loadable: false }),

  p("nr_cortical_scanner", "code_gate", "Cortical Scanner", 5, null, 20000, "A Code Gate that tests the runner three times.", "Um Portão de Acesso que testa o runner três vezes.", 89, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_endless_corridor", "code_gate", "Endless Corridor", 4, 4, 8000, "A Code Gate that tests the runner twice.", "Um Portão de Acesso que testa o runner duas vezes.", 89, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_filter_gate", "code_gate", "Filter", "0+", null, 1000, "A Code Gate.", "Um Portão de Acesso.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_haunting_inquisition", "code_gate", "Haunting Inquisition", 8, 8, 80000, "A Code Gate loaded with Psychodrome.", "Um Portão de Acesso carregado com Psychodrome.", 89, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_keeper", "code_gate", "Keeper", "4+", null, 5000, "A Code Gate.", "Um Portão de Acesso.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_mazer", "code_gate", "Mazer", "5+", null, 6000, "A Code Gate.", "Um Portão de Acesso.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_nerve_labyrinth", "code_gate", "Nerve Labyrinth", "6/4", null, 50000, "A Code Gate that inflicts 4D6 damage to the runner.", "Um Portão de Acesso que causa 4D6 de dano ao runner.", 89, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_quandry", "code_gate", "Quandry", "2+", null, 3000, "A Code Gate.", "Um Portão de Acesso.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_scramble", "code_gate", "Scramble", "3+", null, 4000, "A Code Gate.", "Um Portão de Acesso.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_sleeper", "code_gate", "Sleeper", "1+", null, 2000, "A Code Gate.", "Um Portão de Acesso.", 88, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_tutor", "code_gate", "Tutor", "3/5", null, 50000, "A Code Gate that tags the runner.", "Um Portão de Acesso que marca o runner.", 89, { ...conversion, platform: "data_fortress", loadable: false }),

  p("nr_pocket_vr", "systemware", "Pocket VR", 4, 13, 13000, "A weaker Dazzler.", "Um Dazzler mais fraco.", 90, { ...conversion, platform: "data_fortress", loadable: false }),
  p("nr_too_many_doors", "systemware", "Too Many Doors", 3, 3, 1000, "Forces the runner to choose the right door.", "Força o runner a escolher a porta correta.", 90, { ...conversion, platform: "data_fortress", loadable: false }),

  p("nr_emergency_self_construct", "special", "Emergency Self Construct", 4, 30, { kind: "not_for_sale", label: "N/A", pt_label: "N/D" }, "A Soulkiller that converts a runner into an electronic entity.", "Um Soulkiller que converte o runner em entidade eletrônica.", 92, { ...conversion, platform: "data_fortress", loadable: false, availability: "not_for_sale" }),
  p("nr_lunch_money", "special", "Lunch Money", 3, 7, 14500, "A Compiler that inflicts 1D6 physical damage to the runner.", "Um Compiler que causa 1D6 de dano físico ao runner.", 93, { ...conversion, platform: "data_fortress", loadable: false }),
];

function d(id, name, description, ptDescription, price, memory, speed, dataWall, options, page, extra = {}) {
  const modeledPrice = priceModel(price);
  return {
    id,
    name,
    description,
    pt_description: ptDescription,
    price: modeledPrice.kind === "fixed" ? modeledPrice.amount : null,
    price_model: modeledPrice,
    price_qualifier: extra.price_qualifier || (modeledPrice.kind === "fixed" ? "exact" : "special"),
    cpu: extra.cpu ?? null,
    memory,
    speed,
    data_wall: dataWall,
    portable: Boolean(extra.portable),
    cellular: Boolean(extra.cellular),
    armor_sp: extra.armor_sp ?? null,
    options,
    availability: extra.availability || (modeledPrice.kind === "not_for_sale" ? "not_for_sale" : "retail"),
    catalog_scope: extra.catalog_scope || "standard",
    unspecified: extra.unspecified || ["cpu"],
    source: { book: BOOK, pages: String(page) },
    ...extra,
  };
}

const decks = [
  d("dantech_cacciaguida", "Dantech Cacciaguida", "Italian designer deck with a large video board, chip reader and voice box.", "Deck italiano de design com monitor amplo, leitor de chips e caixa de voz.", 7000, 10, 0, 5, ["video_monitor_1m_x_2m", "chip_reader", "voice_box"], 11),
  d("ebm_pni_210", "EBM PNI 210", "No-frills standard deck at the baseline market specification.", "Deck padrão sem frescura, exatamente na especificação básica de mercado.", 1000, 10, 0, 2, [], 12),
  d("ebm_pni_412", "EBM PNI 412", "Improved EBM desk deck with Speed 2, Data Wall 4 and office peripherals.", "Deck de mesa EBM aprimorado, com Velocidade 2, Muro de Dados 4 e periféricos de escritório.", 4200, 10, 2, 4, ["video_monitor_2ft_x_2ft", "chip_reader", "printer"], 12),
  d("green_knight", "Green Knight", "A heavily protected standard deck with keyboard and compact video board.", "Deck padrão fortemente protegido, com teclado e monitor compacto.", 10000, 10, 0, 8, ["keyboard", "video_monitor_1ft_x_1ft"], 13),
  d("omnibus_cyberspace_explorer_one", "Omnibus Cyberspace Explorer One", "Cheap explorer deck with a Speed penalty, keyboard, display, gloves and goggles.", "Deck de exploração barato, com penalidade de Velocidade, teclado, monitor, luvas e óculos.", 1300, 10, -1, 2, ["keyboard", "video_monitor_1ft_x_1ft", "gloves_and_goggles"], 14),
  d("pct_danzig", "PCT Danzig", "Bare-bones standard deck with a modest Data Wall.", "Deck padrão básico com Muro de Dados modesto.", 500, 10, 0, 3, [], 14),
  d("zetatech_parraline_5700", "Zetatech Parraline 5700", "Entry Parraline with Speed 1, chip reader and a small display.", "Parraline de entrada com Velocidade 1, leitor de chips e monitor pequeno.", 2100, 10, 1, 3, ["chip_reader", "video_monitor_1ft_x_2ft"], 18),
  d("zetatech_parraline_5800", "Zetatech Parraline 5800", "High-end Parraline with 15 MU, Speed 3, Data Wall 6 and full office peripherals.", "Parraline de alto nível com 15 UM, Velocidade 3, Muro de Dados 6 e periféricos completos.", 6500, 15, 3, 6, ["keyboard", "chip_reader", "scanner", "video_monitor_4ft_x_4ft", "printer", "voice_box"], 18),
  d("zetatech_virocana", "Zetatech Virocana", "A 20 MU desk fortress with Data Wall 8 and a complete peripheral suite.", "Um monstro de mesa com 20 UM, Muro de Dados 8 e conjunto completo de periféricos.", 10000, 20, 1, 8, ["keyboard", "chip_reader", "scanner", "printer", "deck_security_system", "voice_box", "video_monitor_4ft_x_4ft"], 18),

  d("aztec_600_assault_programmer", "Aztec 600 Assault Programmer", "Surplus combat deck with 25 MU, SP 20, hardened circuitry and broad security options.", "Deck de combate excedente com 25 UM, PA 20, circuitos reforçados e ampla segurança.", 8200, 25, 2, 5, ["keyboard", "video_monitor_4ft_x_4ft", "chip_reader", "netrunner_flip_switch", "hardened_circuitry", "deck_security_system"], 11, { portable: true, armor_sp: 20 }),
  d("ebm_pni_724_pi", "EBM PNI 724π", "Fast portable EBM deck with 20 MU, Speed 4 and Data Wall 7.", "Deck portátil EBM veloz, com 20 UM, Velocidade 4 e Muro de Dados 7.", 10000, 20, 4, 7, ["chip_reader"], 12, { portable: true }),
  d("jeweldecks", "Jeweldecks", "Wearable jewelry deck with 15 MU and cellular access; price depends on the jewels.", "Deck vestível em forma de joia, com 15 UM e acesso celular; o preço depende das pedras.", { kind: "barter", label: "Jewels / negotiated", pt_label: "Joias / negociado" }, 15, 2, 5, ["cellular_link"], 13, { portable: true, cellular: true, availability: "quote" }),
  d("lang_compro_ii_masterdeck", "Lang Compro-II Masterdeck", "Cellular portable deck that trades Speed for an exceptional Data Wall 10.", "Deck portátil celular que sacrifica Velocidade por um excepcional Muro de Dados 10.", 5000, 15, -1, 10, ["cellular_link"], 13, { portable: true, cellular: true }),
  d("langley_datastick_mark_vii", "Langley Autosystems Datastick Mark VII", "Stylish cellular stick deck with Speed 3 and 25 units of published memory.", "Elegante deck celular em formato de bastão, com Velocidade 3 e 25 unidades de memória publicadas.", 9500, 25, 3, 4, ["cellular_link"], 13, {
    portable: true,
    cellular: true,
    source: { book: "Rache Bartmoss' Guide to the Net", pages: "150-151" },
    reprint_source: { book: BOOK, pages: "13" },
    editorial_fields: { published_mu: 3, published_memory: 25 },
  }),
  d("liz_cyber_spandeck", "Liz Cyber SpanDeck Netrunner Suit", "Wearable deck woven into a jumpsuit; its price rises with the wearer's Interface level.", "Deck vestível tecido num macacão; seu preço aumenta conforme o nível de Interface do usuário.", { kind: "formula", base: 17000, label: "17,000 + 2,000-5,000 eb per Interface level", pt_label: "17.000 + 2.000-5.000 ed por nível de Interface" }, 10, 2, 2, ["awareness_modifier_minus_5"], 13, {
    portable: true,
    availability: "quote",
    source: { book: "Rache Bartmoss' Guide to the Net", pages: "151" },
    reprint_source: { book: BOOK, pages: "13" },
    editorial_fields: { published_mu: 2, published_memory: 10 },
  }),
  d("microtech_cad_4_commando", "Microtech CAD-4 “Commando”", "Sealed cellular combat deck with SP 20, 30 MU, hardened circuitry and a Flip Switch.", "Deck de combate celular selado, com PA 20, 30 UM, circuitos reforçados e Flip Switch.", { kind: "black_market_markup", base: 37400, min_percent: 30, max_percent: 40, label: "37,400 eb government; +30-40% black market", pt_label: "37.400 ed governamental; +30-40% no mercado negro" }, 30, 4, 6, ["netrunner_flip_switch", "hardened_circuitry", "cellular_link"], 14, {
    cpu: 1,
    portable: true,
    cellular: true,
    armor_sp: 20,
    availability: "quote",
    unspecified: [],
    source: { book: "Rache Bartmoss' Guide to the Net", pages: "151" },
    reprint_source: { book: BOOK, pages: "14" },
  }),
  d("microtech_headgear_helmetdeck", "Microtech “Headgear” Helmetdeck", "Helmet-mounted deck with HUD and radio.", "Deck montado em capacete, com HUD e rádio.", 4100, 10, 2, 2, ["hud", "radio"], 14, { portable: true }),
  d("raven_microcyb_eagle", "Raven Microcyb Eagle", "Premium cellular portable with 20 MU, Speed 3 and Data Wall 5.", "Portátil celular premium com 20 UM, Velocidade 3 e Muro de Dados 5.", 11000, 20, 3, 5, ["cellular_link"], 15, { portable: true, cellular: true }),
  d("raven_microcyb_kestrel", "Raven Microcyb Kestrel", "Very fast cellular deck with a security system.", "Deck celular muito veloz com sistema de segurança.", 9000, 10, 4, 4, ["cellular_link", "deck_security_system"], 15, { portable: true, cellular: true }),
  d("raven_microcyb_owl", "Raven Microcyb Owl", "Luxury cellular deck with custom physical features described in its listing.", "Deck celular de luxo com recursos físicos personalizados descritos em sua ficha.", 25000, 10, 1, 4, ["cellular_link", "listing_specific_features"], 15, { portable: true, cellular: true }),
  d("raven_microcyb_rook", "Raven Microcyb Rook", "Affordable cellular portable with Speed 1 and Data Wall 3.", "Portátil celular acessível com Velocidade 1 e Muro de Dados 3.", 4000, 10, 1, 3, ["cellular_link"], 15, { portable: true, cellular: true }),
  d("shadowdeck", "Shadowdeck", "Fast 20 MU portable with Speed 4, Data Wall 7 and chip reader.", "Portátil veloz com 20 UM, Velocidade 4, Muro de Dados 7 e leitor de chips.", 4500, 20, 4, 7, ["chip_reader"], 16, { portable: true }),
  d("techtronica_cybermodem_utility_suit", "Techtronica Cybermodem Utility Suit", "Wearable 20 MU utility suit with an add-on cellular interface.", "Traje utilitário vestível com 20 UM e interface celular adicional.", 6300, 20, 1, 3, ["cybermodem_interface"], 16, { portable: true, cellular: true }),
  d("zetatech_d2_3000_armdeck", "Zetatech D2-3000 Armdeck", "Cyberarm-mounted deck with 15 MU, Speed 2 and Flip Switch.", "Deck montado em ciberbraço, com 15 UM, Velocidade 2 e Flip Switch.", 5000, 15, 2, 4, ["netrunner_flip_switch"], 17, { portable: true }),

  d("nr_bodyweight_data_creche", "Bodyweight Data Creche", "Optional Netrunner card-game conversion with 12 MU.", "Conversão opcional do card game Netrunner com 12 UM.", 7500, 12, 1, 4, ["video_monitor_1ft_x_1ft"], 94, { catalog_scope: "netrunner_conversion", availability: "referee_approval" }),
  d("nr_pandoras_deck", "Pandora's Deck", "Optional Netrunner card-game conversion with 20 MU and special rules.", "Conversão opcional do card game Netrunner com 20 UM e regras especiais.", 12000, 20, 1, 4, ["listing_specific_features"], 95, { catalog_scope: "netrunner_conversion", availability: "referee_approval" }),
  d("nr_pk_6089a", "PK-6089a", "Optional Netrunner card-game conversion with 15 MU.", "Conversão opcional do card game Netrunner com 15 UM.", 9000, 15, 0, 4, ["listing_specific_features"], 96, { catalog_scope: "netrunner_conversion", availability: "referee_approval" }),
  d("nr_arasaka_portable_prototype", "Arasaka Portable Prototype", "Optional portable conversion with 18 MU, cellular link and a huge display.", "Conversão portátil opcional com 18 UM, conexão celular e monitor enorme.", 15000, 18, 3, 6, ["chip_reader", "cellular_link", "video_monitor_6ft_x_6ft"], 94, { portable: true, cellular: true, catalog_scope: "netrunner_conversion", availability: "referee_approval" }),
  d("nr_artemis_2020", "Artemis 2020", "Optional portable conversion with cellular access and a 15 MU backup drive.", "Conversão portátil opcional com acesso celular e drive de backup de 15 UM.", 10000, 15, 2, 5, ["cellular_link", "backup_drive_15mu"], 94, { portable: true, cellular: true, catalog_scope: "netrunner_conversion", availability: "referee_approval" }),
];

const builder = {
  chassis: [
    { id: "cellular_cyberlimb", name: "Cyberlimb + Cellular Interface", pt_name: "Cibermembro + Interface Celular", price: 3500, portable: true, cellular: true, armor_sp: null, external_requirement: "compatible_cyberlimb", bundled_option_ids: ["cybermodem_interface"], derived: true },
    { id: "sealed_combat_assault", name: "Sealed Combat Assault", pt_name: "Assalto de Combate Selado", price: 6000, portable: true, cellular: false, armor_sp: 20 },
  ],
  options: [
    { id: "auto_punchout", name: "Auto Punchout", pt_name: "Auto Punchout", description: "Disconnects on hostile current; -5 Netrunning Initiative.", pt_description: "Desconecta ao detectar corrente hostil; -5 à Iniciativa de Netrunning.", pricing: "fixed", price: 330 },
    { id: "batteries", name: "Batteries", pt_name: "Baterias", description: "Portable deck power cells.", pt_description: "Células de energia para decks portáteis.", pricing: "per_unit", unit: "hour", pt_unit: "hora", price_per_unit: 5, min: 1, max: 72 },
    { id: "code_gates", name: "Deck Code Gates", pt_name: "Portões de Acesso do Deck", description: "Deck login protection, maximum level 10.", pt_description: "Proteção de login do deck, nível máximo 10.", pricing: "per_unit", unit: "level", pt_unit: "nível", price_per_unit: 1500, min: 1, max: 10 },
    { id: "cybermodem_interface", name: "Cybermodem Interface", pt_name: "Interface de Cybermodem", description: "Makes a deck cellular; -1 Interface.", pt_description: "Torna o deck celular; -1 em Interface.", pricing: "fixed", price: 500, effects: { cellular: true, interface_modifier: -1 } },
    { id: "dead_mans_handle", name: "Dead Man's Handle", pt_name: "Manete do Homem Morto", description: "Emergency mental-signal disconnect; starts at -3 to actions.", pt_description: "Desconexão emergencial por sinal mental; começa impondo -3 às ações.", pricing: "fixed", price: 1000 },
    { id: "deckmate", name: "DeckMate", pt_name: "DeckMate", description: "Adds pocket-computer functions to a deck.", pt_description: "Acrescenta funções de microcomputador ao deck.", pricing: "fixed", price: 100 },
    { id: "deck_security_system", name: "Deck Security System", pt_name: "Sistema de Segurança do Deck", description: "Biometric deck lock.", pt_description: "Trava biométrica para o deck.", pricing: "range", choices: [
      { id: "thumbprint", name: "Thumbprint", pt_name: "Impressão Digital", price: 400 },
      { id: "retinal", name: "Retinal", pt_name: "Retinal", price: 1000 },
    ] },
    { id: "ebm_99080_muse", name: "EBM 99080 MUSE", pt_name: "EBM 99080 MUSE", description: "Isolates a fixed number of memory units from attacks.", pt_description: "Isola uma quantidade definida de unidades de memória contra ataques.", pricing: "fixed", price: 300 },
    { id: "ebm_xr10_chip_rack", name: "EBM XR-10 Chip-Rack", pt_name: "Chip-Rack EBM XR-10", description: "Adds 10 MU of discrete program storage.", pt_description: "Acrescenta 10 UM de armazenamento discreto de programas.", pricing: "fixed", price: 5000, effects: { memory_bonus: 10 } },
    { id: "hardened_circuitry", name: "Hardened Circuitry", pt_name: "Circuitos Reforçados", description: "Protects the deck from EMP and electrical hazards.", pt_description: "Protege o deck contra PEM e riscos elétricos.", pricing: "percentage", percent: 20 },
    { id: "mini_printer", name: "Mini-printer", pt_name: "Mini-impressora", description: "Pocket laser printer.", pt_description: "Impressora laser de bolso.", pricing: "fixed", price: 125 },
    { id: "netrunner_flip_switch", name: "Netrunner Flip Switch", pt_name: "Flip Switch de Netrunner", description: "Switches perception between the Net and meatspace.", pt_description: "Alterna a percepção entre a Rede e o Meatspace.", pricing: "fixed", price: 135 },
    { id: "neural_recognition_security", name: "Neural Recognition Security", pt_name: "Segurança por Reconhecimento Neural", description: "Brainwave-pattern deck lock.", pt_description: "Trava do deck por padrão de ondas cerebrais.", pricing: "fixed", price: 2000 },
    { id: "tight_beam_radio_relay", name: "Tight-Beam Radio Relay", pt_name: "Retransmissor de Rádio Direcional", description: "Remote radio link outside cellular coverage; -2 Initiative.", pt_description: "Link de rádio remoto fora da cobertura celular; -2 à Iniciativa.", pricing: "fixed", price: 1500 },
    { id: "transcriptor", name: "Transcriptor", pt_name: "Transcriptor", description: "Hardware log of locations, icons and copied files.", pt_description: "Registro físico de locais, ÍCONES e arquivos copiados.", pricing: "fixed", price: 150 },
  ],
  external_products: [
    { id: "fiber_optic_cable", name: "Fiber-Optic Cable", pt_name: "Cabo de Fibra Óptica", description: "High-quality Net cable.", pt_description: "Cabo de alta qualidade para a Rede.", pricing: "per_unit", unit: "meter", pt_unit: "metro", price_per_unit: 1, min: 1, max: 1000 },
    { id: "junction", name: "Junction", pt_name: "Junção", description: "Merges two fiber-optic data flows.", pt_description: "Combina dois fluxos de dados por fibra óptica.", pricing: "fixed", price: 100 },
    { id: "repeater", name: "Repeater", pt_name: "Repetidor", description: "Boosts a fiber signal every hundred kilometers.", pt_description: "Amplifica o sinal de fibra a cada cem quilômetros.", pricing: "fixed", price: 1000, availability: "restricted" },
    { id: "zetatech_diagnet", name: "Zetatech DiagNet", pt_name: "Zetatech DiagNet", description: "Dedicated simulated Net for safe deck and program testing.", pt_description: "Rede simulada dedicada para testar decks e programas com segurança.", pricing: "fixed", price: 5000 },
  ],
};

module.exports = { classes, standardPrograms, convertedPrograms, decks, builder };
