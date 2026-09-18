#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const slug = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const entries = [];
const add = (category, name, effect, price = 0, extra = {}) => entries.push({
  id: `ammo_${slug(category)}_${slug(name)}`,
  category, name, effect, description: effect, price, ...extra,
});
const rows = (category, text) => text.trim().split("\n").forEach((line) => {
  const [name, effect, price = "0", compatibility = ""] = line.split("|").map((part) => part.trim());
  const range = price.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  const value = Number.parseFloat(price.replace(/[^0-9.]/g, "")) || 0;
  add(category, name, effect, range ? Number(range[1]) : value, {
    ...(range ? { price_max: Number(range[2]) } : {}),
    ...(price.includes("x") ? { price_label: price } : {}),
    ...(compatibility ? { compatibility } : {}),
  });
});

rows("Ammunition Reloads", `
Light Pistol & SMG (100)|Standard reload, 100 rounds|15|Light pistols and SMGs
Medium Pistol & SMG (100)|Standard reload, 100 rounds|30|Medium pistols and SMGs
Heavy Pistol & SMG (100)|Standard reload, 100 rounds|36|Heavy pistols and SMGs
Very Heavy Pistol (100)|Standard reload, 100 rounds|40|Very heavy pistols
Assault Rifle (100)|Standard reload, 100 rounds|40|Assault rifles
Airgun Pellets (100)|Standard pellets|6|Airguns
Acid or Drug Pellets (100)|Payload pellets|30|Airguns
Needlegun Rounds (100)|Standard needles|50|Needleguns
20mm Cannon Round|One cannon round|25|20mm cannon
Flamethrower Reload|Fuel reload|50|Flamethrowers
Paintloads (100)|Paint payloads|10|Paint weapons
Acid, Drug or Poison Loads (100)|Payload loads|30|Compatible launchers
Glass, Ceramic or Steel Balls (20)|Ball ammunition|5|Ball launchers
`);

rows("Ammunition Types", `
Normal|No SP or damage modifier|1x|Bullets
Brass Cased|No SP or damage modifier|3x|Bullets
Plasticase|Poor availability|1x|Bullets
Armor Piercing|SP x1/2; penetrating damage x1/2|3x|Bullets
API|SP x1/2; penetrating damage x1/2; +1d6 then 1d6/2; 50% fire chance|4x|Bullets
Dual-Purpose|SP x1/2; choose half penetrating damage or x1.5 damage|4x|Bullets
Electrothermal|Damage x1.5|2x|Bullets
Hollowpoints|SP x2; penetrating damage x1.5|1.125x|Bullets
Frag Flechettes|Soft SP x1/2; rare and very illegal|5x|Bullets
Rubber Bullets|Stun damage beyond 3m|0.333x|Bullets
Safety Rounds|SP x2; penetrating damage x3; shatter on SP10 or SDP30|6x|Bullets
Electric Fire|Caseless rounds|0.9x|Bullets
Wasp Flechette|Soft SP x1/2; damage x1d6/2|10x|Bullets
12mm Anti-Personnel|SP x1/2; damage x2|10x|12mm bullets
Silver Bullets|No mechanical modifier|5x|Bullets
DumDums|SP x2; penetrating damage x1.75|1x|Bullets
Titanium|SP x1/2|10x|Bullets
Tungsten Carbide|SP x1/3; penetrating damage x1/2|15x|Bullets
Depleted Uranium|SP x1/4; +1d6; penetrating damage x1/2|150x|Bullets
Memory Expander|Soft SP x1/4; penetrating damage x1.5|10x|Bullets
Tracers|+1d3 x 1d6 damage|1.5x|Bullets
Subsonic|SP x1.5|2x|Bullets
Acid|1d4 for 3 turns; ceramic shell shatters on SP4+|75|20 rounds
Heartbreaker|Heart attack in 1d6 rounds; shatters on SP5+|50|Each
`);

