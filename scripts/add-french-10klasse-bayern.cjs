// Legt fuer das Franzoesisch-Quiz (subject "french") die Grammatikthemen der
// 10. Klasse Gymnasium Bayern (LehrplanPLUS F10) an: zuerst die drei im
// Auftrag genannten Themen (Subjonctif present, Declencheurs, craindre /
// se plaindre), danach die uebrigen F10-Grammatikthemen.
//
// Alles, was in die Datenbank geschrieben wird, ist auf Franzoesisch. Jeder
// Themennname traegt das Praefix "10.Klasse Gymnasium Bayern - ".
//
// Jede Aufgabe hat ein zufaelliges Bild aus der Klipy-API. Die Beschreibung
// des Bildes (Klipy-Feld "title") bestimmt den Inhalt des Satzes.
//
// Der Lauf ist idempotent: Quiz/Thema werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit demselben Schluessel im Fach "french" gibt.
//
// Aufruf auf dem Server (dort ist die Datenbank erreichbar):
//   node scripts/add-french-10klasse-bayern.cjs --dry-run
//   node scripts/add-french-10klasse-bayern.cjs

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const URL = process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";
const SUBJECT = "french";
const OWNER_EMAIL = "imelflorianingerl@gmail.com";
const PREFIX = "10.Klasse Gymnasium Bayern - ";

const INS_MC = "Choisis la bonne r\u00e9ponse.";
const INS_MATCH = "Associe les \u00e9l\u00e9ments qui vont ensemble.";

