import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Home, X, Zap } from "lucide-react";
import { useGameData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { AdMob, RewardAdPluginEvents, AdMobRewardItem } from "@capacitor-community/admob";

// ── Ad Unit IDs ───────────────────────────────────────────────────────────────
const REWARDED_AD_ID     = "ca-app-pub-1445407957198527/6949268913"; // revive life
const INTERSTITIAL_AD_ID = "ca-app-pub-1445407957198527/6095352248"; // between rounds

// ── Word pool ─────────────────────────────────────────────────────────────────
type WordEntry = { word: string; hint: string };

const EASY_WORDS: WordEntry[] = [
  { word: "EAGLE",  hint: "Hunts from above" },
  { word: "TIGER",  hint: "Orange stripes" },
  { word: "JAPAN",  hint: "Rising sun flag" },
  { word: "PIZZA",  hint: "Sliced in triangles" },
  { word: "RIVER",  hint: "Always moving forward" },
  { word: "PIANO",  hint: "88 keys" },
  { word: "CLOUD",  hint: "Floats overhead" },
  { word: "STORM",  hint: "Thunder follows lightning" },
  { word: "GRAPE",  hint: "Grows in clusters" },
  { word: "SHARK",  hint: "Never stops swimming" },
  { word: "FLAME",  hint: "Needs oxygen" },
  { word: "CRANE",  hint: "Long neck, two meanings" },
  { word: "BRUSH",  hint: "Has bristles" },
  { word: "SWORD",  hint: "Double-edged" },
  { word: "HORSE",  hint: "Gallops on four legs" },
  { word: "HONEY",  hint: "Made in a hive" },
  { word: "OCEAN",  hint: "Covers most of Earth" },
  { word: "FROST",  hint: "Below zero outside" },
  { word: "SMOKE",  hint: "Rises and drifts" },
  { word: "STONE",  hint: "Millions of years old" },
  { word: "BRIDE",  hint: "Wears white" },
  { word: "CHAIR",  hint: "Usually four legs" },
  { word: "CHEST",  hint: "Can be buried for treasure" },
  { word: "CLOCK",  hint: "Two hands, no fingers" },
  { word: "CROWN",  hint: "Sits on royalty" },
  { word: "DANCE",  hint: "Needs rhythm" },
  { word: "EARTH",  hint: "Third from the sun" },
  { word: "FENCE",  hint: "Marks the boundary" },
  { word: "GHOST",  hint: "Invisible to most" },
  { word: "GRASS",  hint: "Needs mowing" },
  { word: "HEART",  hint: "Beats 100,000 times daily" },
  { word: "KNIFE",  hint: "Handle and blade" },
  { word: "FLUTE",  hint: "You blow across it" },
  { word: "GROVE",  hint: "Shaded by trees" },
  { word: "FIELD",  hint: "Open and flat" },
  { word: "CACTUS", hint: "Survives with almost no water" },
  { word: "SPORT",  hint: "Involves keeping score" },
  { word: "BRICK",  hint: "Rectangular and red" },
  { word: "GLASS",  hint: "See through it" },
  { word: "MOUNT",  hint: "You climb or ride it" },
  { word: "BLOOM",  hint: "Spring's first gift" },
  { word: "TORCH",  hint: "Carried in a relay" },
  { word: "PLANK",  hint: "Walk the —" },
  { word: "SCOUT",  hint: "Always prepared" },
  { word: "LODGE",  hint: "Mountain retreat" },
  { word: "BLAZE",  hint: "Blazing trail" },
  { word: "TROUT",  hint: "Freshwater fish" },
  { word: "QUILT",  hint: "Stitched together squares" },
  { word: "PRISM",  hint: "Splits white light to rainbow" },
  { word: "SIREN",  hint: "Greek myth lured sailors" },
  { word: "VAPOR",  hint: "Gas from a liquid" },
  { word: "DWARF",  hint: "Seven of them helped Snow White" },
  { word: "FLARE",  hint: "Emergency signal" },
  { word: "AMBER",  hint: "Fossilized golden resin" },
  { word: "ANGEL",  hint: "Feathered wings, no halo needed" },
  { word: "ARROW",  hint: "Points the way forward" },
  { word: "ATLAS",  hint: "Holds up the world" },
  { word: "BADGE",  hint: "Pinned to the chest" },
  { word: "BARON",  hint: "Wealthy landowner" },
  { word: "BEACH",  hint: "Sand meets water" },
  { word: "BISON",  hint: "Roams the great plains" },
  { word: "BOXER",  hint: "Gloves and a ring" },
  { word: "BROOK",  hint: "Smaller than a river" },
  { word: "CAMEL",  hint: "Two humps or one" },
  { word: "CANDY",  hint: "Melts in your mouth" },
  { word: "CARGO",  hint: "Loaded onto ships" },
  { word: "CEDAR",  hint: "Aromatic wood" },
  { word: "CHALK",  hint: "White and easily broken" },
  { word: "CHAMP",  hint: "First place finisher" },
  { word: "COBRA",  hint: "Spreads its hood when threatened" },
  { word: "COMET",  hint: "Icy visitor from deep space" },
  { word: "CORAL",  hint: "Built by tiny sea creatures" },
  { word: "CRAFT",  hint: "Made with your own hands" },
  { word: "CREEK",  hint: "Even smaller than a brook" },
  { word: "CREST",  hint: "Top of the wave" },
  { word: "DAISY",  hint: "White petals, yellow center" },
  { word: "DELTA",  hint: "River mouth, also Greek D" },
  { word: "DINGO",  hint: "Wild dog of Australia" },
  { word: "EMBER",  hint: "Glowing piece of dying fire" },
  { word: "FAIRY",  hint: "Wings, wand, granted wishes" },
  { word: "FEAST",  hint: "The table overflows with food" },
  { word: "FERRY",  hint: "Water taxi" },
  { word: "FLASH",  hint: "Blink and you miss it" },
  { word: "FLOCK",  hint: "Group of birds or sheep" },
  { word: "FUNGI",  hint: "Some edible, some deadly" },
  { word: "GLEAM",  hint: "A distant shimmer" },
  { word: "GLOBE",  hint: "Round map of Earth" },
  { word: "GNOME",  hint: "Lives in the garden" },
  { word: "GRAIN",  hint: "Ground to make flour" },
  { word: "HAVEN",  hint: "A safe refuge" },
  { word: "HERON",  hint: "Stands still, then strikes" },
  { word: "HOUND",  hint: "Follows scent trails" },
  { word: "IGLOO",  hint: "Built from ice blocks" },
  { word: "IVORY",  hint: "Banned trade today" },
  { word: "JEWEL",  hint: "Precious and sparkling" },
  { word: "LANCE",  hint: "A knight's long weapon" },
  { word: "LEMON",  hint: "Sour yellow fruit" },
  { word: "LLAMA",  hint: "South American pack animal" },
  { word: "LOTUS",  hint: "Floats on water, symbol of purity" },
  { word: "MAPLE",  hint: "Makes sweet syrup" },
  { word: "MARSH",  hint: "Wet and boggy ground" },
  { word: "PLAZA",  hint: "Open public square" },
  { word: "PLUME",  hint: "Feather or smoke trail" },
  { word: "POLAR",  hint: "White bear at the top of the world" },
  { word: "POUCH",  hint: "Where kangaroos carry young" },
  { word: "QUAIL",  hint: "Small, round game bird" },
  { word: "QUILL",  hint: "Wrote letters before pens" },
  { word: "RANCH",  hint: "Cowboys and cattle" },
  { word: "RAVEN",  hint: "All black, very intelligent" },
  { word: "REALM",  hint: "A kingdom's territory" },
  { word: "ROBIN",  hint: "Red-breasted songbird" },
  { word: "ROUGE",  hint: "French for red" },
  { word: "ROWDY",  hint: "Noisy and unruly" },
  { word: "RUGBY",  hint: "Oval ball, no pads" },
  { word: "RUINS",  hint: "All that remains" },
  { word: "SABLE",  hint: "The darkest black" },
  { word: "SANDY",  hint: "Like a beach" },
  { word: "SCONE",  hint: "Goes with clotted cream" },
  { word: "SHALE",  hint: "Layered sedimentary rock" },
  { word: "SHOAL",  hint: "Shallow water or fish group" },
  { word: "SHORE",  hint: "Where land meets sea" },
  { word: "SHRUB",  hint: "Smaller than a tree" },
  { word: "SOLAR",  hint: "Powered by the sun" },
  { word: "SQUAD",  hint: "A small tight team" },
  { word: "SQUID",  hint: "Ten-armed sea creature" },
  { word: "STAFF",  hint: "Workers or a walking stick" },
  { word: "STEED",  hint: "A noble horse" },
  { word: "STUMP",  hint: "All that's left after logging" },
  { word: "SURGE",  hint: "Sudden powerful wave" },
  { word: "SWAMP",  hint: "Murky and mosquito-filled" },
  { word: "SWIFT",  hint: "Fastest small bird alive" },
  { word: "TAPIR",  hint: "Odd-nosed jungle animal" },
  { word: "TALON",  hint: "Eagle's sharp claw" },
  { word: "TAUPE",  hint: "Dark brownish grey" },
  { word: "THORN",  hint: "Rose's defense" },
  { word: "TIARA",  hint: "Princess crown" },
  { word: "TIDAL",  hint: "Pulled by the moon" },
  { word: "TORUS",  hint: "Donut shape in math" },
  { word: "TOXIC",  hint: "Handle with caution" },
  { word: "TRAIL",  hint: "Hike it to the peak" },
  { word: "TRAMP",  hint: "Wanderer with no fixed home" },
  { word: "TRIBE",  hint: "Ancient social group" },
  { word: "TRULY",  hint: "Without any doubt" },
  { word: "TRUNK",  hint: "Elephant's nose or a suitcase" },
  { word: "TULIP",  hint: "Spring bloom from a bulb" },
  { word: "TUNIC",  hint: "Ancient Roman garment" },
  { word: "TURF",   hint: "Grass territory" },
  { word: "TWIRL",  hint: "Spin gracefully" },
  { word: "UDDER",  hint: "Milk comes from here" },
  { word: "ULTRA",  hint: "Beyond the extreme" },
  { word: "UNCLE",  hint: "Your parent's brother" },
  { word: "UNTIL",  hint: "Up to a point in time" },
  { word: "UNWED",  hint: "Not yet married" },
  { word: "USHER",  hint: "Guides you to your seat" },
  { word: "VINYL",  hint: "Old school music format" },
  { word: "VIPER",  hint: "Venomous snake" },
  { word: "VISIT",  hint: "Go see someone" },
  { word: "VISOR",  hint: "Shields your eyes from sun" },
  { word: "VISTA",  hint: "Breathtaking view" },
  { word: "VOCAL",  hint: "Loud and outspoken" },
  { word: "VODKA",  hint: "Clear Russian spirit" },
  { word: "VOUCH",  hint: "I can confirm that" },
  { word: "VULVA",  hint: "Part of female anatomy" },
  { word: "WALTZ",  hint: "Three-beat ballroom dance" },
  { word: "WEAVE",  hint: "Threads crossing threads" },
  { word: "WEDGE",  hint: "Triangular shape" },
  { word: "WITCH",  hint: "Broomstick not required" },
  { word: "WRECK",  hint: "After the crash" },
  { word: "WRIST",  hint: "Between hand and arm" },
  { word: "YACHT",  hint: "Sailboat for the wealthy" },
  { word: "YEARN",  hint: "Deeply longing for something" },
  { word: "YODEL",  hint: "Alpine singing style" },
  { word: "ZEBRA",  hint: "Nature's barcode" },
  { word: "ZILCH",  hint: "Absolutely nothing" },
  { word: "ZONAL",  hint: "Divided into zones" },
];

const MEDIUM_WORDS: WordEntry[] = [
  { word: "CASTLE",  hint: "Drawbridge and moat" },
  { word: "BRAZIL",  hint: "Largest in South America" },
  { word: "SALMON",  hint: "Swims upstream to return" },
  { word: "GARDEN",  hint: "Needs regular watering" },
  { word: "BRIDGE",  hint: "Spans the gap" },
  { word: "COYOTE",  hint: "Howls at night" },
  { word: "FOSSIL",  hint: "Preserved for millions of years" },
  { word: "GUITAR",  hint: "Six strings" },
  { word: "JUNGLE",  hint: "Receives heavy rainfall" },
  { word: "MIRROR",  hint: "Reverses everything" },
  { word: "PLANET",  hint: "Orbits a star" },
  { word: "PRISON",  hint: "High walls and locked doors" },
  { word: "RABBIT",  hint: "Long ears, short tail" },
  { word: "SHADOW",  hint: "Follows you in sunlight" },
  { word: "SILVER",  hint: "Second most precious metal" },
  { word: "TEMPLE",  hint: "Remove your shoes" },
  { word: "TURKEY",  hint: "Borders two continents" },
  { word: "VELVET",  hint: "Expensive and impossibly soft" },
  { word: "WALLET",  hint: "Usually in your back pocket" },
  { word: "WINTER",  hint: "Shortest days of the year" },
  { word: "COFFEE",  hint: "Seeds inside a red cherry" },
  { word: "DONKEY",  hint: "Stubborn by nature" },
  { word: "FALCON",  hint: "Fastest creature alive" },
  { word: "FOREST",  hint: "Oxygen factory" },
  { word: "HARBOR",  hint: "Ships dock here" },
  { word: "ISLAND",  hint: "Water all around" },
  { word: "KITTEN",  hint: "Tiny and full of energy" },
  { word: "MAGNET",  hint: "Attracts certain metals" },
  { word: "MONKEY",  hint: "Knuckle-walker relative" },
  { word: "OYSTER",  hint: "Makes something precious" },
  { word: "PARROT",  hint: "Copies everything you say" },
  { word: "PUZZLE",  hint: "Pieces that fit together" },
  { word: "FROZEN",  hint: "Below the melting point" },
  { word: "CRATER",  hint: "Left by impact" },
  { word: "CINDER",  hint: "Ash from fire" },
  { word: "DAGGER",  hint: "Shorter than a sword" },
  { word: "GOBLIN",  hint: "Small and mischievous" },
  { word: "LOCKET",  hint: "Worn around the neck" },
  { word: "NEEDLE",  hint: "Eye at one end" },
  { word: "PEPPER",  hint: "Makes you sneeze" },
  { word: "TUNDRA",  hint: "Frozen and treeless plain" },
  { word: "BREACH",  hint: "A gap in the defenses" },
  { word: "COBALT",  hint: "Deep blue element" },
  { word: "FAMINE",  hint: "No food for miles" },
  { word: "GRAVEL",  hint: "Crunches underfoot" },
  { word: "HERALD",  hint: "Brings royal news" },
  { word: "INSECT",  hint: "Six legs by definition" },
  { word: "JIGSAW",  hint: "Cutting curves" },
  { word: "LAUNCH",  hint: "3, 2, 1..." },
  { word: "NOODLE",  hint: "Long, thin, and boiled" },
  { word: "QUIVER",  hint: "Arrows stored here" },
  { word: "RAISIN",  hint: "Grape after the sun" },
  { word: "SPROUT",  hint: "First days of a plant" },
  { word: "UTOPIA",  hint: "Perfect world, nowhere" },
  { word: "VORTEX",  hint: "Spirals inward" },
  { word: "WALRUS",  hint: "Tusks and whiskers" },
  { word: "ALPINE",  hint: "High altitude terrain" },
  { word: "ARCHER",  hint: "Needs a bow and arrows" },
  { word: "ARTIST",  hint: "Creates something beautiful" },
  { word: "AUTUMN",  hint: "Leaves turn gold then fall" },
  { word: "BANDIT",  hint: "Masked and wanted" },
  { word: "BANNER",  hint: "Displayed at the entrance" },
  { word: "BEACON",  hint: "Guides ships safely home" },
  { word: "BEETLE",  hint: "Has a hard outer shell" },
  { word: "BOUNTY",  hint: "Reward for capture" },
  { word: "BREEZE",  hint: "Light and refreshing wind" },
  { word: "BRONZE",  hint: "Third place metal" },
  { word: "BUNKER",  hint: "Underground shelter" },
  { word: "BUTTER",  hint: "Spread on warm toast" },
  { word: "CANVAS",  hint: "Blank surface for a painter" },
  { word: "CARBON",  hint: "Building block of all life" },
  { word: "CASINO",  hint: "Odds always favor the house" },
  { word: "COBWEB",  hint: "Spider's abandoned network" },
  { word: "CONDOR",  hint: "Largest flying bird in the Americas" },
  { word: "COPPER",  hint: "Turns green with age" },
  { word: "COSMOS",  hint: "Everything that exists" },
  { word: "COTTON",  hint: "Soft natural fiber" },
  { word: "COUGAR",  hint: "Mountain lion by another name" },
  { word: "FRENZY",  hint: "Wild uncontrolled excitement" },
  { word: "GOBLET",  hint: "Drinking cup with a stem" },
  { word: "JOCKEY",  hint: "Rides horses to victory" },
  { word: "KNIGHT",  hint: "Armor and a horse" },
  { word: "LAGOON",  hint: "Calm water behind a reef" },
  { word: "LAUREL",  hint: "Crown of victory" },
  { word: "MAGPIE",  hint: "Black and white bird that collects shiny things" },
  { word: "MARBLE",  hint: "Cold, smooth, and swirled" },
  { word: "MARVEL",  hint: "Something truly amazing" },
  { word: "MEADOW",  hint: "Open grassy field" },
  { word: "METEOR",  hint: "Burns up in the atmosphere" },
  { word: "MUFFIN",  hint: "Baked in a tin" },
  { word: "MUSSEL",  hint: "Clings to rocks at the shore" },
  { word: "ONWARD",  hint: "Keep moving forward" },
  { word: "ORANGE",  hint: "The only fruit named after its color" },
  { word: "ORCHID",  hint: "Exotic tropical flower" },
  { word: "PEBBLE",  hint: "Smooth small stone" },
  { word: "PENCIL",  hint: "Has a lead core and eraser" },
  { word: "PIGEON",  hint: "City bird that delivers messages" },
  { word: "PILLAR",  hint: "Holds the roof up" },
  { word: "POLLEN",  hint: "Makes you sneeze in spring" },
  { word: "PYTHON",  hint: "Squeezes instead of bites" },
  { word: "QUARTZ",  hint: "Most common mineral on Earth" },
  { word: "RAPIDS",  hint: "White water rushing downstream" },
  { word: "RASCAL",  hint: "Mischievous but loveable" },
  { word: "RECIPE",  hint: "Ingredients and instructions" },
  { word: "RIDDLE",  hint: "Solve it with your mind" },
  { word: "RIPPLE",  hint: "Stone dropped in still water" },
  { word: "ROCKET",  hint: "Leaves the atmosphere fast" },
  { word: "SADDLE",  hint: "Sits on a horse's back" },
  { word: "SAVAGE",  hint: "Fierce and untamed" },
  { word: "SENTRY",  hint: "Guard on watch" },
  { word: "SHOVEL",  hint: "Digs holes in the ground" },
  { word: "SIGNAL",  hint: "A message sent without words" },
  { word: "SIMMER",  hint: "Just below boiling point" },
  { word: "SPONGE",  hint: "Soaks everything up" },
  { word: "SPRUCE",  hint: "Evergreen with short needles" },
  { word: "STABLE",  hint: "Where horses sleep" },
  { word: "STITCH",  hint: "One loop of thread" },
  { word: "SULTAN",  hint: "Ruler of an Islamic state" },
  { word: "SUMMIT",  hint: "The very top of a mountain" },
  { word: "SUNSET",  hint: "Sky turns orange at dusk" },
  { word: "SYMBOL",  hint: "Represents something else" },
  { word: "TANGLE",  hint: "Knots that resist untying" },
  { word: "TENDER",  hint: "Soft and gentle" },
  { word: "TENNIS",  hint: "Racket, net, yellow ball" },
  { word: "THRUSH",  hint: "Spotted songbird" },
  { word: "TICKET",  hint: "Your entry pass" },
  { word: "TIMBER",  hint: "Shout before the tree falls" },
  { word: "TOUCAN",  hint: "Enormous colorful beak" },
  { word: "TURNIP",  hint: "Round purple-white root vegetable" },
  { word: "VESSEL",  hint: "A boat or a container" },
  { word: "VIKING",  hint: "Norse seafaring warrior" },
  { word: "VIOLET",  hint: "Blue-purple flower" },
  { word: "WALNUT",  hint: "Wrinkled brain-shaped nut" },
  { word: "WEAPON",  hint: "Designed to cause harm" },
  { word: "WEASEL",  hint: "Long, thin, sneaky mammal" },
  { word: "WILLOW",  hint: "Weeping tree by the water" },
  { word: "WISDOM",  hint: "Experience turned into insight" },
  { word: "WONDER",  hint: "Fills you with awe" },
  { word: "WRAITH",  hint: "Ghost-like apparition" },
  { word: "ZIGZAG",  hint: "Left right left right" },
];

const HARD_WORDS: WordEntry[] = [
  { word: "ABANDON",  hint: "Leave without looking back" },
  { word: "BALCONY",  hint: "Open-air elevated platform" },
  { word: "CABINET",  hint: "Government or furniture" },
  { word: "CAPTAIN",  hint: "Wears a badge of command" },
  { word: "CHAPTER",  hint: "Numbers mark divisions" },
  { word: "CIRCUIT",  hint: "Goes in a complete loop" },
  { word: "COMFORT",  hint: "Like a warm blanket" },
  { word: "CURTAIN",  hint: "Blocks out the light" },
  { word: "DESTINY",  hint: "Written in the stars" },
  { word: "DIAMOND",  hint: "Forever" },
  { word: "EMBASSY",  hint: "Foreign soil at home" },
  { word: "ELEMENT",  hint: "Can't be broken down further" },
  { word: "EMPEROR",  hint: "A step above a king" },
  { word: "FACTORY",  hint: "Smokestacks and assembly lines" },
  { word: "FREEDOM",  hint: "Can't be bought or sold" },
  { word: "GATEWAY",  hint: "The first step through" },
  { word: "GLACIER",  hint: "Moves an inch per year" },
  { word: "GORILLA",  hint: "Knuckle-walker of the rainforest" },
  { word: "HARVEST",  hint: "End of the growing season" },
  { word: "HISTORY",  hint: "Written by the winners" },
  { word: "HORIZON",  hint: "Always the same distance away" },
  { word: "JUSTICE",  hint: "Blindfolded with scales" },
  { word: "KINGDOM",  hint: "Has a throne room" },
  { word: "KITCHEN",  hint: "Smells of spice" },
  { word: "LANTERN",  hint: "Before electricity existed" },
  { word: "LIBRARY",  hint: "Shhh..." },
  { word: "MIRACLE",  hint: "Against impossible odds" },
  { word: "MORNING",  hint: "Coffee and silence" },
  { word: "MYSTERY",  hint: "Clues lead you there" },
  { word: "NARWHAL",  hint: "Unicorn of the sea" },
  { word: "OCTOPUS",  hint: "Eight arms, three hearts" },
  { word: "PACKAGE",  hint: "Knock knock, it arrived" },
  { word: "PENGUIN",  hint: "Wears a tuxedo by default" },
  { word: "NETWORK",  hint: "Nodes and connections" },
  { word: "CLIMATE",  hint: "Long-term weather patterns" },
  { word: "FANTASY",  hint: "Dragons might live here" },
  { word: "MISSION",  hint: "Impossible sometimes" },
  { word: "NOTHING",  hint: "The void" },
  { word: "ORGANIC",  hint: "No chemicals involved" },
  { word: "PHANTOM",  hint: "Seen by few" },
  { word: "ANTLER",  hint: "Grows on a deer's head" },
  { word: "BOBCAT",  hint: "Wild North American feline" },
  { word: "CELLAR",  hint: "Below the kitchen floor" },
  { word: "ENAMEL",  hint: "Hard outer layer of a tooth" },
  { word: "FERRET",  hint: "Curious and weasel-like" },
  { word: "GROTTO",  hint: "Small hidden cave" },
  { word: "HAMLET",  hint: "Smaller than a village" },
  { word: "IMPACT",  hint: "Force on contact" },
  { word: "JESTER",  hint: "Entertains the royal court" },
  { word: "KETTLE",  hint: "Boils water fast" },
  { word: "MUSTER",  hint: "Gather the troops" },
  { word: "NAPKIN",  hint: "Cloth for your lap" },
  { word: "PATROL",  hint: "Walk the perimeter" },
  { word: "RESCUE",  hint: "Someone needs saving" },
  { word: "SCULPT",  hint: "Shape with your hands" },
  { word: "ABANDON",  hint: "Leave without looking back" },
  { word: "ANCIENT",  hint: "Thousands of years old" },
  { word: "ANXIETY",  hint: "Worry that won't switch off" },
  { word: "ARCHWAY",  hint: "Walk under the curved stone" },
  { word: "ARSENAL",  hint: "Stockpile of weapons" },
  { word: "BALLOON",  hint: "Rises with hot air or helium" },
  { word: "BATTERY",  hint: "Stores electrical energy" },
  { word: "BENEATH",  hint: "Directly below" },
  { word: "BLOSSOM",  hint: "Tree in spring bloom" },
  { word: "CITIZEN",  hint: "Legal member of a country" },
  { word: "CLARITY",  hint: "Crystal clear understanding" },
  { word: "COLLECT",  hint: "Gather them all together" },
  { word: "COMMAND",  hint: "An order that must be obeyed" },
  { word: "COMFORT",  hint: "Like a warm blanket on a cold night" },
  { word: "COURAGE",  hint: "Bravery when fear is real" },
  { word: "CRUCIAL",  hint: "Absolutely cannot be skipped" },
  { word: "CRYSTAL",  hint: "Perfectly formed structure" },
  { word: "CULTURE",  hint: "Shared traditions of a people" },
  { word: "CURIOUS",  hint: "Always asking why" },
  { word: "CURTAIN",  hint: "Blocks out the light" },
  { word: "DEFENSE",  hint: "Protects what matters" },
  { word: "DELIVER",  hint: "Bring it to the door" },
  { word: "DEVOTED",  hint: "Completely dedicated" },
  { word: "DISTANT",  hint: "Far away in space or mind" },
  { word: "DOLPHIN",  hint: "Smarter than most humans suspect" },
  { word: "DORMANT",  hint: "Sleeping but not dead" },
  { word: "DYNAMIC",  hint: "Always changing and energetic" },
  { word: "ECLIPSE",  hint: "Sun blocked by the moon" },
  { word: "ELEGANT",  hint: "Graceful and refined" },
  { word: "EMERALD",  hint: "Deep green precious stone" },
  { word: "ENDLESS",  hint: "No finish line in sight" },
  { word: "ETERNAL",  hint: "Never begins, never ends" },
  { word: "EXHAUST",  hint: "Nothing left in the tank" },
  { word: "EXPLORE",  hint: "Go where few have gone" },
  { word: "EXTREME",  hint: "Way beyond the normal limit" },
  { word: "FASHION",  hint: "Trends that keep changing" },
  { word: "FURNACE",  hint: "Blazing hot heating chamber" },
  { word: "GENUINE",  hint: "The real deal, no fakes" },
  { word: "GODDESS",  hint: "Female deity" },
  { word: "GRAVITY",  hint: "What goes up must come down" },
  { word: "HATCHET",  hint: "Small axe for one hand" },
  { word: "HIGHWAY",  hint: "Fast multi-lane road" },
  { word: "HOLIDAY",  hint: "No work, all rest" },
  { word: "HOSTAGE",  hint: "Held against their will" },
  { word: "HUNTING",  hint: "Tracking prey through the wild" },
  { word: "LIBERTY",  hint: "Freedom from control" },
  { word: "LOYALTY",  hint: "Stays by your side no matter what" },
  { word: "MACHINE",  hint: "Gears and motors working together" },
  { word: "MANSION",  hint: "More rooms than you need" },
  { word: "MISSILE",  hint: "Guided flying weapon" },
  { word: "NOWHERE",  hint: "An empty, non-existent place" },
  { word: "NUCLEAR",  hint: "Splits atoms for power" },
  { word: "OBSERVE",  hint: "Watch carefully" },
  { word: "PASSAGE",  hint: "A narrow route through" },
  { word: "PATTERN",  hint: "Repeated design" },
  { word: "PILGRIM",  hint: "Makes a sacred journey" },
  { word: "PIONEER",  hint: "First to venture somewhere new" },
  { word: "PRECISE",  hint: "Exactly right, no error" },
  { word: "PRODUCE",  hint: "Fresh food from farms" },
  { word: "PROJECT",  hint: "A planned piece of work" },
  { word: "PROMISE",  hint: "Your word, your bond" },
  { word: "PROTECT",  hint: "Keep safe from harm" },
  { word: "PURPOSE",  hint: "The reason it exists" },
  { word: "PYRAMID",  hint: "Ancient triangular tomb" },
  { word: "QUANTUM",  hint: "Subatomic physics level" },
  { word: "QUARTER",  hint: "One of four equal parts" },
  { word: "SCARLET",  hint: "Vivid bright red" },
  { word: "SCIENCE",  hint: "Experiments, data, conclusions" },
  { word: "SERVANT",  hint: "Works for another" },
  { word: "SHELTER",  hint: "Protection from the elements" },
  { word: "SILENCE",  hint: "Absence of all sound" },
  { word: "SOLDIER",  hint: "Trained for combat" },
  { word: "SPECIES",  hint: "A distinct type of living thing" },
  { word: "SURFACE",  hint: "The outermost layer" },
  { word: "SURVIVE",  hint: "Make it through against the odds" },
  { word: "TACTICS",  hint: "Planned moves to win" },
  { word: "TEACHER",  hint: "Shapes the next generation" },
  { word: "THUNDER",  hint: "Follows the lightning" },
  { word: "TORNADO",  hint: "Spinning column of destruction" },
  { word: "TRAGEDY",  hint: "A story ending in loss" },
  { word: "TRIUMPH",  hint: "Total and complete victory" },
  { word: "UNICORN",  hint: "Single-horned mythical horse" },
  { word: "VILLAIN",  hint: "The one you root against" },
  { word: "WARRIOR",  hint: "Trained and ready for battle" },
  { word: "WESTERN",  hint: "Cowboys, deserts, saloons" },
];

const INSANE_WORDS: WordEntry[] = [
  { word: "ABSOLUTE",  hint: "No exceptions whatsoever" },
  { word: "ALPHABET",  hint: "26 in English" },
  { word: "AMBITION",  hint: "Drives people to the top" },
  { word: "ANCESTOR",  hint: "Your roots, centuries back" },
  { word: "BACKFIRE",  hint: "When the plan turns on you" },
  { word: "BACTERIA",  hint: "Single-celled and everywhere" },
  { word: "CALENDAR",  hint: "12 months, 365 days" },
  { word: "CHAMPION",  hint: "The last one standing" },
  { word: "CHEMICAL",  hint: "Bonds and reactions" },
  { word: "DARKNESS",  hint: "Fear's birthplace" },
  { word: "DAUGHTER",  hint: "Girl of the family" },
  { word: "DOCUMENT",  hint: "Sign here please" },
  { word: "DOMINATE",  hint: "Take full control" },
  { word: "DRAMATIC",  hint: "Everything becomes a scene" },
  { word: "ENORMOUS",  hint: "Impossible to miss" },
  { word: "ERUPTION",  hint: "Earth releasing pressure" },
  { word: "FRACTION",  hint: "Top number and bottom number" },
  { word: "GENERATE",  hint: "Create from nothing" },
  { word: "GENEROUS",  hint: "Always the first to give" },
  { word: "GRATEFUL",  hint: "Counts every blessing" },
  { word: "HARDWARE",  hint: "You can physically touch it" },
  { word: "HOSPITAL",  hint: "Nurses and doctors" },
  { word: "HUMANITY",  hint: "Eight billion and counting" },
  { word: "IDENTITY",  hint: "Who are you, really" },
  { word: "INNOCENT",  hint: "No fingerprints, no case" },
  { word: "INSTINCT",  hint: "No thinking required" },
  { word: "INTERVAL",  hint: "Pause between the acts" },
  { word: "JEALOUSY",  hint: "The green-eyed monster" },
  { word: "KEYBOARD",  hint: "Click clack under your fingers" },
  { word: "KINDNESS",  hint: "Always free to give" },
  { word: "LANGUAGE",  hint: "Millions of words and counting" },
  { word: "LANDMARK",  hint: "Hard to miss, easy to find" },
  { word: "BALANCED",  hint: "Equal on both sides" },
  { word: "CATALYST",  hint: "Sparks a reaction" },
  { word: "EVALUATE",  hint: "Give it a score" },
  { word: "FREQUENT",  hint: "Happens again and again" },
  { word: "LIFESPAN",  hint: "Measured in years" },
  { word: "DAYBREAK",  hint: "First hint of light" },
  { word: "BREATHE",   hint: "You do it 20,000 times a day" },
  { word: "OVERCOME",  hint: "Conquer the obstacle" },
  { word: "ABSOLUTE",  hint: "Zero doubt involved" },
  { word: "APPROACH",  hint: "Getting closer now" },
  { word: "BLIZZARD",  hint: "White-out conditions" },
  { word: "CARRIAGE",  hint: "Horse-drawn transport" },
  { word: "COLLAPSE",  hint: "Crumbles under pressure" },
  { word: "CREATURE",  hint: "Living and breathing" },
  { word: "CRIMINAL",  hint: "Broke the law" },
  { word: "DESCRIBE",  hint: "Paint a picture with words" },
  { word: "DIAMONDS",  hint: "Girl's best friend, allegedly" },
  { word: "DISASTER",  hint: "Nothing went right" },
  { word: "DRIFTING",  hint: "No direction, no anchor" },
  { word: "ENTRANCE",  hint: "Where you walk in" },
  { word: "FLOATING",  hint: "Neither sinking nor swimming" },
  { word: "FRACTION",  hint: "Part of the whole" },
  { word: "GALACTIC",  hint: "On a cosmic scale" },
  { word: "GLOBULAR",  hint: "Shaped like a sphere" },
  { word: "IGNITION",  hint: "Sparks the engine" },
  { word: "JUNCTION",  hint: "Where two roads meet" },
  { word: "LEVERAGE",  hint: "Use a fulcrum" },
  { word: "MAGNETIC",  hint: "North always points here" },
  { word: "MANIFEST",  hint: "Make it a reality" },
  { word: "NOMINATE",  hint: "Put forward a name" },
  { word: "OFFSHORE",  hint: "Beyond the coastline" },
  { word: "OUTBREAK",  hint: "Sudden spread of disease" },
  { word: "PATIENCE",  hint: "Worth waiting for" },
  { word: "PERSISTS",  hint: "Keeps going regardless" },
  { word: "QUADRANT",  hint: "One of four equal sections" },
  { word: "RELIABLE",  hint: "Always shows up on time" },
  { word: "ABSTRACT",  hint: "Ideas without physical form" },
  { word: "ACOUSTIC",  hint: "No electricity required" },
  { word: "ACTIVITY",  hint: "Something you do" },
  { word: "ADEQUATE",  hint: "Enough, but barely" },
  { word: "ADVANCED",  hint: "Beyond the basics" },
  { word: "ALLIANCE",  hint: "Two sides working as one" },
  { word: "ALTITUDE",  hint: "Height above sea level" },
  { word: "ANALYSIS",  hint: "Breaking down to understand" },
  { word: "APPARENT",  hint: "Seems obvious at first glance" },
  { word: "APPETITE",  hint: "Growling stomach" },
  { word: "BACKBONE",  hint: "The core that holds everything up" },
  { word: "BACKWARD",  hint: "Moving in reverse" },
  { word: "BOLDNESS",  hint: "Daring without hesitation" },
  { word: "BREAKING",  hint: "Snap it in two" },
  { word: "BUILDING",  hint: "Constructed floor by floor" },
  { word: "CHANGING",  hint: "Nothing stays the same" },
  { word: "COLORFUL",  hint: "Not a single dull hue" },
  { word: "COMMENCE",  hint: "Begin officially" },
  { word: "COMPLETE",  hint: "All parts present" },
  { word: "COMPOUND",  hint: "Made of multiple parts" },
  { word: "CONSIDER",  hint: "Think it over carefully" },
  { word: "CONSTANT",  hint: "Never wavers or changes" },
  { word: "CONTINUE",  hint: "Don't stop now" },
  { word: "CONTRACT",  hint: "Sign on the dotted line" },
  { word: "CRITICAL",  hint: "Absolutely essential" },
  { word: "DEADLINE",  hint: "The clock is ticking" },
  { word: "DECISION",  hint: "Choose one path" },
  { word: "DECREASE",  hint: "Getting smaller" },
  { word: "DELICATE",  hint: "Handle with extreme care" },
  { word: "DELIVERY",  hint: "Package at your door" },
  { word: "DETECTED",  hint: "Found, despite hiding" },
  { word: "DIVISION",  hint: "Split into equal parts" },
  { word: "DOMINANT",  hint: "Rules everything around it" },
  { word: "DURATION",  hint: "How long it lasts" },
  { word: "EMPHASIS",  hint: "The part that matters most" },
  { word: "ENTANGLE",  hint: "Twisted and caught up" },
  { word: "EVIDENCE",  hint: "Proves beyond doubt" },
  { word: "EXCHANGE",  hint: "Trade one for another" },
  { word: "EXERCISE",  hint: "Keeps the body fit" },
  { word: "EXPLICIT",  hint: "Nothing left unsaid" },
  { word: "FRAGMENT",  hint: "A broken-off piece" },
  { word: "GUARDIAN",  hint: "Protects and watches over" },
  { word: "IDENTIFY",  hint: "Put a name to it" },
  { word: "IGNORANT",  hint: "Unaware due to lack of knowledge" },
  { word: "IMMINENT",  hint: "About to happen right now" },
  { word: "INCIDENT",  hint: "An event worth reporting" },
  { word: "INCREASE",  hint: "Getting bigger" },
  { word: "INFINITE",  hint: "Goes on forever" },
  { word: "INSPIRED",  hint: "A great idea just struck" },
  { word: "LATITUDE",  hint: "Distance north or south of equator" },
  { word: "LAVENDER",  hint: "Purple herb with a calming scent" },
  { word: "LISTENER",  hint: "Pays attention without interrupting" },
  { word: "MAINTAIN",  hint: "Keep it working properly" },
  { word: "MARATHON",  hint: "26.2 miles on foot" },
  { word: "MAXIMIZE",  hint: "Get every last bit of it" },
  { word: "MEMBRANE",  hint: "Thin flexible biological layer" },
  { word: "MIDNIGHT",  hint: "Darkest hour of the night" },
  { word: "MINIMIZE",  hint: "Make it as small as possible" },
  { word: "MINORITY",  hint: "Fewer than half" },
  { word: "MODERATE",  hint: "Neither too much nor too little" },
  { word: "MOLECULE",  hint: "Atoms bonded together" },
  { word: "MOMENTUM",  hint: "Mass times velocity" },
  { word: "MULTIPLY",  hint: "Make it many times larger" },
  { word: "NAVIGATE",  hint: "Find the way through" },
  { word: "NORTHERN",  hint: "Toward the North Pole" },
  { word: "NOTEBOOK",  hint: "Captures your thoughts" },
  { word: "OVERFLOW",  hint: "Too much to contain" },
  { word: "PARADISE",  hint: "Heaven on Earth" },
  { word: "PERCEIVE",  hint: "Sense and understand" },
  { word: "PHYSICAL",  hint: "Exists in the real world" },
  { word: "POSITIVE",  hint: "Glass is half full" },
  { word: "PRESENCE",  hint: "The feeling that someone is here" },
  { word: "PRESSURE",  hint: "Force applied per unit area" },
  { word: "PREVIOUS",  hint: "Came just before this one" },
  { word: "PRISONER",  hint: "Locked away behind bars" },
  { word: "PURCHASE",  hint: "Exchange money for goods" },
  { word: "REACTION",  hint: "What happens in response" },
  { word: "REMEMBER",  hint: "Pull it from your memory" },
  { word: "RESOURCE",  hint: "Useful material or supply" },
  { word: "RESTRICT",  hint: "Keep it from going further" },
  { word: "SCENARIO",  hint: "A possible future situation" },
  { word: "SENTENCE",  hint: "Subject, verb, object" },
  { word: "SEQUENCE",  hint: "In the correct order" },
  { word: "SHOULDER",  hint: "Between your neck and arm" },
  { word: "SKELETON",  hint: "The framework inside" },
  { word: "SOFTWARE",  hint: "Code running on hardware" },
  { word: "SPECTRUM",  hint: "All colors of the rainbow" },
  { word: "STANDARD",  hint: "The expected benchmark" },
  { word: "STANDING",  hint: "Upright, not sitting" },
  { word: "STRENGTH",  hint: "Power to lift or endure" },
  { word: "STRUGGLE",  hint: "Fighting hard against difficulty" },
  { word: "SUBMERGE",  hint: "Go completely underwater" },
  { word: "SURROUND",  hint: "Encircle completely" },
  { word: "SYMPATHY",  hint: "Feeling sorry for another" },
  { word: "TALENTED",  hint: "Gifted beyond average" },
  { word: "THOUSAND",  hint: "Ten hundreds" },
  { word: "TOMORROW",  hint: "The day that never quite arrives" },
  { word: "TRANSFER",  hint: "Move it from here to there" },
  { word: "TRIANGLE",  hint: "Three sides, three angles" },
  { word: "ULTIMATE",  hint: "The final and greatest" },
  { word: "UNIVERSE",  hint: "Everything that exists" },
  { word: "VARIABLE",  hint: "Changes depending on conditions" },
  { word: "VELOCITY",  hint: "Speed in a direction" },
  { word: "VERTICAL",  hint: "Straight up and down" },
  { word: "WHATEVER",  hint: "Anything at all" },
  { word: "ABSOLUTE",  hint: "Zero doubt, zero exceptions" },
  { word: "CALENDAR",  hint: "12 months, 365 days" },
  { word: "CHAMPION",  hint: "The last one standing" },
  { word: "CHEMICAL",  hint: "Bonds and reactions" },
  { word: "DARKNESS",  hint: "Fear's birthplace" },
  { word: "DOCUMENT",  hint: "Sign here please" },
  { word: "DRAMATIC",  hint: "Everything becomes a scene" },
  { word: "ENORMOUS",  hint: "Impossible to miss" },
  { word: "ERUPTION",  hint: "Earth releasing pressure" },
  { word: "GENERATE",  hint: "Create from nothing" },
  { word: "GRATEFUL",  hint: "Counts every blessing" },
  { word: "HARDWARE",  hint: "You can physically touch it" },
  { word: "HOSPITAL",  hint: "Nurses and doctors" },
  { word: "HUMANITY",  hint: "Eight billion and counting" },
  { word: "INNOCENT",  hint: "No fingerprints, no case" },
  { word: "INSTINCT",  hint: "No thinking required" },
  { word: "JEALOUSY",  hint: "The green-eyed monster" },
  { word: "KEYBOARD",  hint: "Click clack under fingers" },
  { word: "KINDNESS",  hint: "Always free to give" },
  { word: "LANGUAGE",  hint: "Millions of words and counting" },
  { word: "LANDMARK",  hint: "Hard to miss, easy to find" },
  { word: "BALANCED",  hint: "Equal on both sides" },
  { word: "CATALYST",  hint: "Sparks a reaction" },
  { word: "EVALUATE",  hint: "Give it a score" },
  { word: "FREQUENT",  hint: "Happens again and again" },
  { word: "LIFESPAN",  hint: "Measured in years" },
  { word: "DAYBREAK",  hint: "First hint of light" },
  { word: "BREATHE",   hint: "You do it 20,000 times a day" },
  { word: "OVERCOME",  hint: "Conquer the obstacle" },
  { word: "APPROACH",  hint: "Getting closer now" },
  { word: "BLIZZARD",  hint: "White-out conditions" },
  { word: "CARRIAGE",  hint: "Horse-drawn transport" },
  { word: "COLLAPSE",  hint: "Crumbles under pressure" },
  { word: "CREATURE",  hint: "Living and breathing" },
  { word: "CRIMINAL",  hint: "Broke the law" },
  { word: "DESCRIBE",  hint: "Paint a picture with words" },
  { word: "DISASTER",  hint: "Nothing went right" },
  { word: "DRIFTING",  hint: "No direction, no anchor" },
  { word: "ENTRANCE",  hint: "Where you walk in" },
  { word: "FLOATING",  hint: "Neither sinking nor swimming" },
  { word: "GALACTIC",  hint: "On a cosmic scale" },
  { word: "IGNITION",  hint: "Sparks the engine" },
  { word: "JUNCTION",  hint: "Where two roads meet" },
  { word: "LEVERAGE",  hint: "Use a fulcrum" },
  { word: "MAGNETIC",  hint: "North always points here" },
  { word: "MANIFEST",  hint: "Make it a reality" },
  { word: "NOMINATE",  hint: "Put forward a name" },
  { word: "OFFSHORE",  hint: "Beyond the coastline" },
  { word: "OUTBREAK",  hint: "Sudden spread of disease" },
  { word: "PATIENCE",  hint: "Worth waiting for" },
  { word: "QUADRANT",  hint: "One of four equal sections" },
];

// ── Tiers ─────────────────────────────────────────────────────────────────────
type Tier = "EASY" | "MEDIUM" | "HARD" | "INSANE";
type GameState =
  | "COUNTDOWN" | "TYPING" | "GUESSING" | "FEEDBACK"
  | "AD_REVIVE" | "INTERSTITIAL" | "MATCH_OVER" | "GAME_OVER";

const TIERS = [
  { tier: "EASY"   as Tier, rounds: [1, 5]    as [number, number], speed: 580, pool: "easy",   mult: 1.0 },
  { tier: "MEDIUM" as Tier, rounds: [6, 15]   as [number, number], speed: 360, pool: "medium", mult: 2.0 },
  { tier: "HARD"   as Tier, rounds: [16, 30]  as [number, number], speed: 210, pool: "hard",   mult: 3.5 },
  { tier: "INSANE" as Tier, rounds: [31, 999] as [number, number], speed: 115, pool: "insane", mult: 6.0 },
];

const TIER_COLORS: Record<Tier, string> = {
  EASY:   "text-emerald-400",
  MEDIUM: "text-yellow-400",
  HARD:   "text-orange-400",
  INSANE: "text-red-400",
};

const TIER_BG: Record<Tier, string> = {
  EASY:   "bg-emerald-500/10 border-emerald-500/30",
  MEDIUM: "bg-yellow-500/10 border-yellow-500/30",
  HARD:   "bg-orange-500/10 border-orange-500/30",
  INSANE: "bg-red-500/10 border-red-500/30",
};

const POOL: Record<string, WordEntry[]> = {
  easy: EASY_WORDS, medium: MEDIUM_WORDS, hard: HARD_WORDS, insane: INSANE_WORDS,
};

// Multiplayer match length
const MP_TOTAL = 10;

// ── Bot config ────────────────────────────────────────────────────────────────
const BOT_COLORS = ["bg-violet-500", "bg-orange-500", "bg-pink-500"];
const BOT_NAMES  = ["NeonNinja",     "SpeedDemon",    "GhostWord"  ];

// ── Praise messages ───────────────────────────────────────────────────────────
const PRAISE: { maxRatio: number; lines: string[] }[] = [
  { maxRatio: 0.00, lines: ["PSYCHIC!",   "MINDREAD!",   "IMPOSSIBLE!"] },
  { maxRatio: 0.18, lines: ["FLAWLESS!",  "GENIUS!",     "INCREDIBLE!"] },
  { maxRatio: 0.38, lines: ["SHARP!",     "EXCELLENT!",  "BRILLIANT!"]  },
  { maxRatio: 0.55, lines: ["GREAT!",     "NICE ONE!",   "SOLID!"]      },
  { maxRatio: 0.72, lines: ["GOOD!",      "KEEP IT UP!", "WELL DONE!"]  },
  { maxRatio: 1.00, lines: ["CLOSE ONE!", "JUST IN TIME!", "MADE IT!"]  },
];

function getPraise(ratio: number): string {
  const t = PRAISE.find((p) => ratio <= p.maxRatio) ?? PRAISE[PRAISE.length - 1];
  return t.lines[Math.floor(Math.random() * t.lines.length)];
}

// Points: quadratic early-stop bonus
function calcPoints(revealed: number, wordLen: number, mult: number): number {
  const ratio = revealed / wordLen;
  const bonus  = Math.pow(1 - ratio, 2);
  return Math.max(10, Math.floor(wordLen * 150 * bonus * mult));
}

function getTier(round: number) {
  return TIERS.find((t) => round >= t.rounds[0] && round <= t.rounds[1]) ?? TIERS[3];
}

function pickWord(pool: string): WordEntry {
  const words = POOL[pool];
  return words[Math.floor(Math.random() * words.length)];
}

// ── Game component ────────────────────────────────────────────────────────────
export default function Game() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const isMultiplayer = search.includes("mode=multiplayer");
  const botCount = search.includes("type=1v1v1v1") ? 3 : search.includes("type=1v1v1") ? 2 : 1;
  const { scores, setScores } = useGameData();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState>("COUNTDOWN");
  const [countdown, setCountdown] = useState(3);
  const [round, setRound]         = useState(1);
  const [score, setScore]         = useState(0);
  const [lives, setLives]         = useState(3);
  const [canRevive, setCanRevive] = useState(true);
  const [mpRound, setMpRound]     = useState(1);   // 1-10 for multiplayer
  const [paused, setPaused]       = useState(false);

  const [entry, setEntry]         = useState<WordEntry>({ word: "", hint: "" });
  const [revealed, setRevealed]   = useState(0);
  const [guess, setGuess]         = useState("");
  const [feedback, setFeedback]   = useState<{
    kind: "correct" | "wrong" | "slow";
    points?: number;
    praise?: string;
  } | null>(null);
  const [showHint, setShowHint]   = useState(true);

  const [botScores, setBotScores] = useState<number[]>(() =>
    BOT_NAMES.slice(0, botCount).map(() => 400 + Math.floor(Math.random() * 600))
  );

  // ── Refs ────────────────────────────────────────────────────────────────────
  const typingTimer          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tierRef              = useRef(getTier(1));
  const mpRoundRef           = useRef(1);            // always-fresh mpRound
  const livesRef             = useRef(3);            // always-fresh lives
  const canReviveRef         = useRef(true);
  const scoreRef             = useRef(0);            // always-fresh score
  const roundRef             = useRef(1);
  const afterInterstitialRef = useRef<"game-over" | "match-over">("game-over");

  // Keep refs in sync
  useEffect(() => { mpRoundRef.current   = mpRound;   }, [mpRound]);
  useEffect(() => { livesRef.current     = lives;     }, [lives]);
  useEffect(() => { canReviveRef.current = canRevive; }, [canRevive]);
  useEffect(() => { scoreRef.current     = score;     }, [score]);
  useEffect(() => { roundRef.current     = round;     }, [round]);

  const clearTyping = () => {
    if (typingTimer.current) { clearTimeout(typingTimer.current); typingTimer.current = null; }
  };

  // ── Page Visibility — pause when app goes to background ────────────────────
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        // Only pause if actively playing
        if (["TYPING", "GUESSING"].includes(gameState) && !paused) {
          setPaused(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [gameState, paused]);

  // ── Bot scores — tick upward during play ────────────────────────────────────
  useEffect(() => {
    if (!isMultiplayer || paused) return;
    if (["GAME_OVER", "MATCH_OVER", "INTERSTITIAL"].includes(gameState)) return;
    const t = setInterval(() => {
      setBotScores((prev) => prev.map((s) => s + Math.floor(Math.random() * 95 + 30)));
    }, 2400);
    return () => clearInterval(t);
  }, [isMultiplayer, gameState, paused]);

  // ── beginRound ───────────────────────────────────────────────────────────────
  const beginRound = useCallback((r: number) => {
    const tier = getTier(r);
    tierRef.current = tier;
    setEntry(pickWord(tier.pool));
    setRevealed(0);
    setGuess("");
    setFeedback(null);
    setShowHint(true);
    setCountdown(3);
    setGameState("COUNTDOWN");
  }, []);

  // ── nextRound ────────────────────────────────────────────────────────────────
  const nextRound = useCallback(() => {
    if (isMultiplayer) {
      const next = mpRoundRef.current + 1;
      mpRoundRef.current = next;
      setMpRound(next);
      if (next > MP_TOTAL) {
        afterInterstitialRef.current = "match-over";
        setGameState("INTERSTITIAL");
      } else {
        setRound((r) => { const nr = r + 1; beginRound(nr); return nr; });
      }
    } else {
      setRound((r) => { const nr = r + 1; beginRound(nr); return nr; });
    }
  }, [isMultiplayer, beginRound]);

  // ── doEndGame (solo) ─────────────────────────────────────────────────────────
  const doEndGame = useCallback(() => {
    setGameState("GAME_OVER");
    setScores((prev) => ({
      ...prev,
      highScore:    scoreRef.current > prev.highScore ? scoreRef.current : prev.highScore,
      totalPoints:  prev.totalPoints + scoreRef.current,
      gamesPlayed:  prev.gamesPlayed + 1,
      roundRecord:  Math.max(prev.roundRecord, roundRef.current),
    }));
  }, [setScores]);

  // ── handleLifeLoss ───────────────────────────────────────────────────────────
  const handleLifeLoss = useCallback((kind: "wrong" | "slow") => {
    if (kind === "wrong") {
      setFeedback({ kind: "wrong" });
      setGameState("FEEDBACK");
    }
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);

    // Sudden death in MP (round 8+): one mistake = eliminated
    const isSuddenDeath = isMultiplayer && mpRoundRef.current >= 8;
    const effectiveLives = isSuddenDeath ? 0 : newLives;

    setTimeout(() => {
      if (effectiveLives <= 0) {
        if (canReviveRef.current) {
          setGameState("AD_REVIVE");
        } else if (isMultiplayer) {
          setGameState("MATCH_OVER");
        } else {
          doEndGame();
        }
      } else {
        nextRound();
      }
    }, 1400);
  }, [isMultiplayer, nextRound, doEndGame]);

  // ── Countdown ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== "COUNTDOWN" || paused) return;
    if (countdown <= 0) { setGameState("TYPING"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 850);
    return () => clearTimeout(t);
  }, [gameState, countdown, paused]);

  // ── Typing (letter reveal) ───────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== "TYPING" || paused) return;
    clearTyping();
    if (revealed >= entry.word.length) {
      // Word fully revealed = too slow
      setFeedback({ kind: "slow" });
      setGameState("FEEDBACK");
      setTimeout(() => handleLifeLoss("slow"), 1500);
      return;
    }
    // Sudden death: 30% faster
    const speed = (isMultiplayer && mpRoundRef.current >= 8)
      ? Math.floor(tierRef.current.speed * 0.68)
      : tierRef.current.speed;
    typingTimer.current = setTimeout(() => setRevealed((r) => r + 1), speed);
    return clearTyping;
  }, [gameState, revealed, entry.word, paused, handleLifeLoss, isMultiplayer]);

  // ── STOP ─────────────────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (gameState !== "TYPING" || revealed >= entry.word.length) return;
    clearTyping();
    setShowHint(false);
    setGameState("GUESSING");
  }, [gameState, revealed, entry.word]);

  // ── Guessing keyboard ────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== "GUESSING" || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Backspace") {
        setGuess((g) => g.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        setGuess((g) => {
          const next = g + e.key.toUpperCase();
          const remaining = entry.word.length - revealed;
          if (next.length === remaining) {
            const target = entry.word.slice(revealed);
            if (next === target) {
              const pts    = calcPoints(revealed, entry.word.length, tierRef.current.mult);
              const ratio  = revealed / entry.word.length;
              const praise = getPraise(ratio);
              setFeedback({ kind: "correct", points: pts, praise });
              setScore((s) => { scoreRef.current = s + pts; return s + pts; });
              setGameState("FEEDBACK");
              setTimeout(() => nextRound(), 1400);
            } else {
              handleLifeLoss("wrong");
            }
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, entry.word, revealed, paused, handleLifeLoss, nextRound]);

  // ── Spacebar = STOP ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== "TYPING" || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); handleStop(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameState, paused, handleStop]);

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => { beginRound(1); }, []);

  const restartGame = () => {
    setScore(0); scoreRef.current = 0;
    setLives(3); livesRef.current = 3;
    setCanRevive(true); canReviveRef.current = true;
    setMpRound(1); mpRoundRef.current = 1;
    setRound(1); roundRef.current = 1;
    setBotScores(BOT_NAMES.slice(0, botCount).map(() => 400 + Math.floor(Math.random() * 600)));
    beginRound(1);
  };

  // ── Derived ───────────────────────────────────────────────────────────────────
  const tier          = getTier(round);
  const remaining     = entry.word.length - revealed;
  const word          = entry.word;
  const isSuddenDeath = isMultiplayer && mpRound >= 8;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="flex-1 flex flex-col w-full">

        {/* ── HUD ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/30 backdrop-blur-md">
          {/* Lives */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Heart key={i} className={`h-5 w-5 transition-all duration-300 ${
                i < lives
                  ? "fill-red-500 text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.7)]"
                  : "text-white/10 fill-white/5"
              }`} />
            ))}
          </div>

          {/* Score */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={score}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-xl font-mono font-bold tabular-nums"
            >
              {score.toLocaleString()}
            </motion.div>
          </AnimatePresence>

          {/* Round / tier */}
          <div className="text-right flex flex-col items-end gap-0.5">
            {isMultiplayer ? (
              <>
                <div className="text-xs text-muted-foreground font-mono">
                  Round {mpRound}/{MP_TOTAL}
                </div>
                {isSuddenDeath ? (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded">
                    <Zap className="h-2.5 w-2.5 fill-current" /> SUDDEN DEATH
                  </div>
                ) : (
                  <div className="w-16 h-1 bg-white/8 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${(mpRound / MP_TOTAL) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-xs text-muted-foreground font-mono">Round {round}</div>
                <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_BG[tier.tier]} ${TIER_COLORS[tier.tier]}`}>
                  {tier.tier}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Game area ────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 relative">

          {/* Multiplayer sidebar */}
          {isMultiplayer && (
            <div className="absolute left-3 top-3 flex flex-col gap-2">
              {botScores.map((s, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-2 bg-black/40 border border-white/8 rounded-xl px-2.5 py-2 backdrop-blur-sm"
                >
                  <div className={`w-7 h-7 rounded-full ${BOT_COLORS[i]} flex items-center justify-center text-[10px] font-black text-white`}>
                    {BOT_NAMES[i].slice(0, 1)}
                  </div>
                  <div>
                    <div className="text-[9px] text-muted-foreground leading-none">{BOT_NAMES[i]}</div>
                    <motion.div
                      key={s}
                      initial={{ color: "#22d3ee" }}
                      animate={{ color: "#ffffff" }}
                      transition={{ duration: 0.7 }}
                      className="text-xs font-mono font-bold leading-none mt-0.5 tabular-nums"
                    >
                      {s.toLocaleString()}
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* Countdown */}
            {gameState === "COUNTDOWN" && (
              <motion.div
                key="countdown"
                initial={{ scale: 0.35, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.7, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-9xl font-black font-display select-none ${
                  countdown === 0 ? "text-emerald-400" : "text-white"
                }`}
                style={countdown === 0 ? { textShadow: "0 0 40px rgba(52,211,153,0.7)" } : {}}
              >
                {countdown > 0 ? countdown : "GO!"}
              </motion.div>
            )}

            {/* Play view */}
            {(gameState === "TYPING" || gameState === "GUESSING" || gameState === "FEEDBACK") && word.length > 0 && (
              <motion.div
                key="play"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-8 w-full max-w-2xl"
              >
                {/* Hint */}
                <div className="h-7 flex items-center">
                  <AnimatePresence>
                    {showHint && gameState === "TYPING" && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                        className="text-xs font-mono text-muted-foreground/60 bg-white/4 border border-white/8 px-3 py-1 rounded-full tracking-wide"
                      >
                        {entry.hint}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Word tiles */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  {word.split("").map((char, idx) => {
                    const isRevealed  = idx < revealed;
                    const guessIdx    = idx - revealed;
                    const isGuessed   = !isRevealed && guessIdx >= 0 && guessIdx < guess.length;
                    const isNext      = !isRevealed && guessIdx === guess.length && gameState === "GUESSING";
                    const guessedChar = isGuessed ? guess[guessIdx] : "";

                    let tile    = "border-white/10 bg-white/3 text-transparent";
                    let display = "";

                    if (isRevealed) {
                      tile    = "border-cyan-400/50 bg-cyan-400/8 text-cyan-300";
                      display = char;
                    } else if (isGuessed) {
                      if (gameState === "FEEDBACK") {
                        tile = feedback?.kind === "correct"
                          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300"
                          : "border-red-400/60 bg-red-400/10 text-red-300";
                      } else {
                        tile = "border-violet-400/50 bg-violet-400/8 text-violet-200";
                      }
                      display = guessedChar;
                    } else if (isNext) {
                      tile = "border-violet-400 border-2 bg-violet-400/5 animate-pulse text-transparent";
                    } else if (gameState === "FEEDBACK" && feedback?.kind === "slow") {
                      tile    = "border-yellow-400/30 bg-yellow-400/5 text-yellow-400/50";
                      display = char;
                    }

                    return (
                      <motion.div
                        key={idx}
                        initial={isRevealed && idx === revealed - 1 ? { scale: 0.5, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.09, ease: "easeOut" }}
                        className={`flex items-center justify-center border-2 rounded-xl font-mono font-bold transition-colors duration-100 ${tile}`}
                        style={{ width: "3rem", height: "3.75rem", fontSize: "1.6rem" }}
                      >
                        {display}
                      </motion.div>
                    );
                  })}
                </div>

                {/* STOP */}
                {gameState === "TYPING" && (
                  <motion.button
                    whileTap={{ scale: 0.86 }}
                    onClick={handleStop}
                    className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-2xl font-display border-4 border-red-400/50 shadow-[0_0_36px_rgba(220,38,38,0.45)] pulse-ring transition-colors select-none"
                    data-testid="button-stop"
                  >
                    STOP
                  </motion.button>
                )}

                {/* Guessing prompt */}
                {gameState === "GUESSING" && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground font-mono">
                      {remaining} letter{remaining !== 1 ? "s" : ""} left — start typing
                    </p>
                    {guess.length > 0 && (
                      <button
                        onClick={() => setGuess((g) => g.slice(0, -1))}
                        className="mt-2 text-xs text-muted-foreground/40 hover:text-muted-foreground font-mono underline transition-colors"
                      >
                        backspace
                      </button>
                    )}
                  </div>
                )}

                {/* Feedback */}
                {gameState === "FEEDBACK" && feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.65, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 20 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    {feedback.kind === "correct" && feedback.praise && (
                      <div className="text-base font-bold text-emerald-400 tracking-widest font-display">
                        {feedback.praise}
                      </div>
                    )}
                    <div className={`text-5xl font-black font-display ${
                      feedback.kind === "correct" ? "text-white"
                      : feedback.kind === "slow"   ? "text-yellow-400"
                      : "text-red-400"
                    }`}
                      style={feedback.kind === "correct" ? { textShadow: "0 0 30px rgba(255,255,255,0.3)" } : {}}
                    >
                      {feedback.kind === "correct"
                        ? `+${feedback.points?.toLocaleString()}`
                        : feedback.kind === "slow" ? "TOO SLOW"
                        : "WRONG"}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Game Over (solo) */}
            {gameState === "GAME_OVER" && (
              <motion.div
                key="gameover"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 w-full max-w-xs"
              >
                <div className="text-center">
                  <h2 className="text-5xl font-black font-display text-red-400 mb-1"
                    style={{ textShadow: "0 0 30px rgba(248,113,113,0.5)" }}>
                    GAME OVER
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {round - 1} round{round - 1 !== 1 ? "s" : ""} survived
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="bg-card border border-card-border rounded-2xl p-4 text-center"
                    style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.07), transparent)" }}>
                    <div className="text-xs text-muted-foreground font-mono mb-1">Score</div>
                    <div className="text-2xl font-bold text-cyan-400 font-mono tabular-nums">{score.toLocaleString()}</div>
                  </div>
                  <div className="bg-card border border-card-border rounded-2xl p-4 text-center">
                    <div className="text-xs text-muted-foreground font-mono mb-1">Best</div>
                    <div className="text-2xl font-bold font-mono tabular-nums">{scores.highScore.toLocaleString()}</div>
                  </div>
                </div>
                {score > 0 && score >= scores.highScore && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="text-xs font-mono text-yellow-400">
                    ✦ New personal best!
                  </motion.div>
                )}
                <div className="flex flex-col w-full gap-2">
                  <Button
                    className="w-full h-12 font-bold bg-cyan-400 text-black hover:bg-cyan-300 rounded-2xl"
                    onClick={restartGame}
                    data-testid="button-play-again"
                  >
                    <Play className="mr-2 h-4 w-4 fill-current" /> Play Again
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-12 font-bold border-white/12 rounded-2xl"
                    onClick={() => setLocation("/")}
                    data-testid="button-main-menu"
                  >
                    <Home className="mr-2 h-4 w-4" /> Home
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Match Over (multiplayer) */}
            {gameState === "MATCH_OVER" && (
              <MatchOverScreen
                playerScore={score}
                botScores={botScores}
                botCount={botCount}
                onRematch={restartGame}
                onHome={() => setLocation("/")}
              />
            )}

            {/* Ad Revive */}
            {gameState === "AD_REVIVE" && (
              <AdReviveModal
                onDecline={() => {
                  if (isMultiplayer) {
                    setGameState("MATCH_OVER");
                  } else {
                    doEndGame();
                  }
                }}
                onRevive={() => {
                  const newLives = 1;
                  livesRef.current = newLives;
                  setLives(newLives);
                  canReviveRef.current = false;
                  setCanRevive(false);
                  nextRound();
                }}
              />
            )}

            {/* Interstitial ad */}
            {gameState === "INTERSTITIAL" && (
              <InterstitialAd
                onDone={() => {
                  if (afterInterstitialRef.current === "match-over") {
                    setGameState("MATCH_OVER");
                  } else {
                    doEndGame();
                  }
                }}
              />
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Pause overlay */}
      <AnimatePresence>
        {paused && (gameState === "TYPING" || gameState === "GUESSING") && (
          <PauseOverlay onResume={() => setPaused(false)} />
        )}
      </AnimatePresence>
    </Layout>
  );
}