rows(".410 / 28 Gauge", `
Shotshell|2d6 / 1d6+2 / 1d6 by range band|15|12 rounds
Slug|3d6+1 AP; soft SP halves penetrating damage|15|12 rounds
Triplex Shell|1d6 / 2x2d6|15|12 rounds
`);
rows("20 Gauge", `
Shotshell|3d6 / 2d6 / 1d6 by range band|15|12 rounds
Flare|Illuminates 30m; 2d6+2 and 1d6/2 on hit|25|25 rounds
Flash-Bang|Flash-bang effects; 2m/5m; maximum range 25m|0
Flash|Flash-bang grenade in a 25m x 3m pattern|30|25 rounds
Slug|3d6+1 AP; soft SP halves penetrating damage|15|12 rounds
`);
rows("12 Gauge", `
Shotshell|4d6 / 3d6 / 2d6; range pattern 1-3m x 50m|15|12 rounds
APFSDS|6d6 AP; 25m range|10
Flare|Illuminates 30m; 2d6+2 and 1d6/2 on hit|25|25 rounds
Flash-Bang|Flash-bang effects; 2m/5m; maximum range 25m|0
Flash|Flash-bang grenade in a 25m x 3m pattern|30|25 rounds
Flechettes|4d6 AP; armor and penetrating damage x1/4|8
Gas|Tear, sleep or biotoxin gas; 1m radius|5-25
HE|4d6; 0.5m radius|5
HEAT|4d6 HEAT|0
Non-Lethal|4d6 Stun; soft SP resists no more than half damage|0
Slug|4d6+2 AP; soft SP halves penetrating damage|0
Smoke|3m smoke cloud|15|25 rounds
Stinger|4d6 Stun beyond 3m|15|25 rounds
Stundart|Stun -2; penetrates soft SP10|20|4 rounds
Thermite|8d6 AP in half-width pattern; 10% chance to ruin barrel|30
Slasher|4d6; SP x1/3; 1m pattern; WA -3; 10m range|75
Ball Bearing (x2)|5d6+1 / 4d6+1 / 3d6+1; 1-2m pattern|0
`);
rows("12 Gauge Magnum", `
Buckshot|4d6+2 / 3d6+2 / 2d6+2|1
HE Slug|3d6; 1m radius|2
AP Slug|3d6 HEP|3
`);
rows("10 Gauge", `
Shotshell|5d6 / 4d6 / 3d6; otherwise as 12 gauge|15|12 rounds
Flare|Illuminates 30m; 2d6+2 and 1d6/2 on hit|30|25 rounds
Flash|Flash-bang grenade in a 25m x 3m pattern|35|25 rounds
Flechettes|5d6 AP; armor and penetrating damage x1/4|8
Gas|Tear, sleep or biotoxin gas; 2m radius|5-25
Non-Lethal|5d6 Stun; soft SP resists no more than half damage|0
Slug|5d6+3 AP; soft SP halves penetrating damage|0
Smoke|3m smoke cloud|20|25 rounds
Stinger|5d6 Stun beyond 9m|20|25 rounds
`);
rows("10 Gauge 3-inch Magnum", `
Shotshell|6d6 / 5d6 / 4d6|0|Requires +20% weapon modification; cannot use normal 10 gauge
Stinger|6d6 / 5d6 / 4d6 Stun beyond 9m|19|25 rounds
Gas|3m gas cloud|0|Requires +20% weapon modification
Flare|Illuminates 40m for 3 turns; 3d6 then 2d6|0|Requires +20% weapon modification
Smoke|4m smoke cloud for 5 turns|0|Requires +20% weapon modification
`);
rows("4 Gauge CLAW", `
#000 Buckshot|8d6|0
Slug|9d6+2 AP; soft SP halves penetrating damage|0
APFSDS|5d10 AP|0
HEAT|7d10; SP x1/2|0
Slasher|2.5m pattern; 4d6; SP x1/3|75
Flechette / Special Shells|Flechettes, mini-grenades, non-lethal batons, thermite, flash-bombs, HEP and gas shells available|0
`);

