// Legt das Physik-Quiz (Fach "physics", Sektion "Physik" der Hochschule) an:
//
//   1. ein Quiz-Dokument { website: "web", subject: "physics" },
//   2. je Thema ein Topic-Dokument mit dem Praefix "Hochschule Regensburg - "
//      und einem englischen HTML-Tutorial,
//   3. nur Multiple-Choice-Aufgaben (englisch) zu jedem Thema.
//      Als imageUrl bekommt jede Aufgabe ein zum Inhalt passendes Bild, das
//      auf Wikimedia Commons gefunden wurde.
//
// Die Themen und Aufgaben stammen aus den Vorlesungsnotizen
// "Script Physics I - Mechanics and Electromagnetism" (Deggendorf Institute of
// Technology, Prof. Simon Zabler), Kapitel 3 (Electromagnetism). Mechanik wird
// ignoriert.
//
// Der Lauf ist idempotent: Quiz und Themen werden wiederverwendet, Aufgaben nur
// angelegt, wenn es noch keine mit derselben Frage im Fach gibt.
//
// Vor dem Schreiben werden quizzes, topics und exercises als EJSON gesichert.
//
// Aufruf auf dem Server (dort ist die Datenbank erreichbar):
//   node scripts/add-physics-electromagnetism.cjs --dry-run
//   node scripts/add-physics-electromagnetism.cjs

const { MongoClient } = require("mongodb");
const { EJSON } = require("bson");
const fs = require("fs");
const path = require("path");

const URL = process.env.MONGODB_URL ?? "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/";