// Bilder aus der Klipy-API (hd.jpg). Der Name ist die Klipy-Beschreibung.
const IMG = {
  potter: { desc: "Harry Potter Waving His Wand", url: "https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/9e/a8/V4C87aZUTBT3t7Ku.jpg" },
  chatPizza: { desc: "Wizard Cat Eating Pizza", url: "https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/6d/ca/75tfE2gT.jpg" },
  chiot: { desc: "Adorable Golden Retriever Puppy", url: "https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/62/60/X9YFUmUYH8zUZb99pS.jpg" },
  anniversaire: { desc: "Surprise Birthday Party Celebration", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/3f/1e/MCQ958Mkg0pI11sse.jpg" },
  penalty: { desc: "Football Penalty Kick in Stadium", url: "https://static.klipy.com/ii/e293a233a303a98e471f78d04e13a1b0/99/3e/o71OKKQhsX9iTU0rE.jpg" },
  chateau: { desc: "Study in a Magical Castle: SHMS Caux", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/a5/e8/LCAlmOr7.jpg" },
  pluieEnfant: { desc: "Happy Child's Rain Dance", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/65/c1/adEDvB2s.jpg" },
  pingouinPizza: { desc: "Pengu the Penguin Enjoys Pizza", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/7e/7c/d3FRVgc1.jpg" },
  pingouinEcole: { desc: "Pudgy Penguin Back to School", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/9a/1d/Ub2vRCA3.jpg" },
  gateau: { desc: "Decadent Chocolate Layer Cake", url: "https://static.klipy.com/ii/a15b48460c436e1e92c85ffc680932cc/19/af/c3f5DfGCs0RPEIHTpM.jpg" },
  chat: { desc: "Cute Kitten Looking Up", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/4a/fd/UfO80VmU.jpg" },
  batmanPluie: { desc: "Lonely Batman Sits in Heavy Rain", url: "https://static.klipy.com/ii/ce286d05b8e1a47cd4f32b0e1b6dec0e/02/2d/cKLqCl5R.jpg" },
  pingouinParapluie: { desc: "Cute Penguin with Umbrella in Rain", url: "https://static.klipy.com/ii/ce286d05b8e1a47cd4f32b0e1b6dec0e/f2/09/XeEaPQ5K.jpg" },
  cadeau: { desc: "Green Gift Box with Red Ribbon", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/54/17/XnSmE19mjAEZ2sUD.jpg" },
  chiotBonjour: { desc: "Cute Puppy Says Hi There", url: "https://static.klipy.com/ii/ce286d05b8e1a47cd4f32b0e1b6dec0e/f8/62/wPpdZ59v.jpg" },
  dragon: { desc: "Toothless Dragon from How To Train Your Dragon", url: "https://static.klipy.com/ii/da290b156d64898341638f3c299e7478/b9/88/0w1k78IXMkz74.jpg" },
  dragonBebe: { desc: "Cute Baby Dragon Chiu", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/48/0a/HH0vy20l.jpg" },
  eleveEnerve: { desc: "Angry Kid Doing School Work Meme", url: "https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/1d/35/JTSkRtlG7F9tvWaRBp.jpg" },
  classe: { desc: "School Children in Classroom", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/e9/8b/gXxyGdua.jpg" },
  train: { desc: "Scenic Train Ride Journey", url: "https://static.klipy.com/ii/39f2394ae36df6e199be9eb7c9fa1012/f6/12/Hm4GGHvQ9oqNFEW.jpg" },
  vague: { desc: "Serene Tropical Beach Waves", url: "https://static.klipy.com/ii/35ccce3d852f7995dd2da910f2abd795/d9/c6/9r3pHbzm.jpg" },
  palmier: { desc: "Tropical Beach View with Palm Tree", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/f2/bc/wkPuy9Utq06I.jpg" },
  enfantsFete: { desc: "Kids Dancing at Birthday Party", url: "https://static.klipy.com/ii/8ce8357c78ea940b9c2015daf05ce1a5/64/ed/LOoh8GN4krlcMDt3.jpg" },
  peluches: { desc: "Adorable Puppies Cuddled in a Blanket", url: "https://static.klipy.com/ii/925f17378dd1893b674a723c07535afe/82/71/NaernZPM.jpg" },
  corgiGateau: { desc: "Happy Birthday Corgi Eating Cake with Party Hat", url: "https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/fc/58/jDbLGETa.jpg" },
  tournesols: { desc: "Golden Sunflowers Field at Sunset", url: "https://static.klipy.com/ii/f87f46a2c5aeaeed4c68910815f73eaf/c8/6a/e1OA6ZVf.jpg" },
  livre: { desc: "Study Book", url: "https://static.klipy.com/ii/d7aec6f6f171607374b2065c836f92f4/18/15/KK1tzQqo4f76Zh.jpg" },
  grandLivre: { desc: "Big Book Huge Book", url: "https://static.klipy.com/ii/4493325008d34b7bf8cd6813cd5c1619/7a/7c/BZw79jCLwLwn3pvTxAUo.jpg" },
  pizzaChaude: { desc: "Delicious Pepperoni Pizza with Cheese Pull", url: "https://static.klipy.com/ii/d6b0ce929193df3c242ac34b5654d2ce/32/7e/XLy5nI1zvLMgE.jpg" },
};

// Tutorials auf Franzoesisch, bewusst einfaches HTML, damit man sie spaeter
// mit dem JoditEditor bearbeiten kann.
const TUTORIALS = {
  subjonctif: [
    "<h2>La formation du subjonctif pr\u00e9sent</h2>",
    "<p>Pour former le subjonctif pr\u00e9sent, on part de la 3e personne du pluriel (<em>ils</em>) du pr\u00e9sent de l'indicatif, puis on ajoute les terminaisons <strong>-e, -es, -e, -ions, -iez, -ent</strong>.</p>",
    "<p>Exemple avec <em>parler</em> : ils parlent \u2192 que je parle, que tu parles, qu'il parle, que nous parlions, que vous parliez, qu'ils parlent.</p>",
    "<p>Pour <em>nous</em> et <em>vous</em>, on utilise le radical de l'imparfait (nous parlions, vous parliez).</p>",
    "<h3>Les terminaisons</h3>",
    "<ul>",
    "<li>que je / que j' ... -e</li>",
    "<li>que tu ... -es</li>",
    "<li>qu'il / qu'elle / qu'on ... -e</li>",
    "<li>que nous ... -ions</li>",
    "<li>que vous ... -iez</li>",
    "<li>qu'ils / qu'elles ... -ent</li>",
    "</ul>",
    "<p><strong>Attention :</strong> certains verbes sont irr\u00e9guliers : \u00eatre (\u2192 que je sois), avoir (\u2192 que j'aie), faire (\u2192 que je fasse), aller (\u2192 que j'aille), savoir (\u2192 que je sache), pouvoir (\u2192 que je puisse), vouloir (\u2192 que je veuille).</p>",
  ].join("\n"),
  declencheurs: [
    "<h2>Les principaux d\u00e9clencheurs du subjonctif</h2>",
    "<p>On emploie le subjonctif apr\u00e8s des verbes et des expressions qui expriment :</p>",
    "<ul>",
    "<li>le souhait ou la volont\u00e9 : <em>vouloir que, souhaiter que, d\u00e9sirer que, pr\u00e9f\u00e9rer que, demander que</em> ;</li>",
    "<li>l'\u00e9motion ou le sentiment : <em>\u00eatre content / heureux / triste que, regretter que, avoir peur que, craindre que</em> ;</li>",
    "<li>le doute ou la n\u00e9cessit\u00e9 : <em>douter que, il faut que, il est important que, il est possible que, il est n\u00e9cessaire que</em>.</li>",
    "</ul>",
    "<h3>Les conjonctions</h3>",
    "<p>Certaines conjonctions introduisent toujours le subjonctif : <strong>pour que, afin que, avant que, jusqu'\u00e0 ce que, bien que, quoique, \u00e0 moins que, pourvu que, sans que, en attendant que</strong>.</p>",
    "<p>Exemples : Je t'explique <em>pour que</em> tu comprennes. Reste ici <em>avant qu'</em>il ne parte.</p>",
    "<p><strong>Attention :</strong> apr\u00e8s <em>esp\u00e9rer que</em>, ainsi qu'apr\u00e8s <em>parce que, quand, lorsque, comme</em>, on emploie l'indicatif.</p>",
  ].join("\n"),
  craindre: [
    "<h2>Les verbes \u00ab craindre \u00bb et \u00ab se plaindre \u00bb</h2>",
    "<p><strong>Craindre</strong> (avoir peur de) : je crains, tu crains, il craint, nous craignons, vous craignez, ils craignent.</p>",
    "<p>Au subjonctif pr\u00e9sent : que je craigne, que tu craignes, qu'il craigne, que nous craignions, que vous craigniez, qu'ils craignent.</p>",
    "<p><strong>Se plaindre</strong> (protester, exprimer son m\u00e9contentement) : je me plains, tu te plains, il se plaint, nous nous plaignons, vous vous plaignez, ils se plaignent.</p>",
    "<p>Au subjonctif pr\u00e9sent : que je me plaigne, que tu te plaignes, qu'il se plaigne, que nous nous plaignions, que vous vous plaigniez, qu'ils se plaignent.</p>",
    "<p>Regarde bien le <strong>g</strong> dans <em>nous craignons</em>, <em>nous nous plaignons</em> et dans les formes du subjonctif (<em>craign-</em>, <em>plaign-</em>).</p>",
    "<p><strong>Astuce :</strong> apr\u00e8s <em>craindre que</em> et <em>avoir peur que</em>, on ajoute souvent un <em>ne</em> expl\u00e9tif : Je crains qu'il <em>ne</em> soit en retard.</p>",
  ].join("\n"),
  discoursIndirect: [
    "<h2>Le discours indirect au pass\u00e9</h2>",
    "<p>Quand le verbe introducteur est au pass\u00e9 (<em>il a dit, il a demand\u00e9</em>), les temps et les indicateurs de temps changent :</p>",
    "<ul>",
    "<li>pr\u00e9sent \u2192 imparfait ;</li>",
    "<li>pass\u00e9 compos\u00e9 \u2192 plus-que-parfait ;</li>",
    "<li>futur simple \u2192 conditionnel ;</li>",
    "<li>demain \u2192 le lendemain ; aujourd'hui \u2192 ce jour-l\u00e0 ; hier \u2192 la veille ; maintenant \u2192 alors.</li>",
    "</ul>",
    "<p>Exemple : Il a dit : \u00ab Je suis fatigu\u00e9. \u00bb \u2192 Il a dit qu'il <em>\u00e9tait</em> fatigu\u00e9.</p>",
    "<h3>L'interrogation indirecte au pass\u00e9</h3>",
    "<p>Question directe : \u00ab O\u00f9 vas-tu ? \u00bb \u2192 Il m'a demand\u00e9 <em>o\u00f9 j'allais</em>.</p>",
    "<p>On utilise <em>si</em> pour une question ferm\u00e9e : \u00ab Tu viens ? \u00bb \u2192 Il m'a demand\u00e9 <em>si je venais</em>.</p>",
    "<p>Avec <em>ce qui</em> / <em>ce que</em> : Il m'a demand\u00e9 <em>ce qui</em> se passait. Il voulait savoir <em>ce que</em> je faisais.</p>",
  ].join("\n"),
  passif: [
    "<h2>La voix passive</h2>",
    "<p>Formation : <strong>\u00eatre</strong> (au temps voulu) <strong>+ participe pass\u00e9</strong>. Le participe pass\u00e9 s'accorde avec le sujet.</p>",
    "<p>Actif : Le chat mange la pizza. \u2192 Passif : La pizza <em>est mang\u00e9e</em> par le chat.</p>",
    "<p>Au pass\u00e9 compos\u00e9 : La pizza <em>a \u00e9t\u00e9 mang\u00e9e</em> par le chat.</p>",
    "<h3>Autres moyens d'exprimer le passif</h3>",
    "<p>On peut employer <strong>on</strong> : <em>On mange la pizza.</em> (= La pizza est mang\u00e9e.)</p>",
    "<p>Ou la <strong>forme pronominale de sens passif</strong> : <em>Cette pizza se mange chaude.</em> / <em>Ces livres se vendent bien.</em></p>",
  ].join("\n"),
  passeSimple: [
    "<h2>Le pass\u00e9 simple (3e personne)</h2>",
    "<p>Le pass\u00e9 simple est le temps du r\u00e9cit \u00e9crit. En 10e, on le reconna\u00eet surtout \u00e0 la 3e personne.</p>",
    "<ul>",
    "<li>3e personne du singulier : il / elle parla, finit, prit, eut, fut, fit, alla, vint, vit ;</li>",
    "<li>3e personne du pluriel : ils / elles parl\u00e8rent, finirent, prirent, eurent, furent, firent, all\u00e8rent, vinrent, virent.</li>",
    "</ul>",
    "<p>Exemples : Le dragon <em>surgit</em> du ciel et cracha du feu. Les enfants <em>eurent</em> tr\u00e8s peur.</p>",
  ].join("\n"),
  accordPP: [
    "<h2>L'accord du participe pass\u00e9 avec \u00ab avoir \u00bb</h2>",
    "<p>Avec l'auxiliaire <strong>avoir</strong>, le participe pass\u00e9 ne s'accorde pas avec le sujet. Il s'accorde avec le <strong>compl\u00e9ment d'objet direct (COD)</strong> plac\u00e9 <strong>avant</strong> le verbe.</p>",
    "<ul>",
    "<li>J'ai mang\u00e9 une pizza. (pas d'accord, le COD est apr\u00e8s le verbe)</li>",
    "<li>La pizza que j'ai mang<em>\u00e9e</em>. (accord avec \u00ab que \u00bb = la pizza, COD plac\u00e9 avant)</li>",
    "<li>Les photos que nous avons pris<em>es</em>. (accord avec \u00ab que \u00bb = les photos)</li>",
    "</ul>",
    "<p><strong>Attention :</strong> si le COD est apr\u00e8s le verbe, il n'y a pas d'accord : J'ai pris les photos.</p>",
  ].join("\n"),
};

function mc(instruction, image, question, options) {
  return { type: "multipleChoice", image, instruction, question, options };
}

function gap(instruction, image, gapText) {
  return { type: "gapText", image, instruction, gapText };
}

function match(instruction, image, pairs) {
  return {
    type: "matching",
    image,
    instruction,
    sentences: pairs.map((p) => ({ part1: p[0], part2: p[1] })),
  };
}

const TOPICS = [
  // ---------------------------------------------------------------------------
  // 1) Formation du subjonctif present
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Formation du subjonctif pr\u00e9sent",
    tutorial: TUTORIALS.subjonctif,
    exercises: [
      mc(INS_MC, IMG.potter,
        "Le professeur veut que Harry Potter ___ sa baguette magique.",
        ["l\u00e8ve", "l\u00e8ves", "levons", "levez"]),
      mc(INS_MC, IMG.chatPizza,
        "Je suis content que le chat magicien ___ toute la pizza.",
        ["mange", "manges", "mangeons", "mangez"]),
      mc(INS_MC, IMG.chiot,
        "Il faut que ce chiot ___ sage.",
        ["soit", "est", "sera", "serait"]),
      gap("Compl\u00e8te avec le verbe \u00ab aller \u00bb au subjonctif pr\u00e9sent.", IMG.anniversaire,
        "Mes parents veulent que nous {allions} \u00e0 la f\u00eate d'anniversaire surprise."),
      mc(INS_MC, IMG.penalty,
        "Il est important que les joueurs ___ le penalty.",
        ["marquent", "marque", "marques", "marquez"]),
      match(INS_MATCH, IMG.chateau, [
        ["que je (finir)", "finisse"],
        ["que tu (parler)", "parles"],
        ["qu'il (prendre)", "prenne"],
        ["que nous (aller)", "allions"],
        ["que vous (faire)", "fassiez"],
      ]),
      gap("Compl\u00e8te avec le verbe \u00ab danser \u00bb au subjonctif pr\u00e9sent.", IMG.pluieEnfant,
        "La ma\u00eetresse veut que l'enfant {danse} sous la pluie."),
      mc(INS_MC, IMG.pingouinPizza,
        "Le pingouin pr\u00e9f\u00e8re que nous ___ une pizza ensemble.",
        ["mangions", "mangeons", "mange", "mangiez"]),
      match("Associe chaque verbe \u00e0 sa forme au subjonctif pr\u00e9sent (que je...).", IMG.pingouinEcole, [
        ["\u00eatre", "sois"],
        ["avoir", "aie"],
        ["faire", "fasse"],
        ["savoir", "sache"],
        ["aller", "aille"],
      ]),
      gap("Compl\u00e8te avec le verbe \u00ab go\u00fbter \u00bb au subjonctif pr\u00e9sent.", IMG.gateau,
        "Il faut que tu {go\u00fbtes} ce g\u00e2teau au chocolat."),
      mc(INS_MC, IMG.chat,
        "Elle doute que le petit chat ___ capable de monter \u00e0 l'arbre.",
        ["soit", "sois", "soient", "est"]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 2) Principaux declencheurs du subjonctif
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Principaux d\u00e9clencheurs du subjonctif (aussi conjonctions)",
    tutorial: TUTORIALS.declencheurs,
    exercises: [
      mc(INS_MC, IMG.chatPizza,
        "Je pr\u00e9pare une pizza pour que le chat magicien ___ content.",
        ["soit", "est", "sera", "serait"]),
      mc(INS_MC, IMG.batmanPluie,
        "Bien qu'il ___ triste sous la pluie, Batman ne pleure jamais.",
        ["soit", "est", "\u00e9tait", "sera"]),
      mc(INS_MC, IMG.potter,
        "Je doute que Harry Potter ___ un sorcier ordinaire.",
        ["soit", "est", "sera", "serait"]),
      gap("Compl\u00e8te avec le verbe \u00ab faire \u00bb au subjonctif pr\u00e9sent.", IMG.gateau,
        "Je te donne la recette pour que tu {fasses} ce g\u00e2teau toi-m\u00eame."),
      gap("Compl\u00e8te avec le verbe \u00ab r\u00e9ussir \u00bb au subjonctif pr\u00e9sent.", IMG.chateau,
        "Travaille s\u00e9rieusement afin que tu {r\u00e9ussisses} ton examen."),
      match("Associe chaque d\u00e9clencheur \u00e0 la suite qui convient (le subjonctif est obligatoire).", IMG.pingouinParapluie, [
        ["il faut que", "tu partes maintenant"],
        ["bien que", "il pleuve"],
        ["pour que", "tu comprennes"],
        ["avant que", "le train ne parte"],
        ["\u00e0 moins que", "tu ne viennes pas"],
      ]),
      mc(INS_MC, IMG.pluieEnfant,
        "___ qu'il pleuve, l'enfant danse sous la pluie.",
        ["Bien", "Parce", "Quand", "Comme"]),
      mc(INS_MC, IMG.anniversaire,
        "Mes amis organisent une f\u00eate pour que je ___ mon anniversaire avec eux.",
        ["f\u00eate", "f\u00eates", "f\u00eatons", "f\u00eaterai"]),
      mc(INS_MC, IMG.cadeau,
        "Je suis surpris que tu n'___ pas encore ouvert ce cadeau.",
        ["aies", "as", "aie", "avez"]),
      gap("Compl\u00e8te avec le verbe \u00ab boire \u00bb au subjonctif pr\u00e9sent.", IMG.chiot,
        "Il faut que ce chiot {boive} de l'eau."),
      match("Associe le d\u00e9but de la phrase \u00e0 la fin qui convient.", IMG.train, [
        ["Je veux que", "tu sois heureux."],
        ["Il est possible que", "nous partions demain."],
        ["J'ai peur qu'", "il ne vienne pas."],
        ["Avant que", "tu partes, appelle-moi."],
        ["Pourvu qu'", "il fasse beau !"],
      ]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 3) Verbes irreguliers : craindre, se plaindre
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Verbes irr\u00e9guliers : \u00ab craindre \u00bb, \u00ab se plaindre \u00bb",
    tutorial: TUTORIALS.craindre,
    exercises: [
      mc(INS_MC, IMG.dragon,
        "Je ___ que le dragon ne soit dangereux.",
        ["crains", "craint", "craignons", "craignent"]),
      mc(INS_MC, IMG.chat,
        "Nous ___ que le petit chat ait peur.",
        ["craignons", "crains", "craignez", "craignent"]),
      mc(INS_MC, IMG.chiotBonjour,
        "Les \u00e9l\u00e8ves se ___ que le chien aboie en classe.",
        ["plaignent", "plaint", "plaignons", "plaignez"]),
      gap("Compl\u00e8te avec le verbe \u00ab craindre \u00bb au pr\u00e9sent.", IMG.penalty,
        "Les joueurs {craignent} de perdre le match."),
      gap("Compl\u00e8te avec le verbe \u00ab se plaindre \u00bb au pr\u00e9sent.", IMG.pingouinParapluie,
        "Je me {plains} parce qu'il pleut toujours."),
      mc(INS_MC, IMG.eleveEnerve,
        "Il est normal que l'\u00e9l\u00e8ve se ___ des devoirs trop difficiles.",
        ["plaigne", "plains", "plaignent", "plaindre"]),
      mc(INS_MC, IMG.potter,
        "Je ne pense pas que tu ___ les dragons.",
        ["craignes", "crains", "craignons", "craignez"]),
      match("Associe chaque forme \u00e0 la bonne personne au subjonctif pr\u00e9sent.", IMG.dragonBebe, [
        ["que je (craindre)", "craigne"],
        ["que nous (craindre)", "craignions"],
        ["qu'ils (craindre)", "craignent"],
        ["que je (se plaindre)", "me plaigne"],
        ["que nous (se plaindre)", "nous plaignions"],
      ]),
      match("Associe le d\u00e9but et la fin de chaque phrase (subjonctif).", IMG.batmanPluie, [
        ["je crains que", "tu aies peur"],
        ["nous craignons que", "vous ayez peur"],
        ["elle se plaint que", "tout soit trop cher"],
        ["les \u00e9l\u00e8ves se plaignent que", "le cours soit ennuyeux"],
        ["tu crains que", "je sois en retard"],
      ]),
      gap("Compl\u00e8te avec le verbe \u00ab craindre \u00bb au pr\u00e9sent.", IMG.peluches,
        "Mes parents {craignent} que je sois triste."),
      mc(INS_MC, IMG.pizzaChaude,
        "Le gar\u00e7on se ___ que la pizza soit trop chaude.",
        ["plaint", "plains", "plaignent", "plaindre"]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 4) Discours indirect au passe / interrogation indirecte au passe
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Discours indirect au pass\u00e9 et interrogation indirecte au pass\u00e9",
    tutorial: TUTORIALS.discoursIndirect,
    exercises: [
      mc(INS_MC, IMG.anniversaire,
        "Paul a dit : \u00ab Je suis content. \u00bb \u2192 Paul a dit qu'il ___ content.",
        ["\u00e9tait", "est", "sera", "serait"]),
      mc(INS_MC, IMG.penalty,
        "L'entra\u00eeneur a demand\u00e9 : \u00ab Vous \u00eates pr\u00eats ? \u00bb \u2192 L'entra\u00eeneur a demand\u00e9 si nous ___ pr\u00eats.",
        ["\u00e9tions", "sommes", "serons", "serez"]),
      mc(INS_MC, IMG.chateau,
        "Elle m'a demand\u00e9 o\u00f9 j'___ mes \u00e9tudes l'ann\u00e9e pr\u00e9c\u00e9dente.",
        ["avais fait", "ai fait", "ferais", "faisais"]),
      match("Associe le discours direct au discours indirect au pass\u00e9.", IMG.pingouinParapluie, [
        ["\u00ab Il pleut. \u00bb", "Il a dit qu'il pleuvait."],
        ["\u00ab Je partirai demain. \u00bb", "Il a dit qu'il partirait le lendemain."],
        ["\u00ab Tu viens ? \u00bb", "Il a demand\u00e9 si je venais."],
        ["\u00ab Qu'est-ce qui se passe ? \u00bb", "Il a demand\u00e9 ce qui se passait."],
        ["\u00ab Qu'est-ce que tu fais ? \u00bb", "Il a demand\u00e9 ce que je faisais."],
      ]),
      gap("Compl\u00e8te au discours indirect (imparfait).", IMG.chiotBonjour,
        "Hier, elle a demand\u00e9 si je {venais} \u00e0 la f\u00eate du chien."),
      mc(INS_MC, IMG.train,
        "Il a dit : \u00ab Je prends le train. \u00bb \u2192 Il a dit qu'il ___ le train.",
        ["prenait", "prend", "prendra", "prendrait"]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 5) Voix passive et autres moyens d'exprimer le passif
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "La voix passive et autres moyens d'exprimer le passif",
    tutorial: TUTORIALS.passif,
    exercises: [
      mc(INS_MC, IMG.chatPizza,
        "La pizza ___ par le chat magicien.",
        ["est mang\u00e9e", "mange", "est mang\u00e9", "a mang\u00e9"]),
      mc(INS_MC, IMG.penalty,
        "Le penalty ___ par l'arbitre.",
        ["a \u00e9t\u00e9 siffl\u00e9", "est siffl\u00e9", "a siffl\u00e9", "\u00e9tait siffl\u00e9"]),
      mc(INS_MC, IMG.classe,
        "Les devoirs ___ par les \u00e9l\u00e8ves.",
        ["sont faits", "sont fait", "est fait", "font"]),
      match("Associe chaque phrase active \u00e0 sa forme passive.", IMG.livre, [
        ["Le chat mange la pizza.", "La pizza est mang\u00e9e par le chat."],
        ["On vend les billets.", "Les billets sont vendus."],
        ["Le professeur corrige les copies.", "Les copies sont corrig\u00e9es par le professeur."],
        ["On construit la maison.", "La maison est construite."],
        ["Les \u00e9l\u00e8ves ont fini le projet.", "Le projet a \u00e9t\u00e9 fini par les \u00e9l\u00e8ves."],
      ]),
      gap("Compl\u00e8te avec le pronom qui donne un sens passif.", IMG.vague,
        "Ces coquillages {se} trouvent sur la plage."),
      mc(INS_MC, IMG.palmier,
        "___ peut voir la mer depuis cet h\u00f4tel.",
        ["On", "Il", "C'est", "Se"]),
    ],
  },

  // ---------------------------------------------------------------------------
  // 6) Passe simple (3e personne)
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "Le pass\u00e9 simple (3e personne du singulier et du pluriel)",
    tutorial: TUTORIALS.passeSimple,
    exercises: [
      mc(INS_MC, IMG.dragon,
        "Le dragon ___ du ciel et cracha du feu.",
        ["surgit", "surgissait", "surgira", "a surgi"]),
      mc(INS_MC, IMG.potter,
        "Harry ___ sa baguette et lan\u00e7a un sort.",
        ["leva", "levait", "l\u00e8vera", "a lev\u00e9"]),
      mc(INS_MC, IMG.enfantsFete,
        "Les enfants ___ tr\u00e8s peur pendant la f\u00eate.",
        ["eurent", "avaient", "auront", "ont"]),
      match("Associe chaque verbe \u00e0 sa forme au pass\u00e9 simple.", IMG.train, [
        ["\u00eatre (ils)", "furent"],
        ["faire (il)", "fit"],
        ["avoir (ils)", "eurent"],
        ["aller (elle)", "alla"],
        ["venir (ils)", "vinrent"],
      ]),
      gap("Compl\u00e8te avec \u00ab \u00eatre \u00bb au pass\u00e9 simple (3e personne du singulier).", IMG.dragonBebe,
        "Le petit dragon {fut} tr\u00e8s content ce jour-l\u00e0."),
    ],
  },

  // ---------------------------------------------------------------------------
  // 7) Accord du participe passe avec avoir
  // ---------------------------------------------------------------------------
  {
    title: PREFIX + "L'accord du participe pass\u00e9 avec \u00ab avoir \u00bb",
    tutorial: TUTORIALS.accordPP,
    exercises: [
      mc(INS_MC, IMG.gateau,
        "La tarte que j'ai ___ \u00e9tait d\u00e9licieuse.",
        ["mang\u00e9e", "mang\u00e9", "mang\u00e9s", "mang\u00e9es"]),
      mc(INS_MC, IMG.tournesols,
        "Les fleurs que nous avons ___ \u00e9taient magnifiques.",
        ["cueillies", "cueilli", "cueillis", "cueillie"]),
      mc(INS_MC, IMG.cadeau,
        "Les cadeaux que j'ai ___ sont pour mes amis.",
        ["ouverts", "ouvert", "ouvertes", "ouverte"]),
      match("Associe chaque d\u00e9but de phrase \u00e0 la bonne forme du participe pass\u00e9.", IMG.peluches, [
        ["La voiture que j'ai (acheter)", "achet\u00e9e"],
        ["Les livres que nous avons (lire)", "lus"],
        ["Les lettres qu'elle a (\u00e9crire)", "\u00e9crites"],
        ["Les films que tu as (voir)", "vus"],
        ["La photo qu'ils ont (prendre)", "prise"],
      ]),
      match("Associe chaque compl\u00e9ment \u00e0 la bonne forme du participe pass\u00e9.", IMG.grandLivre, [
        ["Les histoires que j'ai (lire)", "lues"],
        ["Le livre que tu as (finir)", "fini"],
        ["Les mots que nous avons (apprendre)", "appris"],
        ["La le\u00e7on qu'elle a (comprendre)", "comprise"],
        ["Les pages que vous avez (\u00e9crire)", "\u00e9crites"],
      ]),
      gap("Compl\u00e8te avec le participe pass\u00e9 de \u00ab allumer \u00bb (accord avec \u00ab les bougies \u00bb).", IMG.corgiGateau,
        "Les bougies que nous avons {allum\u00e9es} \u00e9clairent le g\u00e2teau."),
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
    fs.writeFileSync(path.join(dir, `${col}.json`), JSON.stringify(docs, null, 2));
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