rows("Hand Grenades", `
HE|7d6 fragmentation to 5m; 3d6 from 6-10m|25
Anti-Tank|5d10 HEAT; 3d6 fragmentation to 5m; half throwing range|30
Chemical|Gas, smoke or paint; 10m radius|20
WP / Incendiary|4d6 for 3 turns; 5m radius; soft SP -2 per round|30
Flash-Bang|Stun -2 or Difficulty 4; REF 20 or blinded; 5m/15m|25
Concussion|Stun -5; 5m/15m|25
Flash|REF 20+ or blinded for 40 seconds; 10m|25
Sonic|Stun -1; BOD 20+ or deaf for 40 seconds; 6m|40
Motion Restraint|Dodge 25+; BOD 30+ to escape; 1m|25
EMP|Disorientation 1d6x10 seconds; pulse effect; 4-10m|200-400
Saucer|2d6+3 fragmentation; 15m; +2 to throw|65
Mini-Grenade|1d6+3; 3m; 1.5-inch body|40
Scatter|IR-defeating cloud for 5 turns; 5m|70
Spraypaint|Blinds 1-2 minutes on center hit; 4m|20
Stench|Very Difficult COOL/BOD roll; 5m x 5m|20
LN2|2d6+2 (minimum 6); 1d6/2+1 area; 3m|0
Smoke Pellets|Requires a Stealth roll to escape the area|0
Acid|Acid cloud; 1 point per location per turn|50
Blind Gas|BOD -2 (+3 difficulty) or blind for 1d10+2 turns|0
`);
rows("Militech 25mm Grenades", `
Chemical|Smoke or gas; 5m|30
Flechette|2d6 x 1d6 AP; 2m x 25m pattern|30
Fragmentation|2d6+1; penetration 1; 5m|30
HEP|5d6 HEP; penetration 3; armor -2 levels|40
Stundart|Stun -4 through soft SP10; 100m range|5
Slasher|4d6; SP x1/3; 2m; WA -2; 50m range|75
Frag|3d6; 3m|30
Flash|50% chance of -5 REF and Awareness for 3 turns; 5m|30
Incendiary|4d6 / 2d6 / 1d6; 1m|30
Concussion|3d6 Stun; SP x1/3; 4m|30
LN2|2d6 (minimum 4) to two areas plus LN2 effects; 2m|30
`);
rows("Tsunami High-Pressure 25mm Grenades", `
Frag|3d6+1; penetration 1; 5m; 1500m range|15
HE|5d6; penetration 2; 3m; 1500m range|15
HEP|5d6; penetration 3; armor damaged two levels; 1500m range|25
Incendiary|4d6 / 3d6 / 2d6; penetration 2; 2m; 1500m range|15
`);
rows("Militech 25mm Pistol Grenades", `
Concussion|3d6 Stun; SP x1/3; 4m|15
Defensive Frag|2d6+1; 3m|20
FlashBomb|Stun save; -5 REF and Awareness for 5 turns; 5m|15
HEP|5d6 HEP|30
Incendiary|4d6 / 3d6 / 2d6; 1m|30
Offensive Frag|5d6; 3m|25
Chemical|Smoke or tear gas; 3m|20
`);
rows("40mm Launched Grenades", `
HE|7d6; penetration 2; 5m; arms after 10m|50
HEDP|4d10 HEAT; penetration 4; 4d6 over 1m|50
Illumination|20m plus 20m low-light, or 1d6x6; parachute option 5eb|50
Chemical|Carries gas or smoke; 10m; parachute option 5eb|50
Bean Bag|2d6; Stun -5; +1 per 15 SP; 50m; REF 20+|50
WP|4d6 for 3 turns; penetration 2; 10m|50
Flechette|1d6/2 x 2d6 AP; penetration 1; 3m x 25m|50
HEP|7d6 HEP; SP -5 levels; WA -1|50
Flash-Bang|Stun -2; stun and deaf 4 turns; 5m/15m; REF 20+ or blind 2 turns|50
Grapnel|Half range; WA -2; 1d6 damage; 50% catch|30
Net|25m; WA -5; 1d6; 50% wrap; REF 20+ or BOD 25+ to escape|50
Splatshell|1d6+1 hits; pattern from 5m x 2m to 15m x 6m|10
Slasher|4d6; SP x1/3; 3m; WA -2; 50m|75
Spraypaint|Blind for 1d6/3 turns; 4m|20
EMP|Disorient 10 seconds; cyberware disabled 4/10 minutes; 5m|400
LN2|2d6+2 (minimum 6); 1d6/2+1 area; 3m|50
`);
rows("Rifle Grenades", `
Classic HE|8d6; 5m; WA -3; 100m|50
Classic HEAT|8d10 HEAT; 4d6 over 1m; WA -3; 100m|50
Classic Chemical|Gas or smoke; 10m; WA -3; 100m|50
Classic EMP|Disorient 1d6x10 seconds; cyberware 4-10 minutes; 5m|400
DCR HE|7d6 to 5m; 3d6 from 6-10m; WA -1; 150m|50
DCR Smoke|Smoke over 10m; WA -1; 150m|50
DCR HEAT|5d10 HEAT; 3d6 to 5m; WA +0; 150m|50
`);

