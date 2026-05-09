import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Play, Home, X, Zap, Share2, Crown, Wifi } from "lucide-react";
import { useGameData } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";
import { AdMob, BannerAdOptions, BannerAdPosition, BannerAdSize, RewardAdPluginEvents, AdMobRewardItem } from "@capacitor-community/admob";
import { SFX } from "@/lib/sounds";
import { Vibrate } from "@/lib/haptics";
import { tryUnlock } from "@/lib/achievements";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
// MP_TOTAL is read from URL — 5 or 10 rounds (set in lobby)

// ── Bot config ────────────────────────────────────────────────────────────────
// ── Player accent colours (slot-based, no bots) ───────────────────────────────
const SLOT_COLORS  = ["#22d3ee", "#a78bfa", "#fb923c", "#f472b6"];
const SLOT_BG      = ["rgba(34,211,238,0.12)", "rgba(167,139,250,0.12)", "rgba(251,146,60,0.12)", "rgba(244,114,182,0.12)"];
const SLOT_BORDER  = ["rgba(34,211,238,0.4)",  "rgba(167,139,250,0.4)",  "rgba(251,146,60,0.4)",  "rgba(244,114,182,0.4)"];

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
  const isMultiplayer  = search.includes("mode=multiplayer");
  const matchId        = new URLSearchParams(search).get("matchId") ?? "";
  const MP_TOTAL       = search.includes("rounds=10") ? 10 : 5;
  const { user, scores, setScores } = useGameData();

  // ── Real multiplayer players (from Supabase) ────────────────────────────────
  type RealPlayer = { user_id: string; username: string; pfp?: string; score: number; slot: number; isYou: boolean };
  const [mpPlayers, setMpPlayers]     = useState<RealPlayer[]>([]);
  const [activeSlot, setActiveSlot]   = useState(0);
  const [turnPhase, setTurnPhase]     = useState<"camera-in"|"playing"|"opponent-playing">("camera-in");
  const activeSlotRef                 = useRef(0);
  const mpChannel                     = useRef<RealtimeChannel | null>(null);
  const mySlot                        = mpPlayers.find((p) => p.isYou)?.slot ?? 0;

  // ── Core state ──────────────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState>("COUNTDOWN");
  const [countdown, setCountdown] = useState(3);
  const [round, setRound]         = useState(1);
  const [score, setScore]         = useState(0);
  const [lives, setLives]         = useState(3);
  const [canRevive, setCanRevive] = useState(true);
  const [mpRound, setMpRound]     = useState(1);
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

  // ── Supabase realtime sync ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isMultiplayer || !matchId) return;

    // Load players from match
    supabase.from("match_players").select("user_id,username,pfp,score,slot")
      .eq("match_id", matchId).order("slot")
      .then(({ data }) => {
        if (!data) return;
        setMpPlayers(data.map((p) => ({ ...p, pfp: p.pfp ?? undefined, isYou: p.user_id === user?.id })));
      });

    // Subscribe to match_state changes (active_slot, word, phase, round)
    mpChannel.current = supabase.channel(`match_${matchId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_state",
        filter: `match_id=eq.${matchId}` }, (payload) => {
          const s = payload.new as { active_slot: number; current_round: number; word: string; hint: string; phase: string };
          setActiveSlot(s.active_slot);
          activeSlotRef.current = s.active_slot;
          setMpRound(s.current_round);
          setEntry({ word: s.word, hint: s.hint });
          setTurnPhase(s.phase as "camera-in"|"playing"|"opponent-playing");
          if (s.phase === "playing" && s.active_slot === mySlot) {
            setRevealed(0); setGuess(""); setGameState("COUNTDOWN"); setCountdown(3);
          }
      })
      // Subscribe to score updates
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "match_players",
        filter: `match_id=eq.${matchId}` }, (payload) => {
          const p = payload.new as { user_id: string; score: number };
          setMpPlayers((prev) => prev.map((pl) => pl.user_id === p.user_id ? { ...pl, score: p.score } : pl));
      })
      .subscribe();

    return () => { mpChannel.current?.unsubscribe(); };
  }, [isMultiplayer, matchId, user?.id]);

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
      // No bot scores — real players handle their own scoring
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

  // ── nextRound — advances turn in Supabase so all clients sync ────────────────
  const nextRound = useCallback(async () => {
    if (isMultiplayer && matchId) {
      // Fetch current state
      const { data: st } = await supabase.from("match_state").select("*").eq("match_id", matchId).single();
      if (!st) return;

      const { data: players } = await supabase.from("match_players").select("slot").eq("match_id", matchId);
      const totalSlots = players?.length ?? 2;
      const nextSlot   = (st.active_slot + 1) % totalSlots;
      const isNewRound = nextSlot === 0;
      const nextRoundN = isNewRound ? st.current_round + 1 : st.current_round;

      if (nextRoundN > MP_TOTAL) {
        // Match over — update match status
        await supabase.from("matches").update({ status: "finished" }).eq("id", matchId);
        afterInterstitialRef.current = "match-over";
        setGameState("INTERSTITIAL");
        return;
      }

      // Pick next word
      const entry = pickWord(nextRoundN <= 10 ? "easy" : nextRoundN <= 20 ? "medium" : nextRoundN <= 30 ? "hard" : "insane");

      // Update match_state — all clients receive this via realtime
      await supabase.from("match_state").update({
        active_slot:    nextSlot,
        current_round:  nextRoundN,
        word:           entry.word,
        hint:           entry.hint,
        phase:          "camera-in",
        updated_at:     new Date().toISOString(),
      }).eq("match_id", matchId);

    } else {
      setRound((r) => { const nr = r + 1; beginRound(nr); return nr; });
    }
  }, [isMultiplayer, matchId, beginRound, MP_TOTAL]);

  // ── doEndGame (solo) ─────────────────────────────────────────────────────────
  const doEndGame = useCallback(() => {
    SFX.gameOver();
    Vibrate.error();
    setGameState("GAME_OVER");
    setScores((prev) => {
      const isNewBest = scoreRef.current > prev.highScore;
      if (isNewBest) SFX.newBest();
      const newGames = prev.gamesPlayed + 1;
      // Achievements
      tryUnlock("first_blood");
      if (newGames >= 10) tryUnlock("games_10");
      if (scoreRef.current >= 5000)  tryUnlock("score_5k");
      if (scoreRef.current >= 20000) tryUnlock("score_20k");
      if (roundRef.current >= 5)  tryUnlock("speed_5");
      if (roundRef.current >= 15) tryUnlock("speed_15");
      if (roundRef.current >= 30) tryUnlock("speed_30");
      if (roundRef.current >= 31) tryUnlock("insane_entry");
      return {
        ...prev,
        highScore:   isNewBest ? scoreRef.current : prev.highScore,
        totalPoints: prev.totalPoints + scoreRef.current,
        gamesPlayed: newGames,
        roundRecord: Math.max(prev.roundRecord, roundRef.current),
      };
    });
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
    if (gameState !== "COUNTDOWN" || paused) return;
    if (countdown <= 0) { SFX.go(); setGameState("TYPING"); return; }
    SFX.countdown();
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
    typingTimer.current = setTimeout(() => setRevealed((r) => { SFX.tick(); return r + 1; }), speed);
    return clearTyping;
  }, [gameState, revealed, entry.word, paused, handleLifeLoss, isMultiplayer]);

  // ── STOP ─────────────────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    if (gameState !== "TYPING" || revealed >= entry.word.length) return;
    clearTyping();
    SFX.stop();
    Vibrate.medium();
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
              SFX.correct();
              Vibrate.success();
              // Achievements
              tryUnlock("first_blood");
              if (ratio === 0) tryUnlock("psychic");
              setFeedback({ kind: "correct", points: pts, praise });
              setScore((s) => { scoreRef.current = s + pts; return s + pts; });
              setGameState("FEEDBACK");
              setTimeout(() => nextRound(), 1400);
            } else {
              SFX.wrong();
              Vibrate.error();
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
  useEffect(() => {
    if (isMultiplayer) {
      setTurnPhase("camera-in");
      setTimeout(() => { setTurnPhase("playing"); beginRound(1); }, 1800);
    } else {
      beginRound(1);
    }
  }, []);

  const restartGame = () => {
    setScore(0); scoreRef.current = 0;
    setLives(3); livesRef.current = 3;
    setCanRevive(true); canReviveRef.current = true;
    setMpRound(1); mpRoundRef.current = 1;
    setRound(1); roundRef.current = 1;
    setActiveSlot(0); activeSlotRef.current = 0;
    setMpPlayers([]);
    if (isMultiplayer) {
      setTurnPhase("camera-in");
      setTimeout(() => { setTurnPhase("playing"); beginRound(1); }, 1800);
    } else {
      beginRound(1);
    }
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

          {/* ── Multiplayer turn-based UI ──────────────────────────────── */}
          {isMultiplayer && (
            <AnimatePresence mode="wait">

              {/* Camera-in: whose turn is it */}
              {turnPhase === "camera-in" && (() => {
                const activeP = mpPlayers.find((p) => p.slot === activeSlot);
                const isMyTurn = activeSlot === mySlot;
                const color = SLOT_COLORS[activeSlot] ?? "#22d3ee";
                const bg    = SLOT_BG[activeSlot]    ?? "rgba(34,211,238,0.12)";
                return (
                  <motion.div key={`cam-${activeSlot}-${mpRound}`}
                    initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-8"
                    style={{ background: "rgba(3,5,14,0.95)", backdropFilter: "blur(14px)" }}>

                    {/* Big avatar */}
                    <motion.div initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12, type: "spring", stiffness: 300 }}
                      className="flex flex-col items-center gap-4">
                      <div className="relative w-28 h-28 rounded-3xl overflow-hidden flex items-center justify-center"
                        style={{ border: `3px solid ${color}`, background: bg, boxShadow: `0 0 40px ${color}55` }}>
                        {activeP?.pfp
                          ? <img src={activeP.pfp} className="w-full h-full object-cover" alt="" />
                          : <span className="text-5xl font-black" style={{ color }}>{(activeP?.username?.[0] ?? "?").toUpperCase()}</span>
                        }
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-black" style={{ fontFamily: "Orbitron, sans-serif", color }}>
                          {isMyTurn ? "YOUR TURN" : `${activeP?.username ?? "..."}'S TURN`}
                        </div>
                        <div className="text-sm text-muted-foreground font-mono mt-1">Round {mpRound} of {MP_TOTAL}</div>
                      </div>
                    </motion.div>

                    {/* All player scores strip */}
                    <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}
                      className="flex gap-3 flex-wrap justify-center px-4">
                      {mpPlayers.map((p) => {
                        const c = SLOT_COLORS[p.slot] ?? "#fff";
                        const active = p.slot === activeSlot;
                        return (
                          <div key={p.slot} className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl border transition-all"
                            style={{ borderColor: active ? `${c}60` : "rgba(255,255,255,0.1)", background: active ? `${c}12` : "rgba(255,255,255,0.03)" }}>
                            <div className="w-9 h-9 rounded-xl overflow-hidden border flex items-center justify-center"
                              style={{ borderColor: `${c}40`, background: `${c}15` }}>
                              {p.pfp ? <img src={p.pfp} className="w-full h-full object-cover" alt="" /> : <span className="text-sm font-black" style={{ color: c }}>{p.username[0].toUpperCase()}</span>}
                            </div>
                            <span className="text-[10px] font-mono truncate max-w-[52px]" style={{ color: p.isYou ? c : "rgba(255,255,255,0.5)" }}>{p.isYou ? "You" : p.username}</span>
                            <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: c }}>{p.score.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </motion.div>
                  </motion.div>
                );
              })()}

              {/* Opponent playing — waiting screen */}
              {turnPhase === "opponent-playing" && (() => {
                const activeP = mpPlayers.find((p) => p.slot === activeSlot);
                const color   = SLOT_COLORS[activeSlot] ?? "#a78bfa";
                return (
                  <motion.div key={`opp-${activeSlot}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6"
                    style={{ background: "rgba(3,5,14,0.88)", backdropFilter: "blur(10px)" }}>
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 flex items-center justify-center"
                      style={{ borderColor: color, background: `${color}20`, boxShadow: `0 0 24px ${color}44` }}>
                      {activeP?.pfp ? <img src={activeP.pfp} className="w-full h-full object-cover" alt="" /> : <span className="text-3xl font-black" style={{ color }}>{(activeP?.username?.[0] ?? "?").toUpperCase()}</span>}
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-xl" style={{ fontFamily: "Orbitron, sans-serif", color }}>{activeP?.username}</p>
                      <p className="text-sm text-muted-foreground font-mono mt-1">is playing...</p>
                    </div>
                    <div className="flex gap-2">
                      {[0,1,2].map((i) => (
                        <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: color }}
                          animate={{ scale: [1,1.6,1], opacity: [0.4,1,0.4] }}
                          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }} />
                      ))}
                    </div>
                    {/* Score strip at bottom */}
                    <div className="absolute bottom-6 flex gap-2 px-4 flex-wrap justify-center">
                      {mpPlayers.map((p) => {
                        const c = SLOT_COLORS[p.slot] ?? "#fff";
                        return (
                          <div key={p.slot} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-sm"
                            style={{ borderColor: p.slot === activeSlot ? `${c}50` : "rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.4)" }}>
                            <div className="w-6 h-6 rounded-lg overflow-hidden border flex items-center justify-center" style={{ borderColor: `${c}40` }}>
                              {p.pfp ? <img src={p.pfp} className="w-full h-full object-cover" alt="" /> : <span className="text-[9px] font-black" style={{ color: c }}>{p.username[0].toUpperCase()}</span>}
                            </div>
                            <span className="text-[10px] font-mono tabular-nums font-bold" style={{ color: p.isYou ? c : "rgba(255,255,255,0.7)" }}>{p.score.toLocaleString()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })()}

            </AnimatePresence>
          )}

          {/* Compact player strip while YOU are playing */}
          {isMultiplayer && turnPhase === "playing" && (
            <div className="absolute top-3 left-3 right-3 flex gap-2 z-10 flex-wrap">
              {mpPlayers.map((p) => {
                const c = SLOT_COLORS[p.slot] ?? "#fff";
                return (
                  <div key={p.slot} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border backdrop-blur-sm flex-shrink-0"
                    style={{ borderColor: p.isYou ? `${c}50` : "rgba(255,255,255,0.1)", background: p.isYou ? `${c}10` : "rgba(0,0,0,0.35)" }}>
                    <div className="w-6 h-6 rounded-lg overflow-hidden border flex items-center justify-center" style={{ borderColor: `${c}40` }}>
                      {p.pfp ? <img src={p.pfp} className="w-full h-full object-cover" alt="" /> : <span className="text-[9px] font-black" style={{ color: c }}>{p.username[0].toUpperCase()}</span>}
                    </div>
                    <div>
                      <div className="text-[9px] font-mono leading-none" style={{ color: p.isYou ? c : "rgba(255,255,255,0.4)" }}>{p.isYou ? "YOU" : p.username}</div>
                      <motion.div key={p.score} initial={{ color: c }} animate={{ color: "#ffffff" }} transition={{ duration: 0.6 }}
                        className="text-[10px] font-mono font-bold leading-none tabular-nums">{p.score.toLocaleString()}</motion.div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}


