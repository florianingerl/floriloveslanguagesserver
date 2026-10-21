// Inhalt der Multiple-Choice-Aufgaben zu "Elektromagnetische Wellen" (Fach
// "physics"), die aus den Fragen und Antworten des Chats hervorgegangen sind.
//
// Die Aufgaben sind auf Deutsch. Jede Aufgabe bekommt ein thematisch passendes
// Bild, das von Wikimedia Commons verlinkt wird.
//
// Dieses Modul wird vom Einfuege-Skript (add-physics-em-wave-exercises.ts)
// benutzt.

export type Option = { option: string; correct: boolean };

export type Frage = {
  // Der deutsche Fragetext.
  frage: string;
  // Die erste Option ist die richtige.
  optionen: string[];
  // An welcher Stelle (0..4) die richtige Option stehen soll.
  position: number;
  // Das Bild der Aufgabe (URL von Wikimedia Commons).
  bild: string;
};

export const INSTRUCTION = "Wähle die richtige Antwort.";

// Bilder (Wikimedia Commons). Alle URLs wurden ueber die Commons-API
// verifiziert (Datei existiert und ist abrufbar). Es werden die Original-
// Datei-URLs verwendet (kein Thumbnail-Suffix), damit sie stabil gueltig sind.
const BILD_WELLE =
  "https://upload.wikimedia.org/wikipedia/commons/9/99/EM-Wave.gif";
const BILD_HELMHOLTZ =
  "https://upload.wikimedia.org/wikipedia/commons/3/34/Helmholtz_solution.png";
const BILD_WELLE_BASIS =
  "https://upload.wikimedia.org/wikipedia/commons/a/ad/Electromagneticwave3Dfromside.gif";
const BILD_HOHLLEITER =
  "https://upload.wikimedia.org/wikipedia/commons/4/4a/Waveguide17-with-UBR120-flanges.svg";
const BILD_DISPERSION =
  "https://upload.wikimedia.org/wikipedia/commons/b/bd/Wave_group.gif";
const BILD_RECT_WAVEGUIDE =
  "https://upload.wikimedia.org/wikipedia/commons/0/00/Rectangular_waveguide_TE10_fields.gif";
const BILD_WELLENVEKTOR =
  "https://upload.wikimedia.org/wikipedia/commons/2/2c/Wave_diagram.svg";
const BILD_WELLENLAENGE =
  "https://upload.wikimedia.org/wikipedia/commons/9/9a/Plane_electromagnetic_wave.svg";
const BILD_GRENZFLaeCHE =
  "https://upload.wikimedia.org/wikipedia/commons/a/ab/Planewave_at_an_interface_0_degrees_TIR.gif";
const BILD_GAUSS =
  "https://upload.wikimedia.org/wikipedia/commons/3/32/Electric-flux-surface-example.svg";
const BILD_MAGNETFELD =
  "https://upload.wikimedia.org/wikipedia/commons/6/6d/B_boundary_conditions.png";
const BILD_D_NORMAL =
  "https://upload.wikimedia.org/wikipedia/commons/e/e5/D_boundary_condition.png";
const BILD_HOMOGEN =
  "https://upload.wikimedia.org/wikipedia/commons/4/4d/Isotropic_stress_noavg.svg";
const BILD_LINEAR =
  "https://upload.wikimedia.org/wikipedia/commons/9/9a/Plane_electromagnetic_wave.svg";
const BILD_ISOTROP =
  "https://upload.wikimedia.org/wikipedia/commons/a/a1/Monopole_radiation_pattern_0.25_wavelength.png";
const BILD_EIGENWERT =
  "https://upload.wikimedia.org/wikipedia/commons/4/46/Standing_wave.svg";
const BILD_RESONANZ =
  "https://upload.wikimedia.org/wikipedia/commons/a/af/Universal_Resonance_Curve.svg";
const BILD_POYNTING =
  "https://upload.wikimedia.org/wikipedia/commons/7/73/Poynting-Koax.svg";
const BILD_GRENZFREQUENZ =
  "https://upload.wikimedia.org/wikipedia/commons/a/a5/Evanescent_wave%2C_cropped%2C_square.png";
const BILD_MAGNETISCHE_WAND =
  "https://upload.wikimedia.org/wikipedia/commons/9/9c/Rectangular_waveguide_TE10_%28B_field%2C_side_view%29.png";
const BILD_BESSEL =
  "https://upload.wikimedia.org/wikipedia/commons/c/c1/BesselJ_plot.svg";
const BILD_ZYLINDERKOORDINATEN =
  "https://upload.wikimedia.org/wikipedia/commons/b/bf/Cylindrical_coordinates.svg";