rows("Special Projectiles", `
Det Web|40 AP; WA +0; 25m|450|Web launchers
Taser Net|As taser; WA +0; 25m|100|Web launchers
Web|Entangle; Nearly Impossible BOD+REF; 30m|0|Web launchers
Sharpwire|WA +2; BOD/2 damage; SP x1/2; 10m|450|Net launchers
Micromissile HE|4d6; 2m|50|Micromissiles
Micromissile Anti-Armor|4d6 HEAT; SP x1/2; 1m|75|Micromissiles
Micromissile HEP|4d6+4; no burst|200|Micromissiles
13mm HEP Shells (12)|4d6+2|45|13mm
13mm API Shells (12)|4d6+3; SP x1/2; then 1d6 and 1d6/2 at SP0|45|13mm
13mm Acid Shells (12)|1d6 for 4 turns|20|13mm
13mm LN2 Shell|1d6+2 to one location plus LN2 effects|0|13mm
15mm Kurtz Practice|4d10+3|8|15mm Kurtz
15mm Kurtz HE|3d10; 1m|20|15mm Kurtz
25mm Cockerill AP|5d10+10 AP; penetration 5|0|25mm Cockerill cannon
25mm Cockerill HEP|5d10+10 HEP; penetration 6|0|25mm Cockerill cannon
25mm Cockerill Flechette|1d6+3 x 1d6+1 AP; 1m/2m/4m x 100m|0|25mm Cockerill cannon
30mm Rockets (6)|HE 5d6; penetration 1; 3m|200|30mm rocket systems
`);
rows("Rocket and Missile Reloads", `
RPG-A HEAT|6d10 AP|250
RPG-A HE|6d10; penetration 3; 6m|250
RPG-B HEAT|9d10 AP|400
2-inch Rocket|6d10; one space per 12|100
2.75-inch Rocket|8d10; one space per 10|200
3.5-inch Rocket|9d10; one space per 6|400
5-inch Rocket|13d10|1000
LATGM|12d10 AP; one-fifth space|1500
HATGM|18d10 AP; one-third space|3500
Hellfire|20d10 AP; one space|10000
60mm Mortar Shell|8d10|50
80mm Mortar Shell|9d10; one space per 20|150
120mm Mortar Shell|13d10; one space per 10|250
105mm Howitzer Shell|11d10; one space per 5|500
150mm Howitzer Shell|13d10; one space|1000
200mm Howitzer Shell|28d10; one space|2000
230mm Rocket|4d10 AP|2500
`);
rows("Chemical Loads", `
Smoke|Shell cost x0.3; grenade 15eb+|15
Hot Smoke|Shell cost x1; grenade 35eb+|35
Tear Gas|Shell cost x2; grenade 15-20eb|15-20
Nausea Gas|Shell cost x2; grenade 25-50eb|25-50
Knock-out Gas|Shell cost x3; grenade 50-75eb|50-75
Mace|Shell cost x3; grenade 45-80eb|45-80
Nerve Gas|Shell cost x20; grenade price not listed|20x
White Phosphorous|Shell cost x4; grenade price not listed|4x
`);