// ── Pause Overlay ─────────────────────────────────────────────────────────────
function PauseOverlay({ onResume }: { onResume: () => void }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (count === null) return;
    if (count <= 0) { onResume(); return; }
    const t = setTimeout(() => setCount((c) => (c ?? 1) - 1), 700);
    return () => clearTimeout(t);
  }, [count, onResume]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
      style={{ background: "rgba(4,6,18,0.88)", backdropFilter: "blur(12px)" }}
    >
      {count !== null ? (
        <motion.div
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          className="text-9xl font-black font-display text-cyan-400 select-none"
          style={{ textShadow: "0 0 60px rgba(34,211,238,0.6)" }}
        >
          {count === 0 ? "GO!" : count}
        </motion.div>
      ) : (
        <>
          <div className="text-center">
            <div className="text-5xl font-black font-display text-white mb-2">PAUSED</div>
            <p className="text-sm text-muted-foreground font-mono">Game saved — take your time</p>
          </div>
          <Button
            onClick={() => setCount(3)}
            className="h-14 px-10 bg-cyan-400 text-black font-black text-lg hover:bg-cyan-300 rounded-2xl shadow-[0_0_30px_rgba(34,211,238,0.3)]"
          >
            ▶ Resume
          </Button>
        </>
      )}
    </motion.div>
  );
}

