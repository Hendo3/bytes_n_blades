#!/usr/bin/env python3
"""Restore the English equipment catalog from CP2020 Corebook pp. 68-71."""

from __future__ import annotations

import json
import re
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "data" / "equipment.json"


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def entry(name: str, price: str, *, note: str | None = None, description: str | None = None) -> dict:
    value = {"name": name, "price": price}
    if note:
        value["note"] = note
    if description:
        value["description"] = clean(description)
    return value


CATEGORIES = OrderedDict({
    "fashion": {
        "name": "Fashion",
        "description": "The clothing styles of 2020 break into five basic fashion statements.",
        "modifiers": OrderedDict({
            "Generic Chic": "1x",
            "Leisurewear": "2x",
            "Businesswear": "3x",
            "High Fashion": "4x",
            "Urban Flash": "2x",
        }),
        "types": OrderedDict({
            "Generic Chic": clean("""
                This is the standard streetwear, made up of colorful modular components in many colors.
                Belts, coats, sashes and boots predominate.
            """),
            "Leisurewear": clean("""
                This is the equivalent of 21st-century athletic wear: padded fleece, corporate and
                athletic logos.
            """),
            "Businesswear": clean("""
                This is the equivalent of the standard business suit: understated colors, pinstripes,
                real leather shoes, etc. Wool and other natural fabrics are considered the proper
                outfitting for the up-and-coming Corp.
            """),
            "High Fashion": clean("""
                Sophisticated and expensive dressing for the upper class. Designer labels include
                Miyake, Si-fui Yan and Anne Calvin.
            """),
            "Urban Flash": clean("""
                Video jackets, colorshift fabrics, cammo, leathers, metal spikes, Logowear, jeans,
                leather skirts and boots. The wildest and most utterly chilled in cyberfashion.
            """),
        }),
    },
    "tools": {"name": "Tools", "description": "Tools"},
    "personalElectronics": {"name": "Personal Electronics", "description": "Personal Electronics"},
    "dataSystems": {"name": "Data Systems", "description": "Data Systems"},
    "communications": {"name": "Communications", "description": "Communications"},
    "surveillance": {"name": "Surveillance", "description": "Surveillance"},
    "entertainment": {
        "name": "Entertainment",
        "description": "Entertainment",
        "modifiers": OrderedDict({"Fair": "1x", "Good": "2x", "Excellent": "3x"}),
    },
    "security": {"name": "Security", "description": "Security"},
    "medical": {"name": "Medical", "description": "Medical"},
    # Keep the legacy key because the site and bundles already consume it.
    "furnshing": {"name": "Furnishings", "description": "Furnishings"},
    "vehicles": {
        "name": "Vehicles",
        "description": "Typical vehicles of the early 21st century. Cybercontrols double the listed cost.",
    },
    "lifestyle": {"name": "Lifestyle", "description": "Lifestyle"},
    "groceries": {"name": "Groceries", "description": "Groceries"},
    "housing": {
        "name": "Housing",
        "description": "Housing",
        "modifiers": OrderedDict({
            "combatZone": "1x",
            "moderateZone": "2x",
            "corporateZone": "4x",
            "executiveZone": "6x",
        }),
    },
})