rows("Arrowheads", `
Target Arrow|SP x1/2; normal damage|24|12 arrows
Broadhead Arrow|Soft SP x1/2; penetrating damage x2|40|12 arrows
Stun Arrow|Damage is Stun|20|12 arrows
Spinner Arrow|Soft SP x1/2; penetrating damage x3|80|12 arrows
Warhead Arrow|25mm pistol grenade; WA -2|0|Price and effect vary
Target Quarrel|SP x1/2; normal damage|30|12 quarrels
Broadhead Quarrel|Soft SP x1/2; penetrating damage x2|50|12 quarrels
Stun Quarrel|Damage is Stun|25|12 quarrels
Spinner Quarrel|Soft SP x1/2; penetrating damage x3|100|12 quarrels
Warhead Quarrel|25mm pistol grenade; WA -2|0|Price and effect vary
Silver Quarrel|SP x1/2|3x|Crossbow quarrels
`);
rows("Airgun and Needlegun Loads", `
Drugged Splatball|Effect determined by drug|5x|Airguns
Acid Splatball|1d6 for 3 turns|5x|Airguns
Normal Needlegun Load (100)|Soft SP x1/2|50|Needleguns
Drugged Needlegun Load|Soft SP x1/2 plus drug effect|5x|Needleguns
Anti-Armor Needlegun Load|Soft SP x1/4; hard SP x1/2|4x|Needleguns
HE Impact Needlegun Load|4d6|5x|Needleguns
HE Timer/Liquid Needlegun Load|Soft SP x1/2; +4d6|5x|Needleguns
`);