// Die erste Option der Liste ist jeweils die richtige; sie wird beim Anlegen an
// die Stelle "position" verschoben, damit die Loesung nicht immer vorne steht.
export const FRAGEN: Frage[] = [
  // --- Helmholtzgleichung ---
  {
    frage:
      "Unter welchen Voraussetzungen gilt die Helmholtzgleichung?",
    optionen: [
      "Fuer ein lineares, homogenes, isotropes Medium und eine monochromatische Welle im quellenfreien Raum",
      "Fuer beliebige, auch zeitlich veraenderliche Felder",
      "Nur im Vakuum und nur fuer statische Felder",
      "Nur in leitenden Medien mit freien Ladungen",
    ],
    position: 1,
    bild: BILD_HELMHOLTZ,
  },
  {
    frage:
      "Gibt es eine eigene Helmholtzgleichung fuer TM-Wellen und eine andere fuer TE-Wellen?",
    optionen: [
      "Nein, es ist dieselbe Helmholtzgleichung; TM und TE unterscheiden sich nur in der Hilfsfunktion und den Randbedingungen",
      "Ja, fuer TM-Wellen gilt die Laplace-Gleichung, fuer TE-Wellen eine eigene Helmholtzgleichung",
      "Ja, TM-, TE- und TEM-Wellen haben jeweils vollkommen unabhaengige Wellengleichungen",
      "Nein, es gibt keine Helmholtzgleichung, sondern nur die Maxwell-Gleichungen",
    ],
    position: 0,
    bild: BILD_WELLE,
  },
  {
    frage:
      "Worauf reduziert sich die Helmholtzgleichung bei einer TEM-Welle?",
    optionen: [
      "Auf die Laplace-Gleichung (k_c = 0), da E_z = 0 und H_z = 0 ist",
      "Auf die Poisson-Gleichung mit der Quellendichte",
      "Auf die Wellengleichung mit einer festen Grenzfrequenz",
      "Sie bleibt unveraendert gueltig mit k_c ungleich 0",
    ],
    position: 0,
    bild: BILD_WELLE_BASIS,
  },
  {
    frage:
      "Warum kann ein hohler metallischer Wellenleiter keine TEM-Welle fuehren?",
    optionen: [
      "Weil fuer eine TEM-Welle mindestens zwei getrennte Leiter noetig sind, ein hohler Leiter aber nur einen bildet",
      "Weil in einem Hohlleiter ueberhaupt keine Wellen laufen koennen",
      "Weil TEM-Wellen nur im Vakuum existieren",
      "Weil die Wand des Hohlleiters kein Magnetfeld zulaesst",
    ],
    position: 0,
    bild: BILD_HOHLLEITER,
  },

  // --- Dispersionsrelation, m/n, k ---
  {
    frage:
      "Wie lautet die Dispersionsrelation eines Wellenleitermodus (Zusammenhang zwischen beta und omega)?",
    optionen: [
      "beta^2 = omega^2 * mu * epsilon - k_c^2",
      "beta = omega / c ohne jeden Zusatzterm",
      "beta^2 = omega^2 * mu * epsilon + k_c^2",
      "beta = k_c unabhaengig von omega",
    ],
    position: 0,
    bild: BILD_DISPERSION,
  },
  {
    frage:
      "Wie haengen die Modenindizes m und n mit der Ausbreitungskonstante beta zusammen?",
    optionen: [
      "Ueber k_c^2 = (m*pi/a)^2 + (n*pi/b)^2, das in beta^2 = omega^2*mu*epsilon - k_c^2 eingeht",
      "Ueber beta = m*n*omega",
      "m und n gehen gar nicht in beta ein",
      "Ueber k_c = m + n, unabhaengig von den Abmessungen",
    ],
    position: 0,
    bild: BILD_RECT_WAVEGUIDE,
  },
  {
    frage:
      "Wie haengt die Ausbreitungskonstante beta mit dem Betrag des Wellenvektors k zusammen?",
    optionen: [
      "Es gilt k^2 = beta^2 + k_c^2, beta ist die longitudinale Komponente",
      "Es gilt beta = k^2",
      "Es gilt k = beta - k_c",
      "Sie sind unabhaengig voneinander",
    ],
    position: 0,
    bild: BILD_WELLENVEKTOR,
  },
  {
    frage:
      "Wie haengt die Wellenzahl k mit der Wellenlaenge lambda zusammen?",
    optionen: [
      "k = 2*pi / lambda",
      "k = lambda / (2*pi)",
      "k = 2*pi*lambda",
      "k = 1 / lambda",
    ],
    position: 0,
    bild: BILD_WELLENLAENGE,
  },

  // --- Grenzbedingungen ---
  {
    frage:
      "Welche Tangentialkomponente(n) des Feldes sind an einer Grenzflaeche stetig?",
    optionen: [
      "Die Tangentialkomponente von E ist stets stetig; die von H ist stetig, wenn keine Flaechenstromdichte fliesst",
      "Nur die Tangentialkomponente von E ist stetig, die von H nie",
      "Nur die Normalkomponente von E ist stetig",
      "Keine der Tangentialkomponenten ist stetig",
    ],
    position: 0,
    bild: BILD_GRENZFLaeCHE,
  },
  {
    frage:
      "Wann ist die Normalkomponente der elektrischen Flussdichte D an einer Grenzflaeche stetig?",
    optionen: [
      "Nur wenn dort keine freie Oberflaechenladungsdichte sigma_f vorhanden ist",
      "Immer, ganz unabhaengig von Ladungen",
      "Nur an einem perfekten Leiter",
      "Nie, D springt an jeder Grenzflaeche",
    ],
    position: 0,
    bild: BILD_D_NORMAL,
  },
  {
    frage:
      "Warum fuehrt die Stetigkeit der Normalkomponente von B in der Wellenleiteranalyse zu keiner unabhaengigen Gleichung?",
    optionen: [
      "Weil sie durch die bereits geforderte Tangentialbedingung an die Wand automatisch erfuellt ist und keine neue Information liefert",
      "Weil die Normalkomponente von B an Wanden niemals stetig ist",
      "Weil B im Vakuum immer null ist",
      "Weil die Normalkomponente von B gar nicht existiert",
    ],
    position: 0,
    bild: BILD_MAGNETFELD,
  },

  // --- homogen / linear / isotrop (Frage 12 in 3 Fragen aufgeteilt) ---
  {
    frage: "Was bedeutet es, dass ein Material homogen ist?",
    optionen: [
      "Die Materialeigenschaften sind an jedem Ort gleich, es gibt keine Ortsabhaengigkeit",
      "Die Antwort des Materials ist proportional zur Feldstaerke",
      "Die Antwort ist unabhaengig von der Richtung des Feldes",
      "Das Material ist immer ein perfekter Leiter",
    ],
    position: 0,
    bild: BILD_HOMOGEN,
  },
  {
    frage: "Was bedeutet es, dass ein Material linear ist?",
    optionen: [
      "Die Antwort (z. B. P proportional zu E) ist proportional zur Feldstaerke, ohne Saettigung oder hoehere Terme",
      "Die Materialeigenschaften sind an jedem Ort gleich",
      "Die Antwort haengt nicht von der Richtung des Feldes ab",
      "Das Material leitet den Strom verlustfrei",
    ],
    position: 0,
    bild: BILD_LINEAR,
  },
  {
    frage: "Was bedeutet es, dass ein Material isotrop ist?",
    optionen: [
      "Die Antwort ist unabhaengig von der Richtung, epsilon und mu sind Skalare",
      "Die Materialeigenschaften sind ueberall gleich",
      "Die Antwort ist proportional zur Feldstaerke",
      "Das Material ist immer nichtleitend",
    ],
    position: 0,
    bild: BILD_ISOTROP,
  },

  // --- Eigenwertgleichung ---
  {
    frage: "Was ist eine Eigenwertgleichung?",
    optionen: [
      "Eine Gleichung der Form L*phi = lambda*phi, bei der nur diskrete lambda nichttriviale Loesungen zulassen",
      "Eine Gleichung, in der die Unbekannte quadratisch vorkommt",
      "Eine Gleichung ohne Randbedingungen",
      "Eine Gleichung, die nur fuer homogene Medien gilt",
    ],
    position: 0,
    bild: BILD_EIGENWERT,
  },
  {
    frage:
      "Welche Rolle spielt die Eigenwertgleichung bei Wellenleitern?",
    optionen: [
      "Ihre Eigenwerte sind die k_c^2 und damit die Grenzfrequenzen, ihre Eigenfunktionen die Modenprofile",
      "Sie bestimmt die Farbe des Lichts im Wellenleiter",
      "Sie ersetzt die Maxwell-Gleichungen vollstaendig",
      "Sie legt nur die Laenge des Wellenleiters fest",
    ],
    position: 0,
    bild: BILD_RECT_WAVEGUIDE,
  },

  // --- Grenzfrequenz / Resonanz (Frage 14 in mehrere Fragen aufgeteilt) ---
  {
    frage:
      "Wie berechnet man die Grenzfrequenz einer Mode im Rechteckhohlleiter?",
    optionen: [
      "f_c = (c / (2*pi*sqrt(epsilon_r*mu_r))) * sqrt((m*pi/a)^2 + (n*pi/b)^2)",
      "f_c = c / (2*(a+b))",
      "f_c = m*n*c / a",
      "f_c = 2*pi*c / (a*b)",
    ],
    position: 0,
    bild: BILD_GRENZFREQUENZ,
  },
  {
    frage:
      "Was passiert mit einer Mode, wenn die Frequenz unter ihrer Grenzfrequenz liegt?",
    optionen: [
      "Beta wird imaginaer, die Mode ist evaneszent und wird exponentiell gedaempft",
      "Die Mode breitet sich unveraendert weiter aus",
      "Die Mode wird zur TEM-Welle",
      "Die Amplitude waechst exponentiell an",
    ],
    position: 0,
    bild: BILD_DISPERSION,
  },
  {
    frage:
      "Ist die Grenzfrequenz einer Mode dasselbe wie die Halbleistungsfrequenz?",
    optionen: [
      "Nein, die Grenzfrequenz trennt Ausbreitung von Evaneszenz; die Halbleistungsfrequenz gehoert zur Resonanz eines Resonators",
      "Ja, beide Begriffe bezeichnen exakt dieselbe Frequenz",
      "Ja, aber nur im Vakuum",
      "Nein, die Grenzfrequenz ist immer doppelt so gross",
    ],
    position: 0,
    bild: BILD_RESONANZ,
  },
  {
    frage:
      "Wie bestimmt man die Leistung, aus der die Halbleistungsbandbreite eines Resonators folgt?",
    optionen: [
      "Durch Integration des zeitlich gemittelten Poynting-Vektors ueber die Flaeche",
      "Durch Differentiation der Feldstaerke nach der Zeit",
      "Durch Messung der Kapazitaet allein",
      "Durch Integration der Ladungsdichte ueber das Volumen",
    ],
    position: 0,
    bild: BILD_POYNTING,
  },

  // --- magnetische Wand, Ausbreitungsfaehigkeit, Besselfunktionen ---
  {
    frage: "Was ist eine magnetische Wand?",
    optionen: [
      "Eine ideale Grenzflaeche (PMC), an der die tangentiale H-Komponente verschwindet (n x H = 0)",
      "Eine Grenzflaeche, an der die tangentiale E-Komponente verschwindet",
      "Eine Wand aus ferromagnetischem Material, die das Feld verstaerkt",
      "Eine Wand, die nur im Vakuum definiert ist",
    ],
    position: 0,
    bild: BILD_MAGNETISCHE_WAND,
  },
  {
    frage:
      "Was bedeutet es, dass eine Mode ausbreitungsfaehig ist (verlustfreier Wellenleiter)?",
    optionen: [
      "Der Imaginaerteil von beta ist null, beta ist also reell (omega > omega_c)",
      "Der Realteil von beta ist null",
      "beta ist rein imaginaer",
      "beta ist unabhaengig von der Frequenz",
    ],
    position: 0,
    bild: BILD_WELLE,
  },
  {
    frage:
      "Wofuer verwendet man die Besselfunktionen bei elektromagnetischen Wellen?",
    optionen: [
      "Sie sind die radiale Eigenfunktion der Helmholtzgleichung in Zylinderkoordinaten, also die Modenprofile von Rundhohlleitern",
      "Sie beschreiben ausschliesslich statische Felder im Vakuum",
      "Sie ersetzen die Randbedingungen an der Metallwand",
      "Sie geben den Wellenwiderstand einer Koaxialleitung an",
    ],
    position: 0,
    bild: BILD_BESSEL,
  },
  {
    frage:
      "Wie legen die Besselfunktionen die Grenzfrequenzen im Rundhohlleiter fest?",
    optionen: [
      "Ueber die Nullstellen von J_n(x) fuer TM-Moden und von J'_n(x) fuer TE-Moden",
      "Ueber die Maxima von J_n(x) unabhaengig von der Mode",
      "Ueber die Polstellen der Neumann-Funktion Y_n(x)",
      "Sie haben keinen Einfluss auf die Grenzfrequenz",
    ],
    position: 0,
    bild: BILD_ZYLINDERKOORDINATEN,
  },
];

// Baut die Optionsliste: die erste Option der Frage ist die richtige und wird
// an die Stelle "position" gesetzt; die uebrigen bleiben in ihrer Reihenfolge.
export function options(f: Frage): Option[] {
  const richtige = f.optionen[0];
  const falsche = f.optionen.slice(1);
  const liste: Option[] = falsche.map((option) => ({ option, correct: false }));
  const pos = Math.max(0, Math.min(f.position, liste.length));
  liste.splice(pos, 0, { option: richtige, correct: true });
  return liste;
}
