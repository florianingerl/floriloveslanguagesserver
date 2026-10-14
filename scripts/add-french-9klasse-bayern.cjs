// Legt fuer das Franzoesisch-Quiz (subject "french") die Grammatikthemen der
// 9. Klasse Gymnasium Bayern (LehrplanPLUS F9) an.
//
// Alles, was in die Datenbank geschrieben wird, ist auf Franzoesisch. Jeder
// Themennname traegt das Praefix "9.Klasse Gymnasium Bayern - ".
//
// Jede Aufgabe hat ein zufaelliges Bild aus der Klipy-API. Die Beschreibung
// des Bildes (Klipy-Feld "title") bestimmt den Inhalt des Satzes.
//
// Der Lauf ist idempotent: Quiz/Thema werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit demselben Schluessel im Fach "french" gibt.
//
// Aufruf auf dem Server (dort ist die Datenbank erreichbar):
//   node scripts/add-french-9klasse-bayern.cjs --dry-run
//   node scripts/add-french-9klasse-bayern.cjs

const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");
const fs = require("fs");
const path = require("path");

const URL = process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const SUBJECT = "french";
const OWNER_EMAIL = "imelflorianingerl@gmail.com";
const PREFIX = "9.Klasse Gymnasium Bayern - ";

const INS_MC = "Choisis la bonne r\u00e9ponse.";
const INS_MATCH = "Associe les \u00e9l\u00e9ments qui vont ensemble.";