const DATA = {
  "prefix": "Hochschule Regensburg - ",
  "subject": "physics",
  "quizName": "Physics",
  "instruction": "Choose the correct answer.",
  "topics": [
    {
      "title": "Elementary charges: Electrons, Positrons and Ions",
      "tutorial": "<h2>Elementary charges: Electrons, Positrons and Ions</h2>\n<p>Electrons are elementary particles: they cannot be split into sub-particles. Each electron carries the negative elementary charge \u2212e, a mass of about 511 keV/c\u00b2 and spin 1/2, which makes it a fermion.</p>\n<p>The elementary charge is e = 1.602 \u00d7 10<sup>\u221219</sup> C.</p>\n<p>Protons and neutrons are built from quarks: the up quark (u) carries +2/3 e and the down quark (d) carries \u22121/3 e. A proton (uud) therefore has the charge +1 e, while a neutron (udd) is neutral.</p>\n<p>The antiparticle of the electron is the positron, which carries the charge +e. Atoms or molecules with a net charge are called ions. Same charges repel, opposite charges attract. Charge is never created or destroyed and never exists without mass.</p>\n<p>Electric current is the transport of free charge: I = dQ/dt.</p>",
      "exercises": [
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/3/3d/PET-MIPS-anim.gif",
          "question": "Which particle is the antiparticle of the electron and carries the charge +e?",
          "options": [
            "Positron",
            "Proton",
            "Neutron",
            "Down quark"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Quark.svg/1280px-Quark.svg.png",
          "question": "Which electric charge does an up quark carry?",
          "options": [
            "+2/3 e",
            "\u22121/3 e",
            "+1 e",
            "0"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Proton_quark_structure.svg/1280px-Proton_quark_structure.svg.png",
          "question": "A proton is made of which combination of quarks?",
          "options": [
            "uud",
            "udd",
            "uuu",
            "ddd"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Electron_shell_037_Rubidium.svg/1280px-Electron_shell_037_Rubidium.svg.png",
          "question": "What is the value of the elementary charge e?",
          "options": [
            "1.602 \u00d7 10\u207b\u00b9\u2079 C",
            "9.109 \u00d7 10\u207b\u00b3\u00b9 C",
            "6.626 \u00d7 10\u207b\u00b3\u2074 J\u00b7s",
            "8.854 \u00d7 10\u207b\u00b9\u00b2 F/m"
          ]
        }
      ]
    },
    {
      "title": "From the electric field to electric potential",
      "tutorial": "<h2>From the electric field to electric potential</h2>\n<p>The electric (Coulomb) force is conservative: the work done on a test charge between two points depends only on the start and end points, not on the path.</p>\n<p>The electric potential \u03c6 is defined so that the electric field is its negative gradient (E = \u2212grad \u03c6). The difference in potential between two points is the voltage U = \u03c6\u2081 \u2212 \u03c6\u2082.</p>\n<p>Moving a charge q through a voltage U changes its potential energy by E<sub>pot</sub> = qU.</p>\n<p>Charges generate electric fields. The electric flux through a closed surface equals the enclosed charge divided by \u03b5\u2080 (Gauss's law), or div E = \u03c1/\u03b5\u2080 in differential form. Electric field lines always point away from positive charges and towards negative charges.</p>",
      "exercises": [
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/VFPt_metal_balls_largesmall_potential.svg/1280px-VFPt_metal_balls_largesmall_potential.svg.png",
          "question": "Because the electric force is conservative, the work done on a charge between two points depends on...",
          "options": [
            "only the start and end points, not the path",
            "the path taken",
            "the speed of the charge",
            "the sign of the charge only"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Fluke_175_measuring_AC_voltage.jpg/1280px-Fluke_175_measuring_AC_voltage.jpg",
          "question": "What is the change in potential energy when a charge q moves through a voltage U?",
          "options": [
            "qU",
            "q/U",
            "U/q",
            "qU\u00b2"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Gauss_Sphere_Charge_Inside_2.svg/1280px-Gauss_Sphere_Charge_Inside_2.svg.png",
          "question": "Gauss's law states that the electric flux through a closed surface equals...",
          "options": [
            "the enclosed charge divided by \u03b5\u2080",
            "the enclosed charge times \u03b5\u2080",
            "always zero",
            "the electric field times the area"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/a/a2/Electric_field_lines_demonstration2.jpg",
          "question": "Electric field lines always point away from...",
          "options": [
            "positive charges",
            "negative charges",
            "neutral atoms",
            "the ground"
          ]
        }
      ]
    },
    {
      "title": "Poisson's law: Electric Mono-, Di- and Quadrupoles",
      "tutorial": "<h2>Poisson's law: Electric Mono-, Di- and Quadrupoles</h2>\n<p>Inserting E = \u2212grad \u03c6 into Gauss's law gives Poisson's law, which allows us to compute the potential for any charge distribution.</p>\n<p>Far away from a charge distribution the potential is approximated by a multipole expansion:</p>\n<ul>\n<li>the monopole term Q/r (a point charge),</li>\n<li>the dipole term with the dipole moment p = Q\u00b7d,</li>\n<li>the quadrupole term (two adjacent dipoles of opposite sign).</li>\n</ul>\n<p>An electric dipole has a net charge of zero; in its central plane the potential is zero. The quadrupole also has net charge zero. Atomic dipoles and quadrupoles are important for the bonds that form solids.</p>",
      "exercises": [
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Monopole_antenna_end_effect.svg/1280px-Monopole_antenna_end_effect.svg.png",
          "question": "In the multipole expansion the first term (proportional to 1/r) describes the...",
          "options": [
            "electric monopole",
            "electric dipole",
            "electric quadrupole",
            "magnetic monopole"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Electric_dipole_moment_definition.svg/1280px-Electric_dipole_moment_definition.svg.png",
          "question": "The electric dipole moment p is defined as...",
          "options": [
            "p = Q\u00b7d (charge times distance vector)",
            "p = Q/d",
            "p = Q\u00b7U",
            "p = q\u00b7E"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5e/QuadrupoleContour.svg/1280px-QuadrupoleContour.svg.png",
          "question": "What is the net charge of an electric quadrupole?",
          "options": [
            "zero",
            "+2e",
            "+e",
            "\u22122e"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Electric-dipole-field-lines-and-equipotential-lines.svg/1280px-Electric-dipole-field-lines-and-equipotential-lines.svg.png",
          "question": "In the central plane of an electric dipole (\u03b8 = 90\u00b0) the potential is...",
          "options": [
            "zero",
            "maximal",
            "infinite",
            "equal to the monopole term"
          ]
        }
      ]
    },
    {
      "title": "Capacitors and polarization",
      "tutorial": "<h2>Capacitors and polarization</h2>\n<p>A capacitor consists of two electrodes. The stored charge is proportional to the applied voltage: Q = C\u00b7U, where C is the capacitance in Farad (F). For a parallel-plate capacitor C = \u03b5\u2080\u00b7A/d.</p>\n<p>Capacitors in parallel add up (C = \u03a3C<sub>i</sub>); for capacitors in series 1/C = \u03a31/C<sub>i</sub>. The stored energy is E = \u00bd\u00b7Q\u00b2/C = \u00bd\u00b7C\u00b7U\u00b2.</p>\n<p>A dielectric (an insulator) placed between the plates is polarized: its microscopic dipoles align with the field and reduce the field by the relative permittivity \u03b5<sub>r</sub>. The capacitance increases by the factor \u03b5<sub>r</sub>. The displacement field D = \u03b5\u2080\u00b7E + P describes the free charges via div D = \u03c1<sub>free</sub>.</p>",
      "exercises": [
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Parallel_plate_capacitor_cs.svg/1280px-Parallel_plate_capacitor_cs.svg.png",
          "question": "Which formula gives the capacitance of a parallel-plate capacitor?",
          "options": [
            "C = \u03b5\u2080\u00b7A/d",
            "C = \u03b5\u2080\u00b7d/A",
            "C = \u03b5\u2080\u00b7A\u00b7d",
            "C = A/(\u03b5\u2080\u00b7d)"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/a/af/Parallel_series_capacitors.png",
          "question": "How do the capacitances combine for capacitors connected in parallel?",
          "options": [
            "C = \u03a3C\u1d62",
            "1/C = \u03a31/C\u1d62",
            "C = 0",
            "C is the smallest capacitance"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/0/07/JVC_MX-J950R_-_power_module-1112_%28cropped%29_-_Elna_Silmic_electrolytic_capacitors.jpg",
          "question": "How much energy is stored in a charged capacitor?",
          "options": [
            "E = \u00bd\u00b7C\u00b7U\u00b2",
            "E = C\u00b7U",
            "E = C\u00b7U\u00b2",
            "E = 2\u00b7C\u00b7U"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/9/96/Dipole_polarization.JPG",
          "question": "A dielectric placed between the plates of a capacitor...",
          "options": [
            "increases the capacitance by the factor \u03b5\u1d63",
            "decreases the capacitance",
            "has no effect on the capacitance",
            "makes the capacitor a conductor"
          ]
        }
      ]
    },
    {
      "title": "Confined motion in metallic conductors: Electric current",
      "tutorial": "<h2>Confined motion in metallic conductors: Electric current</h2>\n<p>Electric current is the net transport of charge: I = dQ/dt. By convention it is positive in the direction of positive charge transport, i.e. from plus to minus.</p>\n<p>The current density is j = I/A. Microscopically j = n\u00b7q\u00b7v<sub>D</sub>, where n is the number density of charge carriers and v<sub>D</sub> the drift speed.</p>\n<p>In metals the carriers are free electrons; in electrolytes ions carry the current. The electrons move very fast and erratically and collide frequently with the lattice. Between collisions they gain a small average drift speed v<sub>D</sub> = a\u00b7\u03c4.</p>\n<p>Charge can only enter or leave a volume through a current (continuity equation): div j = \u2212\u2202\u03c1/\u2202t.</p>",
      "exercises": [
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/3/3c/Le_courant_%C3%A9lectrique.jpg",
          "question": "Electric current is defined as...",
          "options": [
            "I = dQ/dt",
            "I = Q\u00b7t",
            "I = U\u00b7R",
            "I = q\u00b7E"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Direct_current_symbol.svg/1280px-Direct_current_symbol.svg.png",
          "question": "In which direction is the (technical) electric current defined?",
          "options": [
            "from plus to minus (direction of positive charge transport)",
            "from minus to plus",
            "always opposite to the electric field",
            "randomly, with no preferred direction"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Current_density.svg/1280px-Current_density.svg.png",
          "question": "The current density j is given microscopically by...",
          "options": [
            "j = n\u00b7q\u00b7v\u1d05",
            "j = I\u00b7A",
            "j = q\u00b7E",
            "j = U/R"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/2/21/Drift_velocity_of_electrons.jpg",
          "question": "How does the drift speed of electrons compare to their random thermal speed?",
          "options": [
            "much smaller",
            "equal",
            "much larger",
            "exactly zero"
          ]
        }
      ]
    },
    {
      "title": "Electrical resistance and conductance: Ohm's law",
      "tutorial": "<h2>Electrical resistance and conductance: Ohm's law</h2>\n<p>The current density is proportional to the electric field: j = \u03c3\u00b7E (Ohm's law). The conductance is \u03c3 = n\u00b7q\u00b2\u00b7\u03c4/m, and the mobility u = \u03c3/(n\u00b7q) with v<sub>D</sub> = u\u00b7E.</p>\n<p>For a homogeneous wire of cross-section A and length L: I = \u03c3\u00b7A/L\u00b7U, i.e. U = R\u00b7I with the resistance R = \u03c1<sub>s</sub>\u00b7L/A, where \u03c1<sub>s</sub> = 1/\u03c3 is the specific resistance.</p>\n<p>Resistors in series add up (R = \u03a3R<sub>k</sub>); for a parallel circuit 1/R = \u03a31/R<sub>k</sub>.</p>\n<p>Kirchhoff's laws: the sum of the currents at a junction is zero (knot rule), and in a closed circuit the source voltage equals the sum of the voltages across all components. For a metal, a rising temperature shortens the collision time \u03c4 and therefore reduces the conductance.</p>",
      "exercises": [
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/b/bf/Lei_de_ohm_-_Ohm%27s_law.jpg",
          "question": "Ohm's law in its common form is...",
          "options": [
            "U = R\u00b7I",
            "U = I/R",
            "U = R/I",
            "U = R\u00b7I\u00b2"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f9/Resistance_Box_%282%29.jpg/1280px-Resistance_Box_%282%29.jpg",
          "question": "The resistance of a homogeneous wire is...",
          "options": [
            "R = \u03c1\u209b\u00b7L/A",
            "R = \u03c1\u209b\u00b7A/L",
            "R = L/(\u03c1\u209b\u00b7A)",
            "R = \u03c1\u209b\u00b7A\u00b7L"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/11/Resistors_in_series.svg/1280px-Resistors_in_series.svg.png",
          "question": "For resistors connected in series the total resistance is...",
          "options": [
            "the sum R = \u03a3R\u2096",
            "1/R = \u03a31/R\u2096",
            "the smallest resistance",
            "the product of the resistances"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/8/88/Room_temperature_electrical_resistivity_of_various_materials.jpg",
          "question": "How does the conductance of a metal change when the temperature rises?",
          "options": [
            "it decreases, because collisions shorten \u03c4",
            "it increases",
            "it stays constant",
            "it becomes zero"
          ]
        }
      ]
    },
    {
      "title": "Electric power and Joule heating",
      "tutorial": "<h2>Electric power and Joule heating</h2>\n<p>Transferring a charge Q across a voltage U requires the work W = Q\u00b7U. With a constant current this gives the electric power P = dW/dt = U\u00b7I, which can also be written as P = U\u00b2/R.</p>\n<p>In a series circuit (constant current) the largest resistance dissipates the most heat; in a parallel circuit (constant voltage) the smallest resistance carries the largest current and heats up the most.</p>\n<p>The work that is not converted into another form is given off as Joule heat in the components and wires. A measuring device should hardly influence the measured quantity: an ammeter is connected in series and has a low inner resistance, whereas a voltmeter is connected in parallel and has a high inner resistance.</p>",
      "exercises": [
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Rostock_Power_Station%2C_SW_view.jpg/1280px-Rostock_Power_Station%2C_SW_view.jpg",
          "question": "The electric power is given by...",
          "options": [
            "P = U\u00b7I",
            "P = U/I",
            "P = I/U",
            "P = U\u00b7I\u00b2"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Toaster-quartz_element.JPG/1280px-Toaster-quartz_element.JPG",
          "question": "In a series circuit with a constant current, which resistor dissipates the most heat?",
          "options": [
            "the largest resistance",
            "the smallest resistance",
            "all of them the same",
            "none of them"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/f/f6/Electric_potential_energy_3_charge.gif",
          "question": "The work needed to move a charge Q across a voltage U is...",
          "options": [
            "W = Q\u00b7U",
            "W = Q/U",
            "W = U/Q",
            "W = Q\u00b2\u00b7U"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Zero-Center_Ammeter.JPG/1280px-Zero-Center_Ammeter.JPG",
          "question": "How is an ammeter connected, and what inner resistance does it have?",
          "options": [
            "in series, with a low inner resistance",
            "in parallel, with a low inner resistance",
            "in series, with a high inner resistance",
            "in parallel, with a high inner resistance"
          ]
        }
      ]
    },
    {
      "title": "Confined motion in semiconductors: Electron and hole currents",
      "tutorial": "<h2>Confined motion in semiconductors: Electron and hole currents</h2>\n<p>At absolute zero (T = 0 K) a semiconductor is an insulator: the valence band is filled with bound electrons and the conductance band is empty. The two bands are separated by a small energy gap E<sub>g</sub> of the order of a few eV.</p>\n<p>With rising temperature, thermal fluctuations let electrons jump into the conductance band. The vacancies they leave behind in the valence band behave like mobile positive carriers and are called holes.</p>\n<p>The total current density is j = (n<sub>e</sub>\u00b7u<sub>e</sub> + n<sub>h</sub>\u00b7u<sub>h</sub>)\u00b7q\u00b7E. Doping silicon with donors creates n-type material (electrons dominate), with acceptors p-type material (holes dominate).</p>\n<p>A p-n junction is a diode: it conducts in one direction only once the applied voltage exceeds the knee voltage (about 0.7 V for silicon). The MOSFET uses a gate voltage to control the current between source and drain and is the basic building block of CPUs.</p>",
      "exercises": [
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/4/45/Semiconductor_outlines.jpg",
          "question": "At which temperature is a semiconductor an insulator?",
          "options": [
            "at absolute zero (T = 0 K)",
            "at room temperature",
            "above the Curie temperature",
            "only when it is doped"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Electron-hole-tr.svg/1280px-Electron-hole-tr.svg.png",
          "question": "What are the two charge carriers in a semiconductor?",
          "options": [
            "electrons and holes",
            "protons and neutrons",
            "ions and positrons",
            "electrons and photons"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/58/Silicon_doping_-_Type_P_and_N.svg/1280px-Silicon_doping_-_Type_P_and_N.svg.png",
          "question": "Doping silicon with donors creates which type of semiconductor?",
          "options": [
            "n-type",
            "p-type",
            "an insulator",
            "a superconductor"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ce/EFD108_Point_Contact_Germanium_Diode.jpg/1280px-EFD108_Point_Contact_Germanium_Diode.jpg",
          "question": "What is the knee voltage of a silicon diode?",
          "options": [
            "about 0.7 V",
            "about 0.07 V",
            "about 7 V",
            "about 50 V"
          ]
        }
      ]
    },
    {
      "title": "Magnetic dipoles and loop currents",
      "tutorial": "<h2>Magnetic dipoles and loop currents</h2>\n<p>Moving electric charges, i.e. electric currents, create magnetic fields. There are no magnetic charges (monopoles), only magnetic dipoles.</p>\n<p>Magnetic field lines converge at the poles, are closed curves, never intersect, and their density is proportional to the field strength. The unit of the magnetic field is the Tesla (T).</p>\n<p>Earth's horizontal field is about 20 \u00b5T; its magnetic south pole lies near the geographic north pole. The field is generated by the geodynamo (molten iron and nickel in the outer core) and protects the atmosphere from the solar wind; auroras occur above the poles.</p>\n<p>At distance r from a long straight wire carrying a current I the field is B = \u00b5\u2080\u00b7I/(2\u03c0r) (right-hand rule). Inside a long coil (solenoid) with n turns per metre the field on the axis is B = \u00b5\u2080\u00b7n\u00b7I.</p>",
      "exercises": [
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/VFPt_cylindermagnet_field-representations.svg/1280px-VFPt_cylindermagnet_field-representations.svg.png",
          "question": "What is the origin of magnetic fields?",
          "options": [
            "moving electric charges (currents)",
            "static electric charges",
            "magnetic monopoles",
            "neutral masses"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/VFPt_cylindrical_magnet_thumb.svg/1280px-VFPt_cylindrical_magnet_thumb.svg.png",
          "question": "Which statement about magnetic field lines is correct?",
          "options": [
            "they are closed loops that never intersect",
            "they start and end on magnetic charges",
            "they intersect at the poles",
            "they are always straight lines"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Magnetic_field_of_wire_loop.svg/1280px-Magnetic_field_of_wire_loop.svg.png",
          "question": "What is the magnetic field at distance r from a long straight wire carrying a current I?",
          "options": [
            "B = \u00b5\u2080\u00b7I/(2\u03c0r)",
            "B = \u00b5\u2080\u00b7I/(4\u03c0r\u00b2)",
            "B = \u00b5\u2080\u00b7I\u00b7r",
            "B = 2\u03c0r/(\u00b5\u2080\u00b7I)"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/4/45/Solenoid-1.png",
          "question": "On the axis of a long solenoid with n turns per metre, the magnetic field is...",
          "options": [
            "B = \u00b5\u2080\u00b7n\u00b7I",
            "B = \u00b5\u2080\u00b7I/n",
            "B = \u00b5\u2080\u00b7n\u00b2\u00b7I",
            "B = n\u00b7I/\u00b5\u2080"
          ]
        }
      ]
    },
    {
      "title": "From magnetic flux to Amp\u00e8re's law",
      "tutorial": "<h2>From magnetic flux to Amp\u00e8re's law</h2>\n<p>Because magnetic field lines are closed loops, the magnetic flux through any closed surface is zero: div B = 0. Hence there are no magnetic monopoles.</p>\n<p>Amp\u00e8re's law states that the line integral of B around a closed path equals \u00b5\u2080 times the current enclosed; in differential form rot B = \u00b5\u2080\u00b7j. A magnetic vector potential A can be defined by B = rot A (Coulomb gauge div A = 0), which leads to the law of Biot-Savart for the field of a current distribution.</p>\n<p>The field at the centre of a circular loop of radius R is B = \u00b5\u2080\u00b7I/(2R). Two parallel coils whose distance equals their radius are called Helmholtz coils; they produce a very homogeneous magnetic field.</p>",
      "exercises": [
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Magnetic_flux_diagram.svg/1280px-Magnetic_flux_diagram.svg.png",
          "question": "What is the magnetic flux through any closed surface?",
          "options": [
            "zero",
            "the enclosed charge divided by \u03b5\u2080",
            "\u00b5\u2080 times the enclosed current",
            "infinite"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1c/Basic_integrals_Ampere%27s_law.svg/1280px-Basic_integrals_Ampere%27s_law.svg.png",
          "question": "Amp\u00e8re's law relates the line integral of B around a closed path to...",
          "options": [
            "the current enclosed by the path",
            "the magnetic charge",
            "the electric flux",
            "the voltage"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/a/a5/Vortex_filament_%28Biot-Savart_law_illustration%29.png",
          "question": "The law of Biot-Savart gives...",
          "options": [
            "the magnetic field of a current distribution",
            "the electric field of a point charge",
            "the force between two masses",
            "the capacitance of a capacitor"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Helmholtz_coils.png/1280px-Helmholtz_coils.png",
          "question": "Helmholtz coils (distance equal to radius) are used to produce...",
          "options": [
            "a very homogeneous magnetic field",
            "a very strong electric field",
            "a zero magnetic field",
            "an alternating current"
          ]
        }
      ]
    },
    {
      "title": "Free motion of test charges in the magnetic force field",
      "tutorial": "<h2>Free motion of test charges in the magnetic force field</h2>\n<p>The Lorentz force on a charge q moving with velocity v in a magnetic field B is F = q\u00b7(v \u00d7 B). It acts perpendicular to both v and B.</p>\n<p>Three textbook cases: a current-carrying wire in a perpendicular field is deflected; two parallel wires attract each other when the currents flow in the same direction and repel when they are anti-parallel (F/L = \u00b5\u2080\u00b7I\u2081\u00b7I\u2082/(2\u03c0R)); a free charge entering a field perpendicular to its velocity moves on a circular path, with the Lorentz force acting as the centripetal force.</p>\n<p>Hall effect: in a thin plate of thickness d the magnetic force pushes the charge carriers sideways and builds up a transverse voltage U<sub>H</sub> = I\u00b7B/(e\u00b7d\u00b7n). Since n is in the denominator, materials with few carriers (semiconductors) give a larger Hall voltage.</p>",
      "exercises": [
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Lorentz_force_on_charged_particles_in_bubble_chamber_-_HD.6D.635_%2812000265314%29.svg/1280px-Lorentz_force_on_charged_particles_in_bubble_chamber_-_HD.6D.635_%2812000265314%29.svg.png",
          "question": "The Lorentz force on a charge q moving with velocity v in a magnetic field B is...",
          "options": [
            "F = q\u00b7(v \u00d7 B)",
            "F = q\u00b7(v \u00b7 B)",
            "F = q\u00b7B/v",
            "F = q\u00b7v\u00b7B\u00b2"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/5/51/Openstax_college-physics_22.42_parallel-wires-force.jpg",
          "question": "Two parallel wires carrying currents in the same direction...",
          "options": [
            "attract each other",
            "repel each other",
            "feel no force",
            "rotate around each other"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a9/Cyclotron_motion.jpg/1280px-Cyclotron_motion.jpg",
          "question": "A free charge entering a homogeneous magnetic field perpendicular to its velocity moves on...",
          "options": [
            "a circular path",
            "a straight line",
            "a parabola",
            "a random walk"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/0/01/Hall_effect.png",
          "question": "The Hall voltage increases when the charge number density n...",
          "options": [
            "decreases",
            "increases",
            "stays constant",
            "becomes infinite"
          ]
        }
      ]
    },
    {
      "title": "Magnetization of magnetic materials",
      "tutorial": "<h2>Magnetization of magnetic materials</h2>\n<p>Magnetization M is the average magnetic dipole moment per volume. The magnetic dipole moment of a current loop is p<sub>m</sub> = I\u00b7A. Bohr's magneton \u00b5<sub>B</sub> = e\u0127/(2m<sub>e</sub>) is the smallest atomic magnetic dipole moment.</p>\n<p>The field inside a material is B = \u00b5\u2080\u00b7(H + M) = \u00b5\u2080\u00b7\u00b5\u00b7H, with the magnetic susceptibility \u03c7 = \u00b5 \u2212 1.</p>\n<p>Four types of materials: diamagnets (\u03c7 &lt; 0, weakly repelled; superconductors are ideal diamagnets), paramagnets (\u03c7 &gt; 0, weakly attracted), ferromagnets (strongly attracted, they form magnetic domains) and antiferromagnets (net magnetization zero).</p>\n<p>Ferromagnets can keep a remanent magnetization and are used as permanent magnets (soft and hard magnets differ in their coercive field and remanence). Above the Curie temperature a ferromagnet loses its permanent magnetization but stays paramagnetic.</p>",
      "exercises": [
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/1/11/Magnetic_dipole_in_uniform_magnetic_field.jpg",
          "question": "The magnetic dipole moment of a current loop is...",
          "options": [
            "p\u2098 = I\u00b7A",
            "p\u2098 = I/A",
            "p\u2098 = I\u00b7A\u00b2",
            "p\u2098 = q\u00b7A"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Diamagnetism_levitation_simple_experiment.jpg/1280px-Diamagnetism_levitation_simple_experiment.jpg",
          "question": "Which materials are weakly repelled by a magnetic field (\u03c7 &lt; 0)?",
          "options": [
            "diamagnets",
            "paramagnets",
            "ferromagnets",
            "antiferromagnets"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/9/9e/Diagram_of_Ferromagnetic_Magnetic_Moments.png",
          "question": "Above the Curie temperature a ferromagnet...",
          "options": [
            "loses its permanent magnetization but stays paramagnetic",
            "becomes a superconductor",
            "becomes diamagnetic",
            "melts"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Magnetic_dipole_moment_current.png/1280px-Magnetic_dipole_moment_current.png",
          "question": "Bohr's magneton \u00b5\u1d07 is the smallest unit of...",
          "options": [
            "the atomic magnetic dipole moment",
            "electric charge",
            "the electric dipole moment",
            "mass"
          ]
        }
      ]
    },
    {
      "title": "Faraday's law of magnetic induction",
      "tutorial": "<h2>Faraday's law of magnetic induction</h2>\n<p>A time-dependent magnetic field induces a voltage in a coil: U<sub>ind</sub> = \u2212d\u03a6<sub>m</sub>/dt, where \u03a6<sub>m</sub> is the magnetic flux through the coil. This is Faraday's law of magnetic induction.</p>\n<p>Rotating a coil in a magnetic field therefore generates an AC voltage: this is the principle of the electric generator. The induced voltage is caused by a time-dependent electric vortex field (non-conservative): rot E = \u2212dB/dt.</p>\n<p>Lenz's law: the currents, fields and forces created by induction always oppose the change that produces them. Self-induction, i.e. a changing current through a coil inducing a voltage in the same coil, is a special case of this.</p>",
      "exercises": [
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/1/1c/Induction_experiment.png",
          "question": "Faraday's law states that the induced voltage equals...",
          "options": [
            "the negative time derivative of the magnetic flux",
            "the magnetic flux itself",
            "the current times the resistance",
            "the electric field"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/7/72/Electromagnetic_induction_-_solenoid_to_loop_-_animation.gif",
          "question": "A magnetic field that changes over time generates...",
          "options": [
            "an electric vortex (non-conservative) field",
            "a static electric field",
            "a magnetic monopole",
            "nothing at all"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/e/e4/Lenz_law_demonstration.png",
          "question": "Lenz's law states that the induced current is directed such that it...",
          "options": [
            "opposes the change that produces it",
            "supports the change",
            "has no effect",
            "increases the magnetic flux"
          ]
        },
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/9/96/Electric-generator-animation.gif",
          "question": "Rotating a coil in a magnetic field is the principle of...",
          "options": [
            "an electric generator",
            "a capacitor",
            "a battery",
            "a transformer core"
          ]
        }
      ]
    },
    {
      "title": "Inductance and Capacitance in electric AC-circuits",
      "tutorial": "<h2>Inductance and Capacitance in electric AC-circuits</h2>\n<p>In a coil a changing current induces a voltage that opposes the change (self-induction). The magnetic flux is proportional to the current: \u03a6<sub>m</sub> = L\u00b7I, where L is the inductance in Henry (H). The induced voltage is U<sub>ind</sub> = \u2212L\u00b7dI/dt.</p>\n<p>For a solenoid with n turns per metre and inner volume V the inductance is L = \u00b5\u2080\u00b7n\u00b2\u00b7V.</p>\n<p>Maxwell introduced the displacement current j<sub>D</sub> = \u03b5\u2080\u00b7\u2202E/\u2202t to explain how AC current flows across the electrodes of a capacitor, where no charge crosses the gap. Including it, Amp\u00e8re's law reads rot H = j + \u2202D/\u2202t. This shows that magnetic fields are generated not only by electric currents but also by time-dependent electric fields: the basis of electromagnetic waves.</p>",
      "exercises": [
        {
          "image": "https://upload.wikimedia.org/wikipedia/commons/0/06/Toroidal_inductor_modified.jpg",
          "question": "The inductance L relates the magnetic flux to the current as...",
          "options": [
            "\u03a6\u2098 = L\u00b7I",
            "\u03a6\u2098 = L/I",
            "\u03a6\u2098 = L\u00b7I\u00b2",
            "\u03a6\u2098 = I/L"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Tank_coil_inductor.agr.jpg/1280px-Tank_coil_inductor.agr.jpg",
          "question": "What is the unit of inductance?",
          "options": [
            "the Henry (H)",
            "the Tesla (T)",
            "the Farad (F)",
            "the Ohm (\u03a9)"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Displacement_current_in_capacitor.svg/1280px-Displacement_current_in_capacitor.svg.png",
          "question": "The displacement current was introduced to explain...",
          "options": [
            "how AC current flows across a capacitor",
            "how resistors heat up",
            "how magnets repel each other",
            "how light is refracted"
          ]
        },
        {
          "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/VFPt_cylindrical_coil_real.svg/1280px-VFPt_cylindrical_coil_real.svg.png",
          "question": "The inductance of a solenoid with n turns per metre and volume V is...",
          "options": [
            "L = \u00b5\u2080\u00b7n\u00b2\u00b7V",
            "L = \u00b5\u2080\u00b7n\u00b7V",
            "L = \u00b5\u2080\u00b7V/n\u00b2",
            "L = n\u00b2\u00b7V/\u00b5\u2080"
          ]
        }
      ]
    }
  ]
};

const SUBJECT = DATA.subject;
const PREFIX = DATA.prefix;
const INSTRUCTION = DATA.instruction;

const dryRun = process.argv.includes("--dry-run");

function options(liste) {
  return liste.map((option, i) => ({ option, correct: i === 0 }));
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

  const quizzes = db.collection("quizzes");
  let quiz = await quizzes.findOne({ website: "web", subject: SUBJECT });
  if (quiz) {
    console.log(`Quiz "${SUBJECT}" vorhanden: ${quiz._id}`);
  } else if (dryRun) {
    console.log(`Quiz "${SUBJECT}" wuerde angelegt (website="web").`);
  } else {
    const res = await quizzes.insertOne({
      website: "web",
      subject: SUBJECT,
      name: DATA.quizName,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`Quiz "${SUBJECT}" angelegt: ${res.insertedId}`);
    quiz = await quizzes.findOne({ _id: res.insertedId });
  }
  const quizId = quiz ? quiz._id : null;

  const topics = db.collection("topics");
  const exercises = db.collection("exercises");

  let themenAngelegt = 0;
  let aufgabenAngelegt = 0;
  let aufgabenUebersprungen = 0;

  for (const t of DATA.topics) {
    const title = PREFIX + t.title;
    let topic = await topics.findOne({ subject: SUBJECT, title });
    if (topic) {
      console.log(`Thema vorhanden: ${title}`);
      if (!dryRun) {
        await topics.updateOne(
          { _id: topic._id },
          { $set: { tutorial: t.tutorial, quiz: quizId, updatedAt: new Date() } },
        );
      }
    } else if (dryRun) {
      console.log(`Thema wuerde angelegt: ${title}`);
      themenAngelegt++;
    } else {
      const res = await topics.insertOne({
        subject: SUBJECT,
        title,
        tutorial: t.tutorial,
        quiz: quizId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      topic = await topics.findOne({ _id: res.insertedId });
      console.log(`Thema angelegt: ${title} (${res.insertedId})`);
      themenAngelegt++;
    }
    const topicId = topic ? topic._id : null;

    for (const ex of t.exercises) {
      const vorhanden = await exercises.findOne({ subject: SUBJECT, question: ex.question });
      if (vorhanden) {
        aufgabenUebersprungen++;
        continue;
      }
      if (dryRun) {
        aufgabenAngelegt++;
        continue;
      }
      const optionen = options(ex.options);
      await exercises.insertOne({
        quiz: quizId,
        subject: SUBJECT,
        type: "multipleChoice",
        imageUrl: ex.image,
        topic: topicId,
        instruction: INSTRUCTION,
        question: ex.question,
        options: optionen,
        // Damit die Optionen auch in englischer/franzoesischer
        // Oberflaechensprache angezeigt werden (die Inhalte sind englisch).
        optionsEn: options(ex.options),
        optionsFr: options(ex.options),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      aufgabenAngelegt++;
    }
  }

  console.log(
    `${themenAngelegt} Thema(en) und ${aufgabenAngelegt} Aufgabe(n) ${
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