ITEMS = {
    "fashion": OrderedDict({
        "pants": entry("Pants", "20.0", note="style modifier applies"),
        "top": entry("Top", "15.0", note="style modifier applies"),
        "jacket": entry("Jacket", "35.0", note="style modifier applies"),
        "footwear": entry("Footwear", "25.0", note="style modifier applies"),
        "accessory": entry("Jewelry", "between 10.0 and 100.0", note="style modifier applies"),
        "mirrorshades": entry("Mirrorshades", "between 5.0 and 50.0", note="style modifier applies"),
        "contactlenses": entry("Contact Lenses", "100.0", note="style modifier applies"),
        "glasses": entry("Glasses", "50.0", note="style modifier applies"),
    }),
    "tools": OrderedDict({
        "techscanner": entry("Techscanner", "600.0", description="""
            A small handheld microcomputer with various I/O connectors and probes. Techscanners run
            diagnostic programs, identify and examine malfunctioning components, and display internal
            schematics on a small screen.
        """),
        "cuttingtorch": entry("Cutting Torch", "40.0", description="""
            Common oxyacetylene type out of a bottle. Handheld and about a foot long. More powerful
            models are available, up to thermite lances at 5 to 15 times the normal cost.
        """),
        "techToolkit": entry("Tech Tool Kit", "100.0", description="""
            Mixed kit of tools for repairing mechanical items, usually in a 4 by 16 by 2 inch case.
        """),
        "breakingEnteringTools": entry("B&E Tools", "120.0"),
        "eletronicToolkit": entry("Electronics Tool Kit", "100.0", description="""
            A mixed kit of tools for repairing electronic items.
        """),
        "protectiveGoggles": entry("Protective Goggles", "20.0", description="""
            Protective eyewear for welding, metal machining, chemical mixing and similar work.
        """),
        "flashtube": entry("Flashlight", "2.0", description="""
            A standard flashlight with a beam range of 100 to 120 feet. Smaller pocket lights with one
            quarter of the range cost half the normal price.
        """),
        "glowstick": entry("Glowstik", "1.0", description="""
            A chemical light in a 6-inch plastic tube. Shake or break it to activate. Its soft light lasts
            up to six hours and is available in green, blue or red.
        """),
        "flashpaint": entry("Flashpaint", "10.0", note="per pint", description="""
            Fluorescent paint that gives off a soft light equal to a Glowstik and lasts up to four hours.
        """),
        "flashtape": entry("Flashtape", "10.0", note="per foot", description="""
            The same material as Flashpaint in tape form. It lasts six hours and comes in a variety of widths.
        """),
        "rope": entry("Rope", "2.0", note="per foot", description="""
            Braided synthetics in a variety of thicknesses and weights. Can hold up to 1,000 pounds.
        """),
        "breathmask": entry("Breathing Mask", "30.0", description="""
            A common painter's mask covering the nose and mouth, with two replaceable side filters.
            Replacement filters cost 1 eb per pack of ten. Good for keeping out the smog.
        """),
    }),
    "personalElectronics": OrderedDict({
        "hologen": entry("Holo Generator", "500.0", description="""
            A small box, about 4 by 2 by 6 inches, that projects a holographic picture from a replaceable
            chip. It accepts chips from most digital cameras and can be linked to a digital recorder/player.
        """),
        "videoBoard": entry("Video Board", "100.0", note="per square foot", description="""
            A monitor using flat-LCD technology. No thicker than an inch, most are built into TVs, but
            all have input plugs for use as readout monitors. Large units are used as advertising signs.
        """),
        "dataChip": entry("Datachip", "10.0", description="""
            The storage medium of the future. Usually plastic-cased, datachips come as buttons, flat
            squares and triangular slivers; adapter plugs let any recorder read any shape.
        """),
        "logcompass": entry("Logcompass", "50.0", description="""
            A programmable inertial compass that tracks changes in direction from a fixed bearing or point.
        """),
        "digitalRecorder": entry("Digital Recorder", "300.0", description="""
            An audio recorder using datachip technology. Most are the size of two paperback books stacked
            flat, although some are smaller than a pack of cards.
        """),
        "digitalCamera": entry("Digital Camera", "150.0", description="""
            Digitizes still images onto a chip cartridge. About the size of a pack of cigarettes.
        """),
        "videoCam": entry("VideoCam", "800.0", description="""
            Can be headset-mounted, shoulder-mounted or handheld depending on size. Sound and image are
            normally recorded on a compact tape-pak, or fed directly to a transmitter through cables.
            The listed price is for the least expensive shoulder-carried model.
        """),
        "tapePlayer": entry("Video/Audio Tape Player", "40.0", description="""
            Plays VideoCam tape-paks as well as many older-style audio tapes.
        """),
        "tape": entry("Video Tape", "4.0", description="""
            High-density digital media capable of handling both audio and visual images.
        """),
        "pocketTV": entry("Pocket TV", "80.0", description="""
            Uses a flat-scan screen in a package about 5 by 5 by 3/4 inches or smaller and receives most
            VHF and UHF stations.
        """),
        "chipPlayer": entry("Digital Chip Player", "150.0", description="""
            Plays audio- and video-recorded chips. A Video Board is required to display a chip's video track.
        """),
        "chip": entry("Digital Music Chip", "20.0", description="""
            Stores one to six music albums in semiconductor and plastic form. Read-write versions are available.
        """),
        "eletricGuitar": entry("Electric Guitar", "between 100.0 and 500.0", description="""
            Lighter and more flexible than the classic axe, sometimes in an unrecognizable shape. Strings
            and frets may even be replaced by banks of keys.
        """),
        "eletronicKeyboard": entry("Electronic Keyboard", "between 200.0 and 900.0", description="""
            Little changed from present-day keyboards except in size and power.
        """),
        "drumSynthesizer": entry("Drum Synthesizer", "between 200.0 and 800.0", description="""
            A set of percussion pads and a sound box. It fits into a couple of suitcases and can be arranged
            however the drummer prefers.
        """),
        "amplifier": entry("Amplifier", "between 500.0 and 1000.0", description="""
            Amplification equipment for electronic instruments.
        """),
    }),
    "dataSystems": OrderedDict({
        "laptop": entry("Laptop Computer", "900.0", description="""
            A common portable with an internal hard drive, detachable Video Board and slots for data or
            programming chips. It lacks the advanced CPUs and memory of a regular computer and cannot be
            used for Netrunning.
        """),
        "pocketComputer": entry("Pocket Computer", "100.0", description="""
            A programmable calculator with keyboard and chip slots, holding up to 100 pages of alphanumeric memory.
        """),
        "cybermodem": entry("Cybermodem", "Varies by design", description="See the Netrunning section."),
        "cellularCybermodem": entry("Cellular Cybermodem", "Varies by design", description="See the Netrunning section, page 133."),
        "interfaceCables": entry("Interface Cables", "between 20.0 and 30.0", description="""
            Typical plug-ended splicing cables that connect a cyber-operated machine to a person's Interface Plugs.
        """),
        "lowImpedance": entry("Low Impedance Cables", "60.0", description="""
            Special low-resistance, low-interference cables for improved data transfer. They grant +1 to
            interfacing tasks such as controlling cybervehicles or Netrunning.
        """),
        "trodeSet": entry("'Trode Set", "20.0", description="""
            A low-efficiency headset for piggybacking in the Net. Applies -2 to Interface.
        """),
        "keyboard": entry("Keyboard", "100.0", description="""
            Can be connected to a cybermodem or other electronic equipment.
        """),
        "terminal": entry("Terminal", "400.0", description="""
            A workstation with keyboard, Video Board and I/O connectors. It can be used to Netrun, making
            the runner immune to most Black software, but applies -5 to Interface. Terminal operators are
            commonly known as net-tortoises.
        """),
    }),
    "communications": OrderedDict({
        "mastoid": entry("Mastoid Commo", "100.0", description="""
            A radio transceiver glued to the jaw and temple. It transmits by subvocalization and receives
            through soundless vibrations. Range: 10 miles.
        """),
        "pocketCommo": entry("Pocket Commo", "50.0", description="A typical small walkie-talkie. Range: 10 miles."),
        "cellularPhone": entry("Cellular Phone", "400.0", description="""
            Mobile communication anywhere within a radiotelephone transceiver network. Service costs
            100 eb per month.
        """),
        "miniCellPhone": entry("Mini Cell Phone", "800.0", description="Fits inside a pack of cigarettes."),
    }),
    "surveillance": OrderedDict({
        "binglasses": entry("Binoglasses", "200.0", description="""
            High-tech vision aids combining binoculars with a laser rangefinder and sometimes IR lenses.
            More expensive models may include a digital camera.
        """),
        "binocular": entry("Binoculars", "20.0", description="Standard binoculars."),
        "lightBoosterGoogle": entry("Light Booster Goggles", "200.0", description="""
            Light-intensification goggles that amplify ambient light for night vision using Starlite technology.
            Sudden bright light can overwhelm them. With a Difficult tuning task, they can detect active IR beams.
        """),
        "irGoogles": entry("IR Goggles", "250.0", description="""
            Detect hazy background infrared sources. Normally used with an active IR source for invisible illumination.
        """),
        "irFlash": entry("IR Flashlight", "50.0", description="""
            An active infrared light source. UV versions are similar and can be used with the proper cyberoptic.
        """),
    }),
    "entertainment": OrderedDict({
        "movie": entry("Movie", "10.0"),
        "chipRental": entry("VCR/Chip Rental", "4.0"),
        "braindance": entry("Braindance", "20.0"),
        "liveConcert": entry("Live Concert/Sports Event", "50.0"),
        "fastFood": entry("Fast Food Meal", "5.0"),
        "wellDrink": entry("Well Drink", "3.0"),
        "restaurant": entry("Restaurant Meal", "20.0", note="restaurant or bar quality modifier applies"),
    }),
    "security": OrderedDict({
        "keylock": entry("Keylock", "20.0", note="per level", description="""
            A mechanical portal lock. Locks have four levels: Low Security (15), Medium Security (20),
            High Security (25) and Maximum Security (30).
        """),
        "cardlock": entry("Cardlock", "100.0", note="per level", description="""
            An electronic portal lock using a magnetically coded card. Locks have four levels: Low
            Security (15), Medium Security (20), High Security (25) and Maximum Security (30).
        """),
        "vocolock": entry("Vocolock", "200.0", note="per level", description="""
            An electronic portal lock using voice recognition. Locks have four levels: Low Security (15),
            Medium Security (20), High Security (25) and Maximum Security (30).
        """),
        "lineTap": entry("Line Tap", "200.0", description="""
            Captures voice or data from a telecommunications line for recording or retransmission. Advanced
            models work from about a foot away and can be remote-controlled. They do not work on systems
            installed or upgraded after the 2008 fiber-optic switchover.
        """),
        "codeDecryptor": entry("Code Decryptor", "500.0", description="""
            Its probe replaces a Cardlock's normal card and adds +5 to a TECH + Electronic Security + 1D10
            test against the lock.
        """),
        "vocDecryptor": entry("VocDecryptor", "1000.0", description="A vocal modulator for penetrating Vocolocks."),
        "securityScanner": entry("Security Scanner", "1500.0", description="""
            Searches for electromagnetic fields produced by alarm systems, with a 75% chance to locate one.
            A TECH or INT test may be needed to identify the alarm type.
        """),
        "poisonSniffer": entry("Poison Sniffer", "1500.0", description="""
            Checks air or liquid for specific poisons, or alerts the user to foreign substances. Accuracy: 85%.
        """),
        "jammingTransmitter": entry("Jamming Transmitter", "500.0", description="""
            Usually carried in two or three large cases, though some fill an entire van. Jams electromagnetic
            transmissions in a 1,000-foot area, including cellular phones and some cyberware.
        """),
        "scannerPlate": entry("Scanner Plate", "500.0", description="""
            A palmprint reader that can be attached to a Cardlock or Vocolock as an additional security layer.
        """),
        "movementSensor": entry("Movement Sensor", "40.0", description="""
            An alarm system covering seismic, sonar, fixed IR or visible-light networks. Detects movement in
            a defined area with 95% reliability; its processor is about the size of a cigarette pack.
        """),
        "passCard": entry("Passcard", "10.0", description="The most common device used to open a Cardlock."),
        "trackingDevice": entry("Tracking Device", "1000.0", description="""
            Handheld or suitcase-sized equipment for detecting and following Tracer Buttons. Range: 1 mile.
        """),
        "tracerButton": entry("Tracer Buttons", "50.0", note="set of six", description="""
            Range from matchbook-sized to pin-sized and use radioactivity or radio transmissions to reveal
            the position of whatever they are attached to. Some can be switched remotely.
        """),
        "remoteSensors": entry("Remote Sensors", "700.0"),
        "plasKuffs": entry("PlasKuffs", "100.0", description="""
            Strong restraint cuffs made from modern alloys. Breaking them is Nearly Impossible; half use a Cardlock.
        """),
        "stripwireBlinders": entry("Stripwire Binders", "5.0", note="box of twelve", description="""
            Single-use reinforced plastic strips for temporary handcuffs and leg ties. They are Very Difficult
            to break, use ceramic fibers to resist cutting, and are guaranteed fireproof.
        """),
    }),
    "medical": OrderedDict({
        "dermalStapler": entry("Dermal Stapler", "1000.0", description="""
            Pulls the sides of a wound together and sutures them with compressed organic staples that dissolve over time.
        """),
        "spraySkin": entry("Spray Skin", "50.0", note="per can", description="""
            A putty-like spray gel for severe abrasions. Antiseptic, sterile and air-permeable, it flakes off in about two weeks.
        """),
        "slapPatch": entry("Slap Patch", "varies by drug type", description="""
            A small medicated plastic pad applied to the skin so the drug is absorbed in steady doses.
            See the Trauma Team section for drugs and prices.
        """),
        "criotank": entry("Cryotank", "100000.0", description="""
            An advanced refrigeration tank that cools a body to preservation levels while life-support
            maintains blood and oxygen flow, keeping a dying body in relative stasis.
        """),
        "medkit": entry("Medkit", "50.0", description="""
            A doctor's or military corpsman's bag containing antidotes, dressings, drugs, applicators,
            medicines and examination instruments.
        """),
        "surgicalKit": entry("Surgical Set", "400.0", description="""
            A full set of surgical tools plus the chemicals and equipment needed to maintain a sterile operating field.
        """),
        "firstAidKit": entry("First Aid Kit", "10.0", description="""
            A household medical box containing bandages, antiseptics and a simple painkiller.
        """),
        "medscanner": entry("Medscanner", "300.0", description="""
            Reads body temperature, heart rate, blood pressure, respiration and blood sugar. Its chipped
            database grants +2 to Diagnose.
        """),
        "drugAnalyzer": entry("Drug Analyser", "75.0", description="""
            Ranges from book-sized to briefcase-sized. Determines the purity of known drugs or identifies
            the molecular structure and likely effects of substances resembling entries in its library.
        """),
        "airhypho": entry("Airhypo", "100.0", description="""
            Uses a burst of compressed air to force a liquid drug through the skin. See the Trauma Team
            section for drugs and prices.
        """),
        "clinicVisit": entry("Clinic Visit", "200.0"),
        "dayInHospital": entry("Day in Hospital", "300.0"),
        "dayInICU": entry("Day in Intensive Care", "1000.0"),
        "cloneLimbReplacement": entry("Clone Limb Replacement", "1500.0", note="varies by limb"),
    }),
    "furnshing": OrderedDict({
        "nylonCarryBag": entry("Nylon Carrybag", "5.0", description="""
            A 2000s athletic bag or kitbag available with many logos and in various sizes.
        """),
        "sleepingBag": entry("Sleeping Bag", "25.0", description="""
            Lightweight and rated for temperatures down to -100 F. Compresses to a 12 by 6 by 4 inch bundle.
        """),
        "inflatableBed": entry("Inflatable Bed", "25.0", description="""
            A self-inflating, highly compressed mattress package measuring about 6 by 2 by 4 inches when folded.
        """),
        "futon": entry("Futon", "90.0", description="A portable folding bed and pad of Japanese origin."),
        "realWoodFurniture": entry("Real Wood Furniture", "200.0", note="per piece", description="Real wood furniture."),
        "sintheticFurniture": entry("Synthetic Furniture", "100.0", note="per piece", description="Synthetic furniture."),
        "apartmentCube": entry("Apartment Cube", "5000.0", description="""
            A 10 by 10 by 8 foot living module with furnishings and appliances hidden in flush wall recesses.
            It contains a bed, closet, stove, refrigerator, TV, digital entertainment center, two chairs,
            fold-down desk and removable table, and can be transported as a single unit.
        """),
        "lamp": entry("Lamp", "20.0", description="Gives light and comes in an infinity of shapes and colors."),
        "cleaningRobot": entry("Cleaning Bot", "1000.0", description="""
            A small preprogrammed robotic cleaner, usually the size of a portable canister vacuum. Not very intelligent.
        """),
        "vocalSwitchSystem": entry("Vocal Switching System", "100.0", description="""
            Voice-activated controls for lights and appliances.
        """),
    }),
    "vehicles": OrderedDict({
        "scooter": entry("Scooter", "500.0", description="""
            An updated electric motorscooter with a top speed of about 50 mph and six hours of travel per fastcharge.
        """),
        "motorcycle": entry("Motorcycle", "1500.0", description="""
            Usually a recumbent design with protective plastic fairings. Electric models reach about 65 mph
            with eight hours of travel per fastcharge; CHOOH2 models reach about 140 mph with a four-gallon tank.
        """),
        "cityCar": entry("CityCar", "2000.0", description="""
            A one-person, three-wheeled Corporate Zone car with a top speed around 40 mph and four hours per
            fastcharge. CityCars can also be rented from corporate-area kiosks.
        """),
        "smallSubcompact": entry("Small Subcompact", "6000.0", description="""
            Usually methanol- or CHOOH2-powered, with a top speed around 90 mph, a ten-gallon tank and four seats.
        """),
        "mediumSedan": entry("Medium Sedan", "10000.0", description="""
            Methanol- or CHOOH2-powered, with a top speed around 90 mph, a fifteen-gallon tank and four seats.
        """),
        "sportsCar": entry("Sportscar", "20000.0", description="""
            Usually CHOOH2-powered, with a top speed around 210 mph, a ten-gallon tank and two seats.
        """),
        "luxurySedan": entry("Luxury Sedan", "40000.0", description="""
            Methanol- or CHOOH2-powered, with a top speed around 90 mph, a twenty-gallon tank and six seats.
        """),
    }),
    "lifestyle": OrderedDict({
        "cellPhoneService": entry("Cell Phone Service", "100.0", note="per month"),
        "standardPhoneService": entry("Standard Phone Service", "30.0", note="per month"),
        "payPhoneCall": entry("Pay Phone Call", "0.50", note="per minute"),
        "dataTermUse": entry("DataTerm Use", "1.0", note="per minute"),
        "credChipAccount": entry("CredChip Account", "20.0", note="per month", description="""
            A debit card used to carry cash electronically instead of in a wallet.
        """),
        "healthPlan": entry("Health Plan", "1000.0", note="per month"),
        # Existing site extensions are intentionally preserved.
        "traumaTeamSilver": entry("Trauma Team Silver Plan", "500.0", note="Paramedic service; surgery billed separately; response in 1D10 turns; per month"),
        "traumaTeamGold": entry("Trauma Team Gold Plan", "1000.0", note="Paramedic and ambulance service with limited armed escort; surgery billed separately; response in 1D8 turns; per month"),
        "traumaTeamPlatinum": entry("Trauma Team Platinum Plan", "2000.0", note="Paramedic, ambulance and armed escort; surgery billed separately; response in 1D6 turns; per month"),
        "traumaTeamDiamond": entry("Trauma Team Diamond Plan", "5000.0", note="Paramedic, ambulance, armed escort and cyberware repair; surgery included; response in 1D4 turns; per month"),
        "air": entry("Air", "5.0", note="per minute", description="""
            In heavily polluted regions, clean air is sold by air bars, vendors, street-corner machines and stores.
        """),
        "maglevChip": entry("Mag Lev Chit", "0.25", note="per station"),
        "taxi": entry("Taxi", "3.0", note="per mile"),
        "avTaxi": entry("AV-Taxi", "10.0", note="per mile"),
        "cableTV": entry("Cable TV", "40.0", note="per month"),
    }),
    "groceries": OrderedDict({
        "kibble": entry("Kibble", "50.0", note="per week", description="""
            A mass-produced nutrient satisfying most dietary needs but resembling dry pet food in look, smell and taste.
        """),
        "genericPrepak": entry("Generic Prepak", "150.0", note="per week", description="""
            A basic packaged meal that can be microwaved or refrigerated. Many include chemical heating or cooling tabs.
        """),
        "goodPrepak": entry("Good Prepak", "200.0", note="per week", description="""
            A good restaurant meal in a package, representing the best commonly available pre-made food.
        """),
        "freshFood": entry("Fresh Food", "300.0", note="per week", description="""
            Actual fresh food, or at least something eaten by someone who has seen it.
        """),
    }),
    "housing": OrderedDict({
        "coffin": entry("Coffin", "20.0", note="per night", description="""
            A stacked, coin-operated sleeping box found in airports and flophouses. It has just enough room
            to turn around or read in bed; expensive models may include a phone or mini-TV.
        """),
        "hotelRoom": entry("Hotel Room", "100.0", note="per night"),
        "apartment": entry("Apartment/Condo", "200.0", note="per room, per month; location modifier applies"),
        "house": entry("House", "150.0", note="per room, per month; location modifier applies"),
        "utilities": entry("Utilities", "100.0", note="per month"),
    }),
}


def main() -> None:
    original = json.loads(TARGET.read_text(encoding="utf-8"))
    result = OrderedDict({
        "$id": "/data/equipment.json",
        "title": "Equipment",
        "version": "1.1.0",
        "author": original.get("author", "Hendo"),
        "description": "Equipment from the Cyberpunk 2020 Corebook, with existing site extensions preserved.",
        "type": "object",
        "data": OrderedDict(),
    })

    for category_key, category_meta in CATEGORIES.items():
        category = OrderedDict(category_meta)
        category["list"] = ITEMS[category_key]
        result["data"][category_key] = category

    count = sum(len(items) for items in ITEMS.values())
    if count != 133:
        raise ValueError(f"unexpected equipment count: {count}")
    if set(CATEGORIES) != set(ITEMS):
        raise ValueError("category metadata and item maps are out of sync")

    TARGET.write_text(json.dumps(result, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    print(f"restored {TARGET.relative_to(ROOT)} with {count} entries")


if __name__ == "__main__":
    main()