// ── Interstitial Ad ───────────────────────────────────────────────────────────
// Shows a REAL full-screen Google interstitial ad (ca-app-pub-1445407957198527/6095352248)
// Falls back to a 5-second loading screen if AdMob isn't available (e.g. in browser preview)
function InterstitialAd({ onDone }: { onDone: () => void }) {
  const [fallback, setFallback] = useState(false);
  const [t, setT]               = useState(5);
  const [canSkip, setCanSkip]   = useState(false);
  const called                  = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function showInterstitial() {
      try {
        // Prepare the ad (loads it into memory)
        await AdMob.prepareInterstitial({
          adId: INTERSTITIAL_AD_ID,
          isTesting: false,
        });

        // Listen for when the ad is dismissed — then call onDone
        await AdMob.addListener("interstitialAdLoaded", async () => {
          await AdMob.showInterstitial();
        });

        await AdMob.addListener("interstitialAdFailedToLoad", () => {
          // Ad failed — use fallback UI
          setFallback(true);
        });

        await AdMob.addListener("interstitialAdDismissed", () => {
          onDone();
        });

      } catch {
        // Not on a device (browser preview) — show fallback
        setFallback(true);
      }
    }

    showInterstitial();
  }, [onDone]);

  // Fallback countdown UI (shown in browser or if ad fails)
  useEffect(() => {
    if (!fallback) return;
    if (t <= 0) { setCanSkip(true); return; }
    const timer = setTimeout(() => setT((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [fallback, t]);

  if (!fallback) {
    // Real ad is loading/showing — show a brief loading state
    return (
      <motion.div
        key="interstitial-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4"
        style={{ background: "rgba(3,5,14,0.97)" }}
      >
        <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Loading ad...</div>
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />
      </motion.div>
    );
  }

  // Fallback UI
  return (
    <motion.div
      key="interstitial"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 p-6"
      style={{ background: "rgba(3,5,14,0.97)" }}
    >
      <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Advertisement</div>
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden relative flex flex-col items-center justify-center gap-4 py-10 px-6"
        style={{
          background: "linear-gradient(145deg, #0d1b35 0%, #121226 60%, #0d1b35 100%)",
          border: "1px solid rgba(34,211,238,0.18)",
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white"
          style={{ background: "linear-gradient(135deg, #22d3ee 0%, #7c3aed 100%)" }}>LW</div>
        <div className="text-center">
          <div className="text-2xl font-black font-display text-white">Last Word</div>
          <div className="text-sm text-white/50 mt-1">The ultimate word game</div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
          <motion.div className="h-full rounded-full" initial={{ width: "0%" }} animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
            style={{ background: "linear-gradient(90deg, #22d3ee, #7c3aed)" }} />
        </div>
      </div>
      {canSkip ? (
        <Button onClick={onDone}
          className="h-11 px-8 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-2xl font-bold">
          <X className="mr-2 h-4 w-4" /> Close Ad
        </Button>
      ) : (
        <div className="text-xs font-mono text-white/30 tabular-nums">Closes in {t}s</div>
      )}
    </motion.div>
  );
}

// ── Match Over Screen ─────────────────────────────────────────────────────────
function MatchOverScreen({
  playerScore, botScores, botCount, onRematch, onHome,
}: {
  playerScore: number; botScores: number[]; botCount: number;
  onRematch: () => void; onHome: () => void;
}) {
  const players = [
    { name: "You", score: playerScore, isPlayer: true, color: "bg-cyan-500" },
    ...botScores.slice(0, botCount).map((s, i) => ({
      name: BOT_NAMES[i], score: s, isPlayer: false, color: BOT_COLORS[i],
    })),
  ].sort((a, b) => b.score - a.score);

  const playerRank = players.findIndex((p) => p.isPlayer) + 1;
  const medals = ["🏆", "🥈", "🥉", "4"];

  const rankMessages: Record<number, string> = {
    1: "You won the match!",
    2: "So close — almost there!",
    3: "Keep pushing — you'll get 'em.",
    4: "Tough match, come back swinging.",
  };

  return (
    <motion.div
      key="matchover"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 w-full max-w-sm"
    >
      <div className="text-center">
        <h2
          className="text-4xl font-black font-display"
          style={{
            color: playerRank === 1 ? "#fbbf24" : "#ffffff",
            textShadow: playerRank === 1 ? "0 0 30px rgba(251,191,36,0.5)" : "none",
          }}
        >
          MATCH OVER
        </h2>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          {rankMessages[playerRank] ?? "Good game!"}
        </p>
      </div>

      {/* Standings */}
      <div className="w-full flex flex-col gap-2">
        {players.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
              p.isPlayer
                ? "bg-cyan-400/8 border-cyan-400/25"
                : "bg-white/3 border-white/8"
            }`}
          >
            <span className="text-xl w-6 text-center">{medals[i] ?? i + 1}</span>
            <div className={`w-7 h-7 rounded-full ${p.color} flex items-center justify-center text-[10px] font-black text-white`}>
              {p.name.slice(0, 1)}
            </div>
            <span className={`flex-1 font-bold text-sm ${p.isPlayer ? "text-cyan-400" : "text-white/80"}`}>
              {p.isPlayer ? "You" : p.name}
            </span>
            <span className="font-mono font-bold text-sm tabular-nums">
              {p.score.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col w-full gap-2 pt-1">
        <Button
          className="w-full h-12 bg-cyan-400 text-black font-bold hover:bg-cyan-300 rounded-2xl"
          onClick={onRematch}
        >
          <Play className="mr-2 h-4 w-4 fill-current" /> Rematch
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 border-white/12 rounded-2xl"
          onClick={onHome}
        >
          <Home className="mr-2 h-4 w-4" /> Home
        </Button>
      </div>
    </motion.div>
  );
}

// ── Ad Revive Modal ───────────────────────────────────────────────────────────
// Shows a REAL Google rewarded ad (ca-app-pub-1445407957198527/6949268913)
// Player MUST watch it fully to earn the revive — onRevive only fires on reward
// Falls back to a 5-second timer UI if AdMob isn't available
function AdReviveModal({ onDecline, onRevive }: { onDecline: () => void; onRevive: () => void }) {
  const [fallback, setFallback] = useState(false);
  const [t, setT]               = useState(5);
  const called                  = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function showRewarded() {
      try {
        // Prepare the rewarded ad
        await AdMob.prepareRewardVideoAd({
          adId: REWARDED_AD_ID,
          isTesting: false,
        });

        // Reward earned = player watched the full ad → grant revive
        await AdMob.addListener(RewardAdPluginEvents.Rewarded, (_reward: AdMobRewardItem) => {
          onRevive();
        });

        // Ad dismissed without earning reward (skipped early) → decline
        await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          // Only decline if reward wasn't already granted
          // (Dismissed fires after Rewarded, so onRevive may have already been called)
        });

        await AdMob.addListener("rewardVideoAdFailedToLoad", () => {
          setFallback(true);
        });

        await AdMob.showRewardVideoAd();

      } catch {
        // Not on device (browser preview) — show fallback UI
        setFallback(true);
      }
    }

    showRewarded();
  }, [onRevive]);

  // Fallback countdown
  useEffect(() => {
    if (!fallback) return;
    if (t <= 0) return;
    const timer = setTimeout(() => setT((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [fallback, t]);

  if (!fallback) {
    // Real ad is loading — show spinner
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4"
        style={{ background: "rgba(3,5,14,0.88)", backdropFilter: "blur(10px)" }}
      >
        <div className="text-sm font-mono text-white/40">Loading ad...</div>
        <motion.div
          className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />
        <Button variant="outline" className="mt-4 h-10 px-6 border-white/12 rounded-2xl text-sm"
          onClick={onDecline}>
          Cancel
        </Button>
      </motion.div>
    );
  }

  // Fallback UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(3,5,14,0.88)", backdropFilter: "blur(10px)" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-center">
          <h3 className="text-2xl font-black font-display mb-1">Continue?</h3>
          <p className="text-sm text-muted-foreground">Watch a short ad to get 1 life back.</p>
        </div>
        <div className="w-full aspect-video rounded-2xl relative overflow-hidden flex flex-col items-center justify-center gap-3"
          style={{ background: "linear-gradient(145deg, #0d1b35, #121226, #0d1b35)", border: "1px solid rgba(34,211,238,0.15)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-lg"
            style={{ background: "linear-gradient(135deg, #22d3ee, #7c3aed)" }}>LW</div>
          <p className="text-white/60 text-sm font-mono">Sponsored</p>
          {t > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/70 px-2.5 py-1 rounded-lg text-xs font-mono border border-white/10 tabular-nums">{t}s</div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <motion.div className="h-full" initial={{ width: "0%" }} animate={{ width: "100%" }}
              transition={{ duration: 5, ease: "linear" }}
              style={{ background: "linear-gradient(90deg, #22d3ee, #7c3aed)" }} />
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-11 border-white/12 rounded-2xl"
            onClick={onDecline} data-testid="button-decline-revive">
            <X className="mr-2 h-4 w-4" /> No thanks
          </Button>
          <Button className="flex-1 h-11 bg-cyan-400 text-black font-bold hover:bg-cyan-300 rounded-2xl"
            disabled={t > 0} onClick={onRevive} data-testid="button-accept-revive">
            {t > 0 ? `${t}s...` : "Revive!"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