rows("Firearm Accessories", `
Holster|Shoulder, thigh or leg holster|20
Shoulder Sling|For rifles, shotguns and SMGs|5
Silencer / Suppressor|WA -1; concealability +1; Awareness roll to hear|100
Laser Sight|WA +1|0
Commercial Under-Barrel Grenade Launcher|HVY +0 L R; 30-40mm; 1 shot; ROF 1; ST; 225m|150
Cyberleg Holster|One light pistol through medium SMG and one clip|100
Cybernetic Pop-up Gun|Holds light pistol through medium SMG|1-800
Weapon Mount & Link|Cyberlimb hardpoint for a weapon|100
Smartgun Link|WA +2 with smartgun|100
Cyberoptic Targeting Scope|WA +1 to smartgun attacks only|400
Smart / Vision Goggles|Four option spaces; options cost 10% less|200
Smartlink Scope|WA +1; total +3 with smartgun|360
Magnification|Up to x25 magnification|200
Image Intensifiers|Awareness +2|250
Thermograph|As cyberoptic thermograph|200
Scopesight|Aimed attack: +2 Long/Extreme, +1 Medium|200
Low Lite Scope|Aimed attack: +2 Long/Extreme, +1 Medium|300
Computer Sights|Aimed attack: +3 Long/Extreme, +2 Medium; Low Light|500
Computer + Thermo Sight|Aimed attack: +3 Long/Extreme, +2 Medium; Low Light and Thermograph|700
Bipod|WA +2 while braced and stationary|10
Bayonet|3d6 AP while fixed|15
Gyro Mount|Negates hip-fire and movement penalties|250
Portable Laser Rangefinder|Determines exact range|50
Power Exo-Mount|For heavy weapons; WA -1, MA -1, REF -2|5000
M-205 Grenade Launcher|HVY +1 L P; 40mm; 1 shot; ROF 1; VR; 200m|250
Classic Rifle Grenade Adapter|HVY -3 N P; 1 shot; ROF 0.5; VR; 100m|50
COT Sight|Smartgun sight; WA +3|4000
Cookie Cutter|Smartgun will not fire at badge wearers|300
Extra Cookie Cutter Badge|Additional protected badge|15
New Frames|Bullpup frame may improve concealability|0
Braces and Stocks|WA +1|50
Cooling Shroud|Reliability +1|50
Magazine Extensions|Double or triple capacity|40
Techtronica Scangrip|Weapon scanning grip|200
Cybernetic Targeting System|Built-in gyro mount|1300
Gun Cleaning Kit|Avoids Reliability -1 from poor maintenance|50
Digital Weapon Link|TECH +2 to unjam weapon|500
DUD Smartgun Controller|Voice-activated weapons; requires DUD|720
Militech Pump Mini-Grenade Launcher|HVY -1 L C; 25mm; 4 shots; ROF 2; ST; 150m|255
Militech Drum Mini-Grenade Launcher|HVY +0 N P; 25mm; 16 shots; ROF 2; ST; 150m|475
DCR Rifle Grenade Adapter|HVY -1 N P; 1 shot; ROF 0.5; VR; 150m|50-100
Speedholster|Fast Draw +1|100
Quickdraw Cyberarm Holster|Fast Draw +2; P concealability|200
Stutter Chipping|Prevents fire at designated friendlies; 10-second response|310
Nine-Eleven Chip|Calls for help; arrival in 1d10+2 minutes|175
Security Chipping|Very Difficult smartlock|250
Gun-Cam|Stores 10 digital pictures|100
ET Battery|100-shot battery|150
.22 Muzzle Adapter|50eb fitting cost; fires rifle/pistol grenades|200
Under-Barrel Capacitor Laser|RIF +2; 3d6; 2 shots; ROF 2; UR; 25m|950
Under-Barrel Microwaver|EX +0; 1d6 plus special; 4 shots; ROF 2; ST; 20m|500
Hip-Mounted Powerpack|Double shots; +5m microwaver range; 4kg|250
Under-Barrel Micro-Missile Pod|HVY +1 L P; 4d6; 1 shot; ROF 1; ST; 200m|200
Under-Barrel Sharpwire Net|Launches sharpwire net|450
Kleen Bore Nanoagents|Cleans the weapon|50
Midnight Arms Smart Glove|Smartgun glove; +200eb per smartgun|110
Smartgoggle Mirrorshades|Two option spaces; options cost 10% less|450
Smartplate Link|Smartgun costs three times base|300
`);
rows("Bow Accessories", `
Bow String Silencer|Makes bow completely silent|50
Crossbow Autoloader|Half normal capacity (6); ROF x2; WA -1|25%x
Basic Bow Sights|WA +1 when aimed|50
Cyber-Targeting|WA +1, or +2; requires smartgoggles or optic|250
IR Sight|As cyberoptic IR option|200
LowLite Sight|Negates darkness penalties|150
Gyro-Stabilizer|Halves movement penalties for self-bow|100
`);
rows("Melee Accessories", `
Monomolecular Edge|Damage +1d6; soft SP x1/3; hard SP x2/3|5x
`);
rows("Gun Customization", `
Custom Grip|Fast Draw and Snapshot WA +1|0.3x
Adjustable Stock|One extra aiming turn; Snapshot WA +1|0.6x
Folding Stock - Rifle|Concealability +1; WA -1/-2|0.3x
Stock - Pistol or Light SMG|WA +0/+1 at Long and Extreme|0.3x
Solenoid Trigger|WA +1 at Extreme; weight +10%|1x
Build Solenoid Trigger|Replaces trigger with firing stud|0.5x
Electric Trigger|WA +1 at Extreme|1x
Electric Fire Ammo Conversion|Modify 100 rounds for electric fire|0
Barrel Chopping|Concealability +1; half range; pattern +50%|0.3x
Chop Pistol or SMG|WA -1; half range|0.3x
Cheap Barrel Chopping|WA -2; jams on 1-2; fumble explodes|0
Barrel Extension|Concealability -1; range +25%|0.3x
Burst Fire|WA -1; Reliability -1; enables three-round burst|1.5x
Pure Auto Fire|Fires half magazine, maximum 30; WA -1; Reliability -2|1x
Selective Fire|Single, three-round or auto at WA -2; Reliability -1|2x
Heat Resistant Barrel|Counters one level of Reliability loss|0.5x
Make Resistant Barrel|Weaponsmith manufacturing option|0.2x
Quality|Reliability +1 up to VR|0.5x
Compensation|ROF +1 for ROF 1 or 2 semi-automatics|0.4x
Electrothermal Enhancement|Damage and range +50%; +0.5-1kg; cased only|0.5x
Smartgun Modification|WA +2 with Smartgun Link|1x
Smart Plate Modification|Enables Smartgun2 SmartPlate|0.2x
Smart Glove Modification|Enables Smart Glove|200
Brass Catcher|Soft or hard versions|0.1x
Bayonet Lug|Allows bayonet mounting|0.1x
Standard Finish|Matte black, blued or nickel|0x
Natural Color Finish|Red, green, black and similar colors|0.1x
Bowling Ball Finish|Two or more mixed colors|0.3x
Custom Finish|Chrome, pearlescent, camouflage or gloss|1x
Neon Glow Finish|Iridescent light-emitting finish|1.5x
Printless Finish|Nearly Impossible TECH roll to lift prints|2x
Extended Magazine|Up to five times original capacity; 1eb per cased round|0
Extended Magazine over 2x|Concealability -1; Reliability -1; Snapshot -1/-2; 0.5eb per caseless round|0
Heavy Weapon Extended Magazine|2-3eb per round|0
`);