// Bilder aus der Klipy-API (hd.jpg). Der Name ist die Klipy-Beschreibung.
const IMG = {
  plageBeach: { desc: "Vacation Mode Activated on the Beach", url: "https://static.klipy.com/ii/935d7ab9d8c6202580a668421940ec81/da/3f/NouGcBSD.jpg" },
  bonnesVacances: { desc: "Bonnes Vacances", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/35/92/rgkDy74yZ4aT1I.jpg" },
  hammock: { desc: "Vacance Sieste: Relaxing in a Hammock", url: "https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/0a/80/Z5lNPEMgNO5BU3.jpg" },
  avion: { desc: "Airbus A330neo Takeoff", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/61/1e/R0tYXS6p.jpg" },
  avionSunset: { desc: "Airplane Flying Through Sunset Sky", url: "https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/83/57/3ckWnRNIVjFZ.jpg" },
  train: { desc: "Train", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/ce/6f/UdZJgdLVJPMsxzcphW.jpg" },
  trainSteam: { desc: "Powerful Steam Train Emitting Smoke", url: "https://static.klipy.com/ii/2711dd8a75a85be822d136ec94899b3f/33/33/BtQPABPpvSyrjSL.jpg" },
  eiffel: { desc: "Eiffel Tower Sparkling at Night in Paris", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/43/62/LcgBRzBO5wUTuCt.jpg" },
  parisBeret: { desc: "Devon Rex Cat in Beret Says Bonjour in Paris", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/2a/bf/aqRSxJVP.jpg" },
  soleil: { desc: "Summer in Spain Sunshine", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/45/25/KjdrKsW1t9BSM.jpg" },
  meteo: { desc: "Meteofrance Weather Forecast: Afternoon Storms", url: "https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/b6/e3/fbEGGv8TLWcKNg9f9.jpg" },
  wizardCatPizza: { desc: "Wizard Cat Eating Pizza", url: "https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/6d/ca/75tfE2gT.jpg" },
  pizzaCheese: { desc: "Delicious Pizza Cheese Pull", url: "https://static.klipy.com/ii/da290b156d64898341638f3c299e7478/ac/78/Ro1TsiTFks1l4U2R.jpg" },
  telephone: { desc: "Mr. Bean's Telephone Call", url: "https://static.klipy.com/ii/2711dd8a75a85be822d136ec94899b3f/4a/73/evru8lAg5dAejVu95o.jpg" },
  bateau: { desc: "Bateau a Voile dans les Vagues Dechainees", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/5d/4c/rTFwxZpcgCn8.jpg" },
  bateauSuez: { desc: "Bateau Ever Given bloque dans le canal de Suez", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/fc/10/1N2FrqsrcGIR.jpg" },
  fete: { desc: "Energetic Rave Party Night", url: "https://static.klipy.com/ii/4e7bea9f7a3371424e6c16ebc93252fe/76/ad/CE9NmvaYT4UMN5a.jpg" },
  feteParty: { desc: "Energetic Party Time", url: "https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/03/65/2QQxLyAObAQK2M.jpg" },
  argent: { desc: "Man Making It Rain with Money", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/af/bd/4CnKyfIxLM4zw.jpg" },
  devoirs: { desc: "Sleepy Kid Dozing Off During Homework", url: "https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/91/c4/0Hz03CVVkXhPc.jpg" },
  filmPopcorn: { desc: "Garfield Enjoying Popcorn & Laughing", url: "https://static.klipy.com/ii/da290b156d64898341638f3c299e7478/22/8d/5mdXgbhLhlgZdH5hz2.jpg" },
  cinemaNetflix: { desc: "Cinema Showcase Netflix House", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/05/21/wBB0YWKb85OHsXm.jpg" },
  camping: { desc: "Peaceful Lake Camping with Bonfire", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/04/d3/dGC1I6zt1Zx8W.jpg" },
  gateau: { desc: "Chocolate Cake Eating", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/60/65/6K1kCSC19fmNYT.jpg" },
  ordinateur: { desc: "Cute Cat Typing on Laptop", url: "https://static.klipy.com/ii/2711dd8a75a85be822d136ec94899b3f/41/42/odHLFxSlvP.jpg" },
  ordinateurLenovo: { desc: "Lenovo Lenovo Yoga Laptop", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/4c/0d/5cGaYgmjl6ct3k.jpg" },
  musique: { desc: "Monkey Listening to Music", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/25/03/mV6h7Pw2.jpg" },
  chien: { desc: "Golden Retriever Rollercoaster", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/4a/28/nA8qxhLANZdwvUfnOY.jpg" },
  chienShocked: { desc: "Dog's Shocked Reaction to Object", url: "https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/36/19/HtK7cAh2.jpg" },
  travail: { desc: "Cat Typing on Laptop in Blue Shirt", url: "https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/92/d8/pzg7BBNs.jpg" },
  jardin: { desc: "Jardin: Belles Fleurs Roses", url: "https://static.klipy.com/ii/c3a19a0b747a76e98651f2b9a3cca5ff/ab/2c/UvAzP38snGKI.jpg" },
  randonnee: { desc: "Mountain Walk Valley Walk", url: "https://static.klipy.com/ii/6b3a6ab13999af763b4db87b91ee67d0/3f/48/5UMGIl7BASEfJnBwv8EG.jpg" },
  ski: { desc: "Couple Skiing in Snowy Woods", url: "https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/05/27/2Tc6DQY5Qb33mxsvhM.jpg" },
  pluie: { desc: "Cute Dog in Yellow Raincoat in Rain", url: "https://static.klipy.com/ii/84b4c0b02782dda9051003f9e36484ec/d7/cf/l4qXs96uYaT1DfTn.jpg" },
  livre: { desc: "Big Book Huge Book", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/7a/7c/BZw79jCLwLwn3pvTxAUo.jpg" },
  ecolePenguin: { desc: "Pudgy Penguin Back to School", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/9a/1d/Ub2vRCA3.jpg" },
  ecoleCat: { desc: "Gatinho Estudioso com Oculos e Mochila", url: "https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/53/0a/144Iwnwo.jpg" },
  amisFistBump: { desc: "Lucas & Friends: Best Friends Fist Bump", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/1e/79/iyLRvQSi.jpg" },
  voiture: { desc: "Cat Drive Car Cat Monkey Drift", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/12/70/3vkzKTub4JMmB.jpg" },
  plagePalm: { desc: "Palm Tree on a Tropical Sandy Beach", url: "https://static.klipy.com/ii/71b2873e478b9d8d0482ea3ec777ba7f/5a/b8/JrFvutKcEVKhaTVSye.jpg" },
  plageSunset: { desc: "Beach Mode Activated: Sunset Serenity", url: "https://static.klipy.com/ii/935d7ab9d8c6202580a668421940ec81/f0/4e/Eo3rdbQu.jpg" },
};

// Tutorials auf Franzoesisch, bewusst einfaches HTML, damit man sie spaeter
// mit dem JoditEditor bearbeiten kann.
const TUTORIALS = {
  conditionnel: [
    "<h2>Le conditionnel pr\u00e9sent</h2>",
    "<p>Le conditionnel pr\u00e9sent se forme sur le radical du futur simple, auquel on ajoute les terminaisons de l'imparfait : <strong>-ais, -ais, -ait, -ions, -iez, -aient</strong>.</p>",
    "<p>Exemple avec <em>parler</em> : je parlerais, tu parlerais, il parlerait, nous parlerions, vous parleriez, ils parleraient.</p>",
    "<h3>Les radicaux irr\u00e9guliers</h3>",
    "<ul>",
    "<li>\u00eatre \u2192 ser- (je serais)</li>",
    "<li>avoir \u2192 aur- (j'aurais)</li>",
    "<li>aller \u2192 ir- (j'irais)</li>",
    "<li>faire \u2192 fer- (je ferais)</li>",
    "<li>pouvoir \u2192 pourr- (je pourrais)</li>",
    "<li>vouloir \u2192 voudr- (je voudrais)</li>",
    "<li>venir \u2192 viendr- (je viendrais)</li>",
    "<li>savoir \u2192 saur- (je saurais)</li>",
    "<li>voir \u2192 verr- (je verrais)</li>",
    "<li>devoir \u2192 devr- (je devrais)</li>",
    "<li>recevoir \u2192 recevr- (je recevrais)</li>",
    "</ul>",
    "<h3>Le conditionnel pass\u00e9</h3>",
    "<p>Il se forme avec <strong>avoir</strong> ou <strong>\u00eatre</strong> au conditionnel pr\u00e9sent + le participe pass\u00e9 : j'aurais mang\u00e9, je serais parti(e).</p>",
    "<p>On emploie le conditionnel pour la politesse (Je voudrais un caf\u00e9.), un souhait, une information non confirm\u00e9e et surtout dans les phrases avec <em>si</em> (voir le th\u00e8me des propositions de condition).</p>",
  ].join("\n"),
  condition: [
    "<h2>Les propositions de condition (\u00ab si \u00bb ...)</h2>",
    "<p>On distingue trois types de phrases avec <em>si</em>.</p>",
    "<h3>Type I : la condition r\u00e9elle</h3>",
    "<p><strong>si + pr\u00e9sent \u2192 pr\u00e9sent, futur simple ou imp\u00e9ratif</strong></p>",
    "<p>S'il fait beau, nous allons / irons \u00e0 la plage. Si tu veux, viens avec nous.</p>",
    "<h3>Type II : la condition irr\u00e9elle (dans le pr\u00e9sent)</h3>",
    "<p><strong>si + imparfait \u2192 conditionnel pr\u00e9sent</strong></p>",
    "<p>Si j'\u00e9tais riche, je ferais le tour du monde.</p>",
    "<h3>Type III : la condition irr\u00e9elle (dans le pass\u00e9)</h3>",
    "<p><strong>si + plus-que-parfait \u2192 conditionnel pass\u00e9</strong></p>",
    "<p>Si j'avais su, je serais venu. Si elle avait \u00e9tudi\u00e9, elle aurait r\u00e9ussi.</p>",
    "<p><strong>Attention :</strong> apr\u00e8s <em>si</em>, on n'emploie jamais le futur ni le conditionnel. On dit <em>si j'avais</em> et non <em>si j'aurais</em>.</p>",
  ].join("\n"),
  pronomsYEn: [
    "<h2>Les pronoms adverbiaux \u00ab y \u00bb et \u00ab en \u00bb</h2>",
    "<p><strong>Y</strong> remplace un lieu ou un compl\u00e9ment introduit par <em>\u00e0</em> (une chose, une id\u00e9e).</p>",
    "<p>Tu vas \u00e0 la plage ? \u2013 Oui, j'<strong>y</strong> vais. / Il pense \u00e0 son travail : il <strong>y</strong> pense.</p>",
    "<p><strong>En</strong> remplace un compl\u00e9ment introduit par <em>de</em>, un article partitif (<em>du, de la, des</em>) ou une quantit\u00e9.</p>",
    "<p>Tu veux du g\u00e2teau ? \u2013 Oui, j'<strong>en</strong> veux. / Combien de chiens as-tu ? \u2013 J'<strong>en</strong> ai deux. / Tu parles de ton voyage ? \u2013 Oui, j'<strong>en</strong> parle.</p>",
    "<h3>La place du pronom</h3>",
    "<ul>",
    "<li>devant le verbe : j'<em>y</em> vais, je n'<em>en</em> veux pas ;</li>",
    "<li>devant l'infinitif : je vais <em>y</em> aller, il vient d'<em>en</em> parler.</li>",
    "</ul>",
    "<p><strong>Astuce :</strong> \u00ab y \u00bb r\u00e9pond \u00e0 la question <em>o\u00f9 ?</em> ou <em>\u00e0 quoi ?</em>, \u00ab en \u00bb \u00e0 la question <em>de quoi ?</em> ou <em>combien ?</em>.</p>",
  ].join("\n"),
  futurSimple: [
    "<h2>Le futur simple</h2>",
    "<p>On forme le futur simple avec l'infinitif + les terminaisons <strong>-ai, -as, -a, -ons, -ez, -ont</strong>.</p>",
    "<p>Exemple avec <em>parler</em> : je parlerai, tu parleras, il parlera, nous parlerons, vous parlerez, ils parleront.</p>",
    "<p>Pour les verbes en <em>-re</em>, on supprime le <em>e</em> final : je prendrai, tu vendras.</p>",
    "<h3>Les radicaux irr\u00e9guliers</h3>",
    "<ul>",
    "<li>\u00eatre \u2192 ser- (je serai)</li>",
    "<li>avoir \u2192 aur- (j'aurai)</li>",
    "<li>aller \u2192 ir- (j'irai)</li>",
    "<li>faire \u2192 fer- (je ferai)</li>",
    "<li>venir \u2192 viendr- (je viendrai)</li>",
    "<li>voir \u2192 verr- (je verrai)</li>",
    "<li>pouvoir \u2192 pourr- (je pourrai)</li>",
    "<li>vouloir \u2192 voudr- (je voudrai)</li>",
    "<li>savoir \u2192 saur- (je saurai)</li>",
    "<li>devoir \u2192 devr- (je devrai)</li>",
    "<li>recevoir \u2192 recevr- (je recevrai)</li>",
    "<li>pleuvoir \u2192 il pleuvra</li>",
    "</ul>",
    "<p>On emploie le futur simple pour parler d'une action \u00e0 venir, d'un projet ou d'une pr\u00e9vision : Demain, il fera beau.</p>",
  ].join("\n"),
  verbesIrreguliers: [
    "<h2>Les verbes irr\u00e9guliers : \u00ab s'en aller \u00bb, \u00ab fuir \u00bb, \u00ab recevoir \u00bb, \u00ab suivre \u00bb</h2>",
    "<h3>s'en aller (partir)</h3>",
    "<p>je m'en vais, tu t'en vas, il/elle s'en va, nous nous en allons, vous vous en allez, ils/elles s'en vont.</p>",
    "<p>Futur : je m'en irai. Pass\u00e9 compos\u00e9 : je m'en suis all\u00e9(e).</p>",
    "<h3>fuir (s'\u00e9chapper)</h3>",
    "<p>je fuis, tu fuis, il/elle fuit, nous fuyons, vous fuyez, ils/elles fuient. Participe pass\u00e9 : fui.</p>",
    "<h3>recevoir (obtenir, accueillir)</h3>",
    "<p>je re\u00e7ois, tu re\u00e7ois, il/elle re\u00e7oit, nous recevons, vous recevez, ils/elles re\u00e7oivent. Participe pass\u00e9 : re\u00e7u. Futur : je recevrai.</p>",
    "<h3>suivre (aller apr\u00e8s, accompagner)</h3>",
    "<p>je suis, tu suis, il/elle suit, nous suivons, vous suivez, ils/elles suivent. Participe pass\u00e9 : suivi. Futur : je suivrai.</p>",
  ].join("\n"),
};

function mc(image, question, options) {
  return { type: "multipleChoice", image, instruction: INS_MC, question, options };
}

function gap(instruction, image, gapText) {
  return { type: "gapText", image, instruction, gapText };
}

function match(image, pairs) {
  return {
    type: "matching",
    image,
    instruction: INS_MATCH,
    sentences: pairs.map((p) => ({ part1: p[0], part2: p[1] })),
  };
}

const TOPICS = [
  // ---------------------------------------------------------------------------
  // 1) Conditionnel present et passe
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Le conditionnel pr\u00e9sent et pass\u00e9",
    tutorial: TUTORIALS.conditionnel,
    exercises: [
      mc(IMG.plageBeach,
        "Si j'avais des vacances, je ___ \u00e0 la plage.",
        ["irais", "irai", "allais", "irait"]),
      mc(IMG.train,
        "Nous ___ prendre le train de nuit.",
        ["aimerions", "aimons", "aimerons", "aimions"]),
      mc(IMG.eiffel,
        "\u00c0 ta place, j'___ la tour Eiffel.",
        ["visiterais", "visiterai", "visitais", "visite"]),
      mc(IMG.soleil,
        "Il ___ beau demain, mais ce n'est pas confirm\u00e9.",
        ["ferait", "fera", "fait", "faisait"]),
      mc(IMG.wizardCatPizza,
        "Si le chat avait faim, il ___ toute la pizza.",
        ["aurait mang\u00e9", "aurait mange", "aura mang\u00e9", "avait mang\u00e9"]),
      mc(IMG.telephone,
        "Tu ___ pu me pr\u00e9venir, Mr Bean !",
        ["aurais", "aurait", "avais", "aurai"]),
      mc(IMG.avionSunset,
        "Elle ___ partir en voyage, mais elle n'avait pas d'argent.",
        ["aurait voulu", "aura voulu", "voulait", "voudrait"]),
      gap("Compl\u00e8te avec le verbe \u00ab prendre \u00bb au conditionnel pr\u00e9sent.", IMG.bateau,
        "\u00c0 ta place, je {prendrais} le bateau."),
      mc(IMG.fete,
        "On ___ faire la f\u00eate toute la nuit !",
        ["pourrait", "pourra", "pouvait", "peut"]),
      match(IMG.ecoleCat, [
        ["\u00eatre (je)", "serais"],
        ["avoir (j')", "aurais"],
        ["aller (j')", "irais"],
        ["faire (je)", "ferais"],
        ["pouvoir (je)", "pourrais"],
      ]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 2) Les propositions de condition (types I, II et III)
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Les propositions de condition (types I, II et III)",
    tutorial: TUTORIALS.condition,
    exercises: [
      mc(IMG.plagePalm,
        "S'il fait beau demain, nous ___ \u00e0 la plage.",
        ["irons", "irions", "allions", "allons"]),
      mc(IMG.filmPopcorn,
        "Si tu veux, nous ___ un film ce soir.",
        ["regarderons", "regarderions", "regardions", "regardons"]),
      mc(IMG.argent,
        "Si j'\u00e9tais riche, je ___ le tour du monde.",
        ["ferais", "ferai", "faisais", "fais"]),
      mc(IMG.eiffel,
        "Si nous habitions \u00e0 Paris, nous ___ la tour Eiffel tous les jours.",
        ["verrions", "verrons", "voyions", "verrai"]),
      mc(IMG.plageSunset,
        "Si j'avais su, je ___ venu en vacances avec toi.",
        ["serais", "serai", "\u00e9tais", "sois"]),
      mc(IMG.devoirs,
        "Si elle avait r\u00e9vis\u00e9, elle ___ r\u00e9ussi son examen.",
        ["aurait", "aura", "avait", "a"]),
      mc(IMG.trainSteam,
        "S'ils \u00e9taient partis plus t\u00f4t, ils ___ le train.",
        ["auraient pris", "auraient prend", "auraient prendre", "ont pris"]),
      gap("Compl\u00e8te avec le verbe \u00ab manger \u00bb \u00e0 l'imparfait.", IMG.gateau,
        "Si tu {mangeais} moins de g\u00e2teaux, tu serais en meilleure forme."),
      mc(IMG.meteo,
        "Si le temps le permet, la f\u00eate ___ lieu dehors.",
        ["aura", "aurait", "avait", "ait"]),
      match(IMG.camping, [
        ["Si j'ai le temps,", "je viendrai."],
        ["Si j'avais le temps,", "je viendrais."],
        ["Si j'avais eu le temps,", "je serais venu."],
        ["S'il fait beau,", "nous irons marcher."],
        ["S'il faisait beau,", "nous irions marcher."],
      ]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 3) Pronoms adverbiaux y / en
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Les pronoms adverbiaux \u00ab y \u00bb et \u00ab en \u00bb",
    tutorial: TUTORIALS.pronomsYEn,
    exercises: [
      mc(IMG.plagePalm,
        "Tu vas \u00e0 la plage ? \u2013 Oui, j'___ vais.",
        ["y", "en", "la", "le"]),
      mc(IMG.gateau,
        "Tu veux du g\u00e2teau ? \u2013 Oui, j'___ veux.",
        ["en", "y", "le", "la"]),
      mc(IMG.bonnesVacances,
        "Il pense souvent \u00e0 ses vacances : il ___ pense tout le temps.",
        ["y", "en", "le", "la"]),
      mc(IMG.ordinateur,
        "Je m'int\u00e9resse \u00e0 l'informatique, je m'___ int\u00e9resse beaucoup.",
        ["y", "en", "le", "la"]),
      mc(IMG.chien,
        "Combien de chiens as-tu ? \u2013 J'___ ai deux.",
        ["en", "y", "les", "le"]),
      mc(IMG.travail,
        "Tu parles souvent de ton travail ? \u2013 Oui, j'___ parle souvent.",
        ["en", "y", "le", "la"]),
      gap("Compl\u00e8te avec le pronom \u00ab y \u00bb ou \u00ab en \u00bb.", IMG.jardin,
        "Il y a beaucoup de fleurs dans le jardin ; il y {en} a partout."),
      match(IMG.cinemaNetflix, [
        ["Tu es all\u00e9 au cin\u00e9ma ?", "Oui, j'y suis all\u00e9."],
        ["Tu veux des bonbons ?", "Oui, j'en veux."],
        ["Elle pense \u00e0 son film ?", "Oui, elle y pense."],
        ["Il parle de son r\u00f4le ?", "Oui, il en parle."],
        ["Vous allez \u00e0 Paris ?", "Oui, nous y allons."],
      ]),
      mc(IMG.randonnee,
        "Nous pensons \u00e0 notre randonn\u00e9e, nous ___ pensons avec plaisir.",
        ["y", "en", "la", "le"]),
      mc(IMG.parisBeret,
        "Tu reviens de Paris ? \u2013 Oui, j'___ reviens.",
        ["en", "y", "le", "la"]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 4) Futur simple
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Le futur simple",
    tutorial: TUTORIALS.futurSimple,
    exercises: [
      mc(IMG.avion,
        "L'\u00e9t\u00e9 prochain, nous ___ en Espagne.",
        ["irons", "allons", "irions", "allions"]),
      mc(IMG.meteo,
        "Demain, il ___ beau sur toute la r\u00e9gion.",
        ["fera", "ferait", "fait", "faisait"]),
      mc(IMG.train,
        "Le train ___ \u00e0 huit heures.",
        ["partira", "partirait", "part", "partait"]),
      mc(IMG.ski,
        "S'il neige, nous ___ au ski.",
        ["irons", "irions", "allons", "allions"]),
      mc(IMG.feteParty,
        "Je ___ \u00e0 la f\u00eate de L\u00e9a samedi.",
        ["viendrai", "viendrais", "viens", "venais"]),
      mc(IMG.pluie,
        "Prends ton parapluie, il ___ bient\u00f4t.",
        ["pleuvra", "pleuvrait", "pleut", "pleuvait"]),
      mc(IMG.devoirs,
        "Vous ___ la r\u00e9ponse d\u00e8s que possible.",
        ["aurez", "auriez", "avez", "aviez"]),
      gap("Compl\u00e8te avec le verbe \u00ab \u00eatre \u00bb au futur simple.", IMG.plageSunset,
        "Nous {serons} peut-\u00eatre sur la plage le mois prochain."),
      mc(IMG.ordinateurLenovo,
        "Il ___ un nouvel ordinateur \u00e0 No\u00ebl.",
        ["recevra", "recevrait", "re\u00e7oit", "recevait"]),
      match(IMG.ecolePenguin, [
        ["\u00eatre (je)", "serai"],
        ["avoir (j')", "aurai"],
        ["aller (j')", "irai"],
        ["faire (je)", "ferai"],
        ["venir (je)", "viendrai"],
        ["pouvoir (je)", "pourrai"],
      ]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 5) Verbes irreguliers : s'en aller, fuir, recevoir, suivre
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Verbes irr\u00e9guliers : \u00ab s'en aller \u00bb, \u00ab fuir \u00bb, \u00ab recevoir \u00bb, \u00ab suivre \u00bb",
    tutorial: TUTORIALS.verbesIrreguliers,
    exercises: [
      mc(IMG.bonnesVacances,
        "D\u00e8s que les vacances commencent, nous nous en ___ \u00e0 la mer.",
        ["allons", "vont", "allez", "vais"]),
      mc(IMG.voiture,
        "Le chat s'en ___ quand la voiture d\u00e9marre.",
        ["va", "vont", "allez", "vais"]),
      mc(IMG.bateauSuez,
        "Le bateau ___ le canal de Suez.",
        ["suit", "suivent", "suivez", "suivons"]),
      mc(IMG.chienShocked,
        "Le chien ___ quand il entend le tonnerre.",
        ["fuit", "fuis", "fuyons", "fuient"]),
      mc(IMG.livre,
        "Vous ___ un livre pour votre anniversaire.",
        ["recevez", "recevons", "re\u00e7oivent", "re\u00e7ois"]),
      mc(IMG.telephone,
        "Paul ___ un coup de fil de sa m\u00e8re.",
        ["re\u00e7oit", "re\u00e7ois", "recevons", "re\u00e7oivent"]),
      mc(IMG.amisFistBump,
        "Je ___ mes amis jusqu'au cin\u00e9ma.",
        ["suis", "suit", "suivons", "suivez"]),
      gap("Compl\u00e8te avec le verbe \u00ab recevoir \u00bb au pr\u00e9sent.", IMG.parisBeret,
        "Marie {re\u00e7oit} une carte postale de Paris."),
      match(IMG.ecoleCat, [
        ["je (s'en aller)", "m'en vais"],
        ["nous (fuir)", "fuyons"],
        ["ils (recevoir)", "re\u00e7oivent"],
        ["tu (suivre)", "suis"],
        ["vous (s'en aller)", "vous en allez"],
      ]),
      mc(IMG.train,
        "Demain, je m'en ___ plus t\u00f4t.",
        ["irai", "irais", "allais", "vais"]),
    ],
  },
];

const dryRun = process.argv.includes("--dry-run");

function options(liste) {
  return liste.map((option, i) => ({ option, correct: i === 0 }));
}

// Schluessel, um doppelte Aufgaben zu erkennen.
async function bereitsVorhanden(exercises, ex) {
  if (ex.type === "multipleChoice") {
    return exercises.findOne({ subject: SUBJECT, question: ex.question });
  }
  if (ex.type === "gapText") {
    return exercises.findOne({ subject: SUBJECT, gapText: ex.gapText });
  }
  const erstes = ex.sentences[0];
  return exercises.findOne({
    subject: SUBJECT,
    "sentences.part1": erstes.part1,
    "sentences.part2": erstes.part2,
  });
}

async function backup(db) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });
  for (const col of ["quizzes", "topics", "exercises"]) {
    const docs = await db.collection(col).find({}).toArray();
    fs.writeFileSync(path.join(dir, `${col}.json`), EJSON.stringify(docs, undefined, 2));
    console.log(`Backup ${col}: ${docs.length} Dokumente`);
  }
  console.log(`Backup-Verzeichnis: ${dir}`);
}

async function main() {
  const client = new MongoClient(URL, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const db = client.db();
  console.log(`Verbunden mit Datenbank "${db.databaseName}".`);
  if (dryRun) console.log("DRY RUN: es wird nichts geaendert.");

  if (!dryRun) await backup(db);

  const quiz = await db
    .collection("quizzes")
    .findOne({ website: "web", subject: SUBJECT });
  if (!quiz) throw new Error(`Kein Quiz mit subject "${SUBJECT}" gefunden.`);
  const quizId = quiz._id;
  console.log(`Quiz "${SUBJECT}": ${quizId}`);

  const owner = await db.collection("users").findOne({ email: OWNER_EMAIL });
  if (!owner) throw new Error(`Kein Benutzer mit E-Mail ${OWNER_EMAIL} gefunden.`);
  const ownerId = owner._id;
  console.log(`Besitzer: ${ownerId} (${OWNER_EMAIL})`);

  const topics = db.collection("topics");
  const exercises = db.collection("exercises");

  let topicsAngelegt = 0;
  let aufgabenAngelegt = 0;
  let aufgabenUebersprungen = 0;

  for (const t of TOPICS) {
    let topic = await topics.findOne({ subject: SUBJECT, title: t.title });
    if (topic) {
      console.log(`Thema vorhanden: ${t.title}`);
      if (!dryRun) {
        await topics.updateOne(
          { _id: topic._id },
          { $set: { tutorial: t.tutorial, quiz: quizId, user: ownerId, updatedAt: new Date() } },
        );
      }
    } else if (dryRun) {
      console.log(`Thema wuerde angelegt: ${t.title}`);
      topicsAngelegt++;
    } else {
      const res = await topics.insertOne({
        subject: SUBJECT,
        title: t.title,
        tutorial: t.tutorial,
        quiz: quizId,
        user: ownerId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      topic = await topics.findOne({ _id: res.insertedId });
      console.log(`Thema angelegt: ${t.title} (${res.insertedId})`);
      topicsAngelegt++;
    }
    const topicId = topic ? topic._id : null;

    for (const ex of t.exercises) {
      const vorhanden = await bereitsVorhanden(exercises, ex);
      if (vorhanden) {
        aufgabenUebersprungen++;
        continue;
      }
      if (dryRun) {
        aufgabenAngelegt++;
        continue;
      }
      const doc = {
        quiz: quizId,
        subject: SUBJECT,
        type: ex.type,
        imageUrl: ex.image.url,
        topic: topicId,
        user: ownerId,
        instruction: ex.instruction,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (ex.type === "multipleChoice") {
        doc.question = ex.question;
        doc.options = options(ex.options);
        // Damit die franzoesischen Optionen auch bei franzoesischer
        // Oberflaechensprache erscheinen.
        doc.optionsFr = options(ex.options);
        doc.optionsEn = [];
      } else if (ex.type === "gapText") {
        doc.gapText = ex.gapText;
      } else if (ex.type === "matching") {
        doc.sentences = ex.sentences;
        doc.guessedSentences = [];
      }
      await exercises.insertOne(doc);
      aufgabenAngelegt++;
      console.log(`  + [${ex.type}] ${t.title}`);
    }
  }

  console.log(
    `${topicsAngelegt} Thema(en) und ${aufgabenAngelegt} Aufgabe(n) ${
      dryRun ? "wuerden angelegt" : "angelegt"
    }, ${aufgabenUebersprungen} Aufgabe(n) uebersprungen (bereits vorhanden).`,
  );

  await client.close();
  console.log(dryRun ? "Dry run abgeschlossen." : "Fertig.");
}

main().catch((e) => {
  console.error("Fehlgeschlagen:", e && e.message ? e.message : e);
  process.exit(1);
});