// The source states that IMI 25mm grenades duplicate normal 25mm loads at
// 1.5x cost, and that 30mm launched grenades duplicate 40mm loads except for
// their Slasher. Expand those cross-references so the catalog is complete.
entries.filter((entry) => entry.category === "Militech 25mm Grenades").forEach((entry) => {
  add("IMI 25mm Grenades", entry.name, `${entry.effect}; 100m; SOF2 pattern`, entry.price * 1.5, {
    price_label: entry.price_label === "Price not listed" ? "1.5x normal 25mm cost" : undefined,
    compatibility: "IMI 25mm launchers",
  });
});
entries.filter((entry) => entry.category === "40mm Launched Grenades" && entry.name !== "Slasher").forEach((entry) => {
  add("30mm Launched Grenades", entry.name, `${entry.effect}; 200m, or 1300m from automatic launcher`, entry.price, {
    compatibility: "30mm grenade launchers",
  });
});
add("30mm Launched Grenades", "Slasher", "4d6; SP x1/3; 2.5m; WA -2; 50m", 75, {
  compatibility: "30mm grenade launchers",
});

const aliases = {
  "Light Pistol & SMG (100)": ["weapon_light_handgun_light_smg_ammo_box_100"],
  "Medium Pistol & SMG (100)": ["weapon_medium_handgun_medium_smg_ammo_box_100"],
  "Heavy Pistol & SMG (100)": ["weapon_heavy_handgun_heavy_smg_ammo_box_100"],
  "Very Heavy Pistol (100)": ["weapon_very_heavy_handgun_ammo_box_100"],
  "Assault Rifle (100)": ["weapon_assault_rifle_ammo_box_100"],
  "Shotshell": ["weapon_shotgun_shells_box_12"],
};
entries.forEach((entry) => {
  if (aliases[entry.name] && entry.category === "Ammunition Reloads") entry.legacyIds = aliases[entry.name];
  if (entry.price === 0 && !entry.price_label) entry.price_label = "Price not listed";
});

const translateCategories = {
  "Ammunition Reloads": "Recargas de Munição", "Ammunition Types": "Tipos de Munição",
  "Hand Grenades": "Granadas de Mão", "Rifle Grenades": "Granadas de Fuzil",
  "Special Projectiles": "Projéteis Especiais", "Rocket and Missile Reloads": "Recargas de Foguetes e Mísseis",
  "Arrowheads": "Pontas de Flecha", "Airgun and Needlegun Loads": "Cargas de Armas de Ar e Agulhas",
  "Firearm Accessories": "Acessórios para Armas de Fogo", "Bow Accessories": "Acessórios para Arcos",
  "Melee Accessories": "Acessórios para Armas Brancas", "Gun Customization": "Customização de Armas",
};
const pt = entries.map((entry) => ({
  ...entry,
  category: translateCategories[entry.category] || entry.category,
  price_label: entry.price_label === "Price not listed" ? "Preço não listado" : entry.price_label,
}));
const envelope = (items, locale) => ({
  $id: `https://local/bytes-and-blades/ammo.${locale}.json`, version: 1, locale,
  title: locale === "pt-BR" ? "Munições e Add-ons de Cyberpunk 2020" : "Cyberpunk 2020 Ammo & Add-ons",
  source: "Cyberpunk 2020 Ammo & Add-ons, revision 1998-11-25", items,
});

fs.writeFileSync(path.join(root, "data", "ammo.json"), `${JSON.stringify(envelope(entries, "en-US"), null, 2)}\n`);
fs.writeFileSync(path.join(root, "data", "ammo.pt-BR.json"), `${JSON.stringify(envelope(pt, "pt-BR"), null, 2)}\n`);
console.log(`Wrote ${entries.length} ammo and add-on records.`);
