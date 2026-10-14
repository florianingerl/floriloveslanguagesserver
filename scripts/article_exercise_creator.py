#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Erzeugt Multiple-Choice-Aufgaben fuer einen Artikel und legt sie in der DB ab.

Das Programm zeigt ein kleines Tkinter-Fenster mit den Feldern "Article"
(URL des Artikels), "Schule" und "Quiz" (Dropdown der Website-Quizze aus der
Datenbank) sowie dem Knopf "Create exercises for article". Beim Klick wird der
Artikel geladen, an das OpenCode-Modell "big-pickle" geschickt (das erzeugt die
Fragen in der Sprache des Artikels) und das Ergebnis als Thema (Titel des
Artikels) samt Aufgaben in MongoDB gespeichert - so wie es zuvor mit den
Anweisungen in "InstructionToCreateExercisesOnActivityDiagrams" gemacht wurde.

Das Modell wird auf zwei Wegen erreicht (Option --backend):

    * "cli"  (Standard): startet "opencode run" mit dem Modell big-pickle.
      Der kostenlose Tarif von OpenCode ist absichtlich nur innerhalb von
      OpenCode nutzbar, deshalb laeuft die Erzeugung ueber die opencode-CLI.
      Voraussetzung: opencode ist installiert und angemeldet.
    * "http": ruft den Endpunkt direkt auf. Dafuer wird ein (bezahlter)
      Console-Schluessel benoetigt (OPENCODE_API_KEY, sonst auth.json, sonst
      Feld im Fenster). big-pickle selbst funktioniert so nicht, weil es fuer
      den kostenlosen Tarif gesperrt ist.

Aufruf:
    python scripts/article_exercise_creator.py            (GUI)
    python scripts/article_exercise_creator.py --cli --backend cli ...
    python scripts/article_exercise_creator.py --cli --backend http ...

Benotigt: pymongo (nur fuer die Datenbank).
"""

import argparse
import gzip
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import queue
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# ---------------------------------------------------------------------------
# Standardwerte
# ---------------------------------------------------------------------------

DEFAULT_MONGODB_URL = os.environ.get(
    "MONGODB_URL", "mongodb+srv://flori:ABC@cluster0.p9bpe.mongodb.net/"
)
DEFAULT_API_URL = "https://opencode.ai/inference/v1/chat/completions"

# Zwei Wege, das Modell zu erreichen:
#   * "cli"  -> startet "opencode run" (Big Pickle laeuft nur innerhalb von
#               OpenCode; der kostenlose Tarif ist von aussen gesperrt).
#   * "http" -> direkter Aufruf des OpenCode-Endpunkts (braucht bezahlten
#               Console-Schluessel).
DEFAULT_BACKEND = "cli"
DEFAULT_MODEL = "big-pickle"                  # Modellname fuer den HTTP-Aufruf
DEFAULT_CLI_MODEL = "opencode/big-pickle"     # Modellname fuer die CLI
OPENCODE_BIN = os.environ.get("OPENCODE_BIN")  # optional: Pfad zur opencode-CLI
DEFAULT_OWNER_EMAIL = "imelflorianingerl@gmail.com"
DEFAULT_INSTRUCTION = "Waehle die richtige Antwort."
MIN_PARAGRAPH_LENGTH = 40

USER_AGENT = "floriloveslanguages-exercise-creator/1.0"

# Tags, in denen wir keinen Inhalt auswerten wollen.
_SKIP_TAGS = {
    "script", "style", "nav", "header", "footer", "aside", "table",
    "form", "button", "select", "noscript", "template", "svg", "sup",
}
# Tags ohne schliessendes Tag.
_VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
# Ueberschriften.
_HEADING_TAGS = {"h2", "h3", "h4", "h5", "h6"}

# ---------------------------------------------------------------------------
# Reine Hilfsfunktionen (testbar ohne Netz/DB)
# ---------------------------------------------------------------------------


def resolve_url(base_url, href):
    """Macht aus einem (evtl. relativen) Bild-src eine absolute http(s)-URL.

    Liefert None fuer data:-/mailto:-Links oder fehlende Werte.
    """
    if not href:
        return None
    href = href.strip()
    if not href or href.startswith("data:") or href.startswith("mailto:"):
        return None
    if href.startswith("//"):
        href = "https:" + href
    absolute = urljoin(base_url, href)
    scheme = urlparse(absolute).scheme
    if scheme not in ("http", "https"):
        return None
    return absolute


class _ArticleParser(HTMLParser):
    """Sammelt Titel, Sprache sowie Absaetze/Bilder in Dokumentreihenfolge."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None
        self.title = None
        self._title_tag = None
        self._stack = []
        self._root_depth = 0
        self._skip_depth = 0
        self.root_seen = False
        self._current_section = None
        self._capture = None
        self._buffer = []
        self.events = []

    # -- Tag-Handling ------------------------------------------------------
    def _is_inside_root(self):
        # Nur Inhalt innerhalb eines Inhaltsbereichs (mw-parser-output,
        # article, main). Gibt es keinen, wird spaeter alles verwendet.
        return self._root_depth > 0

    def handle_starttag(self, tag, attrs):
        attrs = {k.lower(): (v or "") for k, v in attrs}
        classes = attrs.get("class", "")

        if tag == "html" and attrs.get("lang"):
            self.lang = attrs["lang"]

        is_root = (
            (tag == "div" and (attrs.get("id") == "mw-content-text"
                               or "mw-parser-output" in classes))
            or tag in ("article", "main")
        )
        is_skip = (
            tag in _SKIP_TAGS
            or "mw-editsection" in classes
            or "reference" in classes
        )

        if tag not in _VOID_TAGS:
            kind = "root" if is_root else ("skip" if is_skip else "normal")
            self._stack.append((tag, kind))
            if kind == "root":
                self._root_depth += 1
                self.root_seen = True
            elif kind == "skip":
                self._skip_depth += 1

        if self._skip_depth > 0:
            return

        if tag == "img":
            self._handle_image(attrs)
            return

        if tag in ("title", "h1") or tag in _HEADING_TAGS or tag == "p":
            if self._capture is None:
                self._capture = tag
                self._buffer = []

    def handle_endtag(self, tag):
        # Schliessende Tags ohne passendes offenes Tag ignorieren. Sonst
        # wuerde z.B. ein einzelnes "</p>" im HTML den Inhaltsbereich
        # (article/main) vorzeitig vom Stack nehmen.
        if not any(entry[0] == tag for entry in self._stack):
            return

        # Passenden Eintrag vom Tag-Stack nehmen und Zaehler anpassen.
        popped = []
        while self._stack:
            entry = self._stack.pop()
            popped.append(entry)
            if entry[0] == tag:
                break
        for _, kind in popped:
            if kind == "root":
                self._root_depth = max(0, self._root_depth - 1)
            elif kind == "skip":
                self._skip_depth = max(0, self._skip_depth - 1)

        if self._capture == tag:
            self._flush_capture(tag)

    def handle_startendtag(self, tag, attrs):
        attrs = {k.lower(): (v or "") for k, v in attrs}
        if tag == "img" and self._skip_depth == 0:
            self._handle_image(attrs)

    def handle_data(self, data):
        if self._skip_depth > 0:
            return
        if self._capture is not None:
            self._buffer.append(data)

    # -- Details -----------------------------------------------------------
    def _handle_image(self, attrs):
        src = attrs.get("src") or attrs.get("data-src")
        url = resolve_url(self._base_url, src)
        if not url:
            return
        low = url.lower()
        if "logo" in low or "icon" in low:
            return
        try:
            if attrs.get("width") and int(re.sub(r"\D", "", attrs["width"]) or 0) < 50:
                return
            if attrs.get("height") and int(re.sub(r"\D", "", attrs["height"]) or 0) < 50:
                return
        except ValueError:
            pass
        self.events.append(
            {"kind": "image", "value": url, "in_root": self._is_inside_root()}
        )

    def _flush_capture(self, tag):
        text = re.sub(r"\s+", " ", "".join(self._buffer)).strip()
        in_root = self._is_inside_root()
        self._capture = None
        self._buffer = []
        if not text:
            return
        if tag == "title":
            if not self.title:
                # Wikipedia haengt " - Wikipedia" (oder mit Gedankenstrich) an.
                self.title = re.sub(
                    r"\s*[\u2013\u2014|]\s*Wikipedia\s*$", "", text
                ).strip()
                self.title = re.sub(r"\s*-\s*Wikipedia\s*$", "", self.title).strip()
        elif tag == "h1":
            if not self.title:
                self.title = text
        elif tag in _HEADING_TAGS:
            self._current_section = text
            self.events.append(
                {"kind": "heading", "value": text, "in_root": in_root}
            )
        elif tag == "p":
            if len(text) >= MIN_PARAGRAPH_LENGTH:
                self.events.append(
                    {"kind": "para", "value": text, "in_root": in_root}
                )

    def parse(self, html_text, base_url):
        self._base_url = base_url
        self.feed(html_text)
        self.close()


def parse_article(html_text, base_url):
    """Zerlegt einen Artikel in Titel, Sprache und Absaetze mit Bildern.

    Ergebnis: {"title", "lang", "first_image", "blocks": [{"section",
    "text", "image"}]}
    """
    parser = _ArticleParser()
    parser.parse(html_text, base_url)

    events = parser.events
    if parser.root_seen:
        in_root = [e for e in events if e["in_root"]]
        # Falls die Erkennung des Inhaltsbereichs fehlschlaegt (kaputtes
        # HTML), lieber alles verwenden als gar nichts.
        if in_root:
            events = in_root

    title = (parser.title or "").strip() or base_url
    first_image = next(
        (e["value"] for e in events if e["kind"] == "image"), None
    )

    blocks = []
    current_section = title
    last_image = None
    n = len(events)

    def next_boundary(i):
        for j in range(i + 1, n):
            if events[j]["kind"] in ("heading", "para"):
                return j
        return n

    for i, event in enumerate(events):
        if event["kind"] == "heading":
            current_section = event["value"]
        elif event["kind"] == "image":
            last_image = event["value"]
        elif event["kind"] == "para":
            image = None
            for j in range(i + 1, next_boundary(i)):
                if events[j]["kind"] == "image":
                    image = events[j]["value"]
                    break
            if image is None:
                image = last_image or first_image
            blocks.append(
                {"section": current_section, "text": event["value"], "image": image}
            )

    return {
        "title": title,
        "lang": parser.lang,
        "first_image": first_image,
        "blocks": blocks,
        "url": base_url,
    }


def build_prompt(article, count):
    """Baut die Nachrichten fuer das Sprachmodell."""
    lang = article.get("lang") or "der Sprache des Artikels"
    blocks = article.get("blocks") or []

    lines = [
        "Erstelle Multiple-Choice-Aufgaben zu dem folgenden Artikel.",
        "Sprache der Fragen und Antworten: %s." % lang,
        "Erstelle genau eine Aufgabe pro nummeriertem Abschnitt (hoechstens %d)."
        % count,
        "",
        "Der Artikel heisst: %s" % article.get("title", ""),
        "",
        "Abschnitte:",
    ]
    for i, block in enumerate(blocks):
        lines.append("[%d] (Abschnitt: %s) %s" % (i, block.get("section", ""), block["text"]))

    lines += [
        "",
        "Antworte NUR mit einem JSON-Array. Jedes Element hat die Felder:",
        '  "block": Nummer des Abschnitts (Zahl),',
        '  "question": die Frage,',
        '  "options": genau 4 kurze Antwortmoeglichkeiten,',
        '  "correct": Index (0-3) der richtigen Antwort.',
        "Die falschen Antworten muessen plausibel, aber eindeutig falsch sein.",
        "Benutze nur Informationen aus dem Artikel.",
    ]

    return [
        {
            "role": "system",
            "content": (
                "Du bist ein Assistent, der aus einem Artikel "
                "Multiple-Choice-Aufgaben erstellt. Antworte ausschliesslich "
                "mit kompaktem JSON, ohne erklaerenden Text."
            ),
        },
        {"role": "user", "content": "\n".join(lines)},
    ]


def parse_llm_json(text):
    """Liest das JSON-Array der Aufgaben aus der Modellantwort.

    Versteht auch Antworten mit ```-Codezaeunen oder Text drumherum.
    Wirft ValueError, wenn nichts Brauchbares gefunden wird.
    """
    if not text or not text.strip():
        raise ValueError("Die Antwort des Modells war leer.")

    raw = text.strip()
    raw = re.sub(r"^```[a-zA-Z0-9_-]*\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end < start:
        raise ValueError("In der Antwort wurde kein JSON-Array gefunden.")

    try:
        data = json.loads(raw[start:end + 1])
    except json.JSONDecodeError as error:
        raise ValueError("Die Antwort ist kein gueltiges JSON: %s" % error)

    if not isinstance(data, list):
        raise ValueError("Die Antwort ist kein JSON-Array.")

    result = []
    for item in data:
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "")).strip()
        options = [
            str(o).strip()
            for o in (item.get("options") or [])
            if str(o).strip()
        ]
        correct = item.get("correct", item.get("correctIndex", 0))
        try:
            correct = int(correct)
        except (TypeError, ValueError):
            correct = 0
        if not question or len(options) < 2:
            continue
        if not 0 <= correct < len(options):
            continue
        result.append(
            {
                "question": question,
                "options": options,
                "correct": correct,
                "block": item.get("block"),
                "instruction": item.get("instruction"),
            }
        )

    if not result:
        raise ValueError("Es wurden keine gueltigen Aufgaben gefunden.")
    return result


def _image_for(item, blocks, first_image):
    block = item.get("block")
    if isinstance(block, int) and 0 <= block < len(blocks):
        return blocks[block].get("image") or first_image
    if isinstance(block, str):
        for b in blocks:
            if b.get("section") == block:
                return b.get("image") or first_image
    return first_image


def build_topic_doc(quiz_id, subject, title, tutorial, school, owner_id, now):
    """Baut das Topic-Dokument fuer die Datenbank."""
    return {
        "subject": subject,
        "title": title,
        "tutorial": tutorial,
        "quiz": quiz_id,
        "school": school,
        "user": owner_id,
        "createdAt": now,
        "updatedAt": now,
    }


def build_exercise_docs(
    quiz_id, subject, topic_id, owner_id, items, blocks, first_image, now,
    instruction=DEFAULT_INSTRUCTION,
):
    """Baut die Exercise-Dokumente fuer die Datenbank."""
    docs = []
    for item in items:
        options = [
            {"option": option, "correct": index == item["correct"]}
            for index, option in enumerate(item["options"])
        ]
        docs.append(
            {
                "quiz": quiz_id,
                "subject": subject,
                "type": "multipleChoice",
                "imageUrl": _image_for(item, blocks, first_image) or "",
                "topic": topic_id,
                "user": owner_id,
                "instruction": item.get("instruction") or instruction,
                "question": item["question"],
                "options": options,
                "optionsEn": [],
                "optionsFr": [],
                "createdAt": now,
                "updatedAt": now,
            }
        )
    return docs


def load_api_key(explicit=None):
    """Ermittelt den OpenCode-API-Schluessel.

    Reihenfolge: uebergebener Wert, Umgebungsvariable, auth.json.
    """
    if explicit and explicit.strip():
        return explicit.strip()

    for name in ("OPENCODE_API_KEY", "OPENCODE_GO_API_KEY"):
        value = os.environ.get(name)
        if value and value.strip():
            return value.strip()

    return _api_key_from_auth_file()


def _api_key_from_auth_file():
    candidates = [
        Path.home() / ".local" / "share" / "opencode" / "auth.json",
        Path.home() / ".config" / "opencode" / "auth.json",
    ]
    for path in candidates:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        for provider in ("opencode", "opencode-go", "opencode-console"):
            entry = data.get(provider)
            if isinstance(entry, dict):
                key = str(entry.get("key", "")).strip()
                if _looks_like_key(key):
                    return key
    return None


def _looks_like_key(key):
    return bool(key) and len(key) > 12 and not key.startswith("/")


# ---------------------------------------------------------------------------
# Netz: Artikel laden und Modell aufrufen
# ---------------------------------------------------------------------------


def fetch_article(url, timeout=30):
    """Laedt den HTML-Quelltext eines Artikels."""
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Language": "de,en;q=0.8",
            "Accept": "text/html",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        data = response.read()
        if response.headers.get("Content-Encoding") == "gzip":
            data = gzip.decompress(data)
        charset = response.headers.get_content_charset() or "utf-8"
        return data.decode(charset, errors="replace")


def call_llm(api_url, api_key, model, messages, timeout=180, session_id=None):
    """Ruft das OpenCode-Modell auf und liefert den Antworttext zurueck."""
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
    }
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer %s" % api_key,
        "User-Agent": USER_AGENT,
        "x-opencode-session": session_id or "article-exercise-creator",
    }
    request = Request(api_url, data=body, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=timeout) as response:
            text = response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError("Modell-Aufruf fehlgeschlagen (%s): %s" % (error.code, detail))
    except URLError as error:
        raise RuntimeError("Modell nicht erreichbar: %s" % error.reason)

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise RuntimeError("Unerwartete Antwort des Modells: %s" % text[:400])

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError("Unerwartete Antwort des Modells: %s" % text[:400])


def normalize_model(model, backend):
    """Bringt den Modellnamen in die von der jeweiligen Schnittstelle erwartete Form."""
    model = (model or "").strip()
    if not model:
        return DEFAULT_CLI_MODEL if backend == "cli" else DEFAULT_MODEL
    if backend == "cli":
        return model if "/" in model else "opencode/" + model
    if model.startswith("opencode/"):
        return model.split("/", 1)[1]
    return model


def messages_to_prompt(messages):
    """Fasst die Chat-Nachrichten zu einem Text fuer die CLI zusammen."""
    parts = []
    for message in messages:
        content = (message.get("content") or "").strip()
        if content:
            parts.append(content)
    return "\n\n".join(parts)


def find_opencode_bin(explicit=None):
    """Findet die opencode-CLI (Parameter, OPENCODE_BIN oder PATH)."""
    candidate = explicit or OPENCODE_BIN or "opencode"
    return shutil.which(candidate) or candidate


def _extract_cli_text(stdout):
    """Sammelt den Antworttext aus den JSON-Zeilen der opencode-CLI."""
    chunks = []
    for line in (stdout or "").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("type") != "text":
            continue
        part = event.get("part") or {}
        if part.get("type") == "text" and part.get("text"):
            chunks.append(part["text"])
    return "".join(chunks)


def call_llm_cli(messages, model=DEFAULT_CLI_MODEL, timeout=600,
                 opencode_bin=None, cwd=None, log=None):
    """Erzeugt die Antwort ueber die opencode-CLI (dort laeuft Big Pickle).

    Der kostenlose Tarif von OpenCode ist nur innerhalb von OpenCode nutzbar,
    deshalb wird hier "opencode run" gestartet und die Antwort eingesammelt.
    """
    prompt = messages_to_prompt(messages)
    executable = find_opencode_bin(opencode_bin)
    workdir = cwd or tempfile.mkdtemp(prefix="opencode_prompt_")
    command = [
        executable, "run", "--format", "json", "-m", model, "--dir", workdir,
    ]
    if log:
        log("Starte: %s" % " ".join(command))
    try:
        process = subprocess.run(
            command, input=prompt, capture_output=True, text=True,
            timeout=timeout, cwd=workdir,
        )
    except FileNotFoundError:
        raise RuntimeError(
            "opencode-CLI nicht gefunden (%r). Bitte installieren oder "
            "OPENCODE_BIN setzen." % executable
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("Das Modell hat zu lange gebraucht (Timeout).")

    text = _extract_cli_text(process.stdout)
    if not text:
        detail = (process.stderr or "").strip() or (process.stdout or "").strip()
        raise RuntimeError(
            "Das Modell lieferte keine Antwort (rc=%s). %s"
            % (process.returncode, detail[-400:])
        )
    return text


# ---------------------------------------------------------------------------
# Datenbank (pymongo wird erst hier geladen)
# ---------------------------------------------------------------------------


def connect(mongo_url=DEFAULT_MONGODB_URL):
    import pymongo

    client = pymongo.MongoClient(mongo_url, serverSelectionTimeoutMS=20000)
    return client


def get_db(client):
    """Datenbank wie der Server (Mongoose) verwenden: "test" als Standard."""
    return client.get_default_database(default="test")


def list_website_quizzes(db):
    """Alle Website-Quizze (website == "web") aus der Datenbank."""
    quizzes = list(db["quizzes"].find({"website": "web"}))
    quizzes.sort(key=lambda q: (q.get("subject") or "", q.get("name") or ""))
    return quizzes


def find_owner_id(db, email=DEFAULT_OWNER_EMAIL):
    owner = db["users"].find_one({"email": email})
    return owner["_id"] if owner else None


def upsert_topic(db, topic_doc):
    """Legt das Thema an oder aktualisiert es; liefert die _id."""
    topics = db["topics"]
    existing = topics.find_one(
        {
            "subject": topic_doc["subject"],
            "title": topic_doc["title"],
            "quiz": topic_doc["quiz"],
        }
    ) or topics.find_one(
        {"subject": topic_doc["subject"], "title": topic_doc["title"]}
    )
    if existing:
        topics.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "tutorial": topic_doc["tutorial"],
                    "school": topic_doc["school"],
                    "quiz": topic_doc["quiz"],
                    "user": topic_doc["user"],
                    "updatedAt": topic_doc["updatedAt"],
                }
            },
        )
        return existing["_id"], False

    inserted = topics.insert_one(dict(topic_doc))
    return inserted.inserted_id, True


def insert_exercises(db, docs):
    """Fuegt Aufgaben ein und ueberspringt bereits vorhandene Fragen."""
    exercises = db["exercises"]
    created = 0
    skipped = 0
    for doc in docs:
        if exercises.find_one(
            {"subject": doc["subject"], "question": doc["question"]}
        ):
            skipped += 1
            continue
        exercises.insert_one(dict(doc))
        created += 1
    return created, skipped


def create_for_article(
    url, schule, quiz, api_key=None, model=None,
    backend=DEFAULT_BACKEND, api_url=DEFAULT_API_URL,
    mongo_url=DEFAULT_MONGODB_URL, opencode_bin=None,
    owner_email=DEFAULT_OWNER_EMAIL, dry_run=False, generator=None, log=print,
):
    """Der komplette Ablauf: Artikel -> Aufgaben -> Datenbank.

    backend="cli" (Standard) nutzt "opencode run" mit Big Pickle.
    backend="http" ruft den OpenCode-Endpunkt direkt auf (braucht Schluessel).
    generator kann zum Testen vorgegeben werden (messages -> Antworttext).
    """
    model = normalize_model(model, backend)

    if generator is None:
        if backend == "http":
            key = load_api_key(api_key)
            if not key:
                raise RuntimeError(
                    "Kein OpenCode-API-Schluessel gefunden. Bitte OPENCODE_API_KEY "
                    "setzen oder den Schluessel im Fenster eintragen."
                )

            def generator(messages, _key=key, _model=model, _url=api_url):
                return call_llm(_url, _key, _model, messages)
        else:
            def generator(messages, _model=model, _bin=opencode_bin):  # noqa: F811
                return call_llm_cli(messages, model=_model, opencode_bin=_bin, log=log)

    log("Lade Artikel: %s" % url)
    html_text = fetch_article(url)
    article = parse_article(html_text, url)
    blocks = article["blocks"]
    log('Artikel "%s" mit %d Absaetzen geladen (Sprache: %s).'
        % (article["title"], len(blocks), article["lang"] or "?"))
    if not blocks:
        raise RuntimeError("Im Artikel wurden keine Absaetze gefunden.")

    messages = build_prompt(article, len(blocks))
    log("Frage das Modell %s ..." % model)
    raw = generator(messages)
    items = parse_llm_json(raw)
    log("%d Aufgabe(n) vom Modell erhalten." % len(items))

    now = datetime.now(timezone.utc)
    quiz_id = quiz.get("_id")
    subject = quiz.get("subject")
    tutorial = '<a href="%s">%s</a>' % (url, article["title"])

    topic_doc = build_topic_doc(
        quiz_id, subject, article["title"], tutorial, schule, None, now
    )
    exercise_docs = build_exercise_docs(
        quiz_id, subject, None, None, items, blocks, article["first_image"], now
    )

    if dry_run:
        log("DRY RUN: es wird nichts gespeichert.")
        log("Thema: %s (Schule: %s, Fach: %s)"
            % (article["title"], schule, subject))
        for doc in exercise_docs:
            log("  - %s (%d Optionen)" % (doc["question"], len(doc["options"])))
        return {"dry_run": True, "exercises": len(exercise_docs)}

    client = connect(mongo_url)
    try:
        db = get_db(client)
        owner_id = find_owner_id(db, owner_email)
        if owner_id is None:
            log("Warnung: kein Benutzer mit E-Mail %s gefunden." % owner_email)

        topic_doc["user"] = owner_id
        for doc in exercise_docs:
            doc["user"] = owner_id

        topic_id, topic_created = upsert_topic(db, topic_doc)
        for doc in exercise_docs:
            doc["topic"] = topic_id

        created, skipped = insert_exercises(db, exercise_docs)
        log(
            'Thema %s. %d Aufgabe(n) angelegt, %d uebersprungen.'
            % ("neu angelegt" if topic_created else "aktualisiert", created, skipped)
        )
        return {
            "topic_id": str(topic_id),
            "topic_created": topic_created,
            "created": created,
            "skipped": skipped,
        }
    finally:
        client.close()


# ---------------------------------------------------------------------------
# Oberflaeche
# ---------------------------------------------------------------------------

try:
    import tkinter as tk
    from tkinter import ttk, messagebox, scrolledtext

    _TK_AVAILABLE = True
except Exception:  # pragma: no cover - nur Umgebungen ohne Tkinter
    _TK_AVAILABLE = False


if _TK_AVAILABLE:

    def quiz_label(quiz):
        name = quiz.get("name") or quiz.get("subject") or "?"
        return "%s (%s)" % (name, quiz.get("subject") or "?")

    class ExerciseCreatorApp(tk.Tk):
        """Kleines Fenster zum Erzeugen von Aufgaben aus einem Artikel."""

        def __init__(self):
            super().__init__()
            self.title("Create exercises for article")
            self.geometry("560x460")
            self._quizzes = []
            self._log_queue = queue.Queue()
            self._log_widget = None
            self._build_widgets()
            self._pump_log()
            self.after(50, self._load_quizzes)

        # -- Aufbau --------------------------------------------------------
        def _build_widgets(self):
            main = ttk.Frame(self, padding=10)
            main.pack(fill="both", expand=True)
            self._main = main

            # Der geforderte Container mit schwarzem Rahmen und Ueberschrift.
            box = tk.LabelFrame(
                main, text="Create exercises for article", bd=2, relief="solid",
                padx=10, pady=10,
            )
            box.pack(fill="x", pady=(0, 10))
            box.columnconfigure(1, weight=1)

            ttk.Label(box, text="Article").grid(row=0, column=0, sticky="w", pady=4)
            self.article_var = tk.StringVar()
            ttk.Entry(box, textvariable=self.article_var).grid(
                row=0, column=1, sticky="ew", pady=4
            )

            ttk.Label(box, text="Schule").grid(row=1, column=0, sticky="w", pady=4)
            self.schule_var = tk.StringVar()
            ttk.Entry(box, textvariable=self.schule_var).grid(
                row=1, column=1, sticky="ew", pady=4
            )

            ttk.Label(box, text="Quiz").grid(row=2, column=0, sticky="w", pady=4)
            self.quiz_var = tk.StringVar()
            self.quiz_combo = ttk.Combobox(
                box, textvariable=self.quiz_var, state="readonly"
            )
            self.quiz_combo.grid(row=2, column=1, sticky="ew", pady=4)

            self.create_button = ttk.Button(
                box, text="Create exercises for article", command=self._on_click
            )
            self.create_button.grid(
                row=3, column=0, columnspan=2, sticky="ew", pady=(10, 0)
            )

            # Einstellungen (gehoeren nicht zum geforderten Container).
            settings = tk.LabelFrame(main, text="Einstellungen", padx=10, pady=10)
            settings.pack(fill="x", pady=(0, 10))
            settings.columnconfigure(1, weight=1)

            ttk.Label(settings, text="Backend").grid(
                row=0, column=0, sticky="w", pady=2
            )
            self.backend_var = tk.StringVar(value=DEFAULT_BACKEND)
            ttk.Combobox(
                settings, textvariable=self.backend_var,
                values=["cli", "http"], state="readonly",
            ).grid(row=0, column=1, sticky="ew", pady=2)

            ttk.Label(settings, text="OpenCode API Key (nur http)").grid(
                row=1, column=0, sticky="w", pady=2
            )
            self.api_var = tk.StringVar()
            ttk.Entry(settings, textvariable=self.api_var, show="*").grid(
                row=1, column=1, sticky="ew", pady=2
            )

            ttk.Label(settings, text="Modell").grid(
                row=2, column=0, sticky="w", pady=2
            )
            self.model_var = tk.StringVar(value=DEFAULT_CLI_MODEL)
            ttk.Entry(settings, textvariable=self.model_var).grid(
                row=2, column=1, sticky="ew", pady=2
            )

            ttk.Label(settings, text="MongoDB URL").grid(
                row=3, column=0, sticky="w", pady=2
            )
            self.mongo_var = tk.StringVar(value=DEFAULT_MONGODB_URL)
            ttk.Entry(settings, textvariable=self.mongo_var).grid(
                row=3, column=1, sticky="ew", pady=2
            )

            self.dry_run_var = tk.BooleanVar(value=False)
            ttk.Checkbutton(
                settings, text="Dry run (nichts speichern)",
                variable=self.dry_run_var,
            ).grid(row=4, column=1, sticky="w", pady=2)

            # Statusbereich.
            log_box = ttk.LabelFrame(main, text="Status", padding=6)
            log_box.pack(fill="both", expand=True)
            self._log_widget = scrolledtext.ScrolledText(
                log_box, height=8, state="disabled", wrap="word"
            )
            self._log_widget.pack(fill="both", expand=True)

        # -- Quizze laden --------------------------------------------------
        def _load_quizzes(self):
            self._log("Lade Quizze aus der Datenbank ...")
            mongo_url = self.mongo_var.get().strip() or DEFAULT_MONGODB_URL

            def worker():
                try:
                    client = connect(mongo_url)
                    try:
                        quizzes = list_website_quizzes(get_db(client))
                    finally:
                        client.close()
                    self.after(0, lambda: self._set_quizzes(quizzes))
                except Exception as error:  # noqa: BLE001
                    self._log("Quizze konnten nicht geladen werden: %s" % error)

            threading.Thread(target=worker, daemon=True).start()

        def _set_quizzes(self, quizzes):
            self._quizzes = quizzes
            self.quiz_combo["values"] = [quiz_label(q) for q in quizzes]
            if quizzes:
                self.quiz_combo.current(0)
                self._log("%d Quizze geladen." % len(quizzes))
            else:
                self._log("Keine Website-Quizze gefunden.")

        # -- Aktionen ------------------------------------------------------
        def _on_click(self):
            url = self.article_var.get().strip()
            schule = self.schule_var.get().strip()
            index = self.quiz_combo.current()

            if not url.lower().startswith(("http://", "https://")):
                messagebox.showerror("Fehler", "Bitte eine gueltige Artikel-URL eingeben.")
                return
            if index < 0 or index >= len(self._quizzes):
                messagebox.showerror("Fehler", "Bitte ein Quiz auswaehlen.")
                return

            quiz = self._quizzes[index]
            api_key = self.api_var.get().strip() or None
            model = self.model_var.get().strip() or None
            backend = self.backend_var.get().strip() or DEFAULT_BACKEND
            mongo_url = self.mongo_var.get().strip() or DEFAULT_MONGODB_URL
            dry_run = bool(self.dry_run_var.get())

            self.create_button.config(state="disabled")
            self._log("--- Start ---")

            def worker():
                try:
                    result = create_for_article(
                        url, schule, quiz, api_key=api_key, model=model,
                        backend=backend,
                        mongo_url=mongo_url, dry_run=dry_run, log=self._log,
                    )
                    self.after(0, lambda: self._finish(result))
                except Exception as error:  # noqa: BLE001
                    message = str(error)
                    self._log("Fehler: %s" % message)
                    self.after(0, lambda: messagebox.showerror("Fehler", message))
                    self.after(0, lambda: self.create_button.config(state="normal"))

            threading.Thread(target=worker, daemon=True).start()

        def _finish(self, result):
            self.create_button.config(state="normal")
            self._log("--- Fertig ---")
            messagebox.showinfo("Fertig", "Aufgaben wurden erzeugt.")

        # -- Log -----------------------------------------------------------
        def _log(self, message):
            self._log_queue.put(str(message))

        def _pump_log(self):
            try:
                while True:
                    message = self._log_queue.get_nowait()
                    if self._log_widget is not None:
                        self._log_widget.config(state="normal")
                        self._log_widget.insert("end", message + "\n")
                        self._log_widget.see("end")
                        self._log_widget.config(state="disabled")
            except queue.Empty:
                pass
            self.after(100, self._pump_log)


# ---------------------------------------------------------------------------
# Kommandozeile
# ---------------------------------------------------------------------------


def cli_main(args):
    if args.list_quizzes:
        client = connect(args.mongo)
        try:
            for quiz in list_website_quizzes(get_db(client)):
                print("%s\t%s" % (quiz.get("subject"), quiz.get("name") or ""))
        finally:
            client.close()
        return 0

    if not args.url or not args.quiz:
        print("--url und --quiz sind noetig (oder --list-quizzes).", file=sys.stderr)
        return 2

    client = connect(args.mongo)
    try:
        db = get_db(client)
        quizzes = list_website_quizzes(db)
        quiz = next(
            (
                q for q in quizzes
                if str(q.get("_id")) == args.quiz
                or q.get("subject") == args.quiz
                or (q.get("name") or "") == args.quiz
            ),
            None,
        )
        if quiz is None:
            print("Kein Quiz passt zu %r." % args.quiz, file=sys.stderr)
            return 2
    finally:
        client.close()

    result = create_for_article(
        args.url, args.schule or "", quiz, model=args.model,
        backend=args.backend, opencode_bin=args.opencode_bin,
        mongo_url=args.mongo, dry_run=args.dry_run,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Erzeugt Aufgaben fuer einen Artikel und speichert sie in der DB."
    )
    parser.add_argument("--cli", action="store_true", help="ohne Fenster ausfuehren")
    parser.add_argument("--url", help="URL des Artikels")
    parser.add_argument("--schule", help="Schule/Hochschule/Klasse")
    parser.add_argument("--quiz", help="Fach, Name oder _id des Quiz")
    parser.add_argument(
        "--backend", choices=["cli", "http"], default=DEFAULT_BACKEND,
        help="cli = opencode-CLI (Big Pickle, Standard), http = Endpunkt direkt",
    )
    parser.add_argument(
        "--model", default=None,
        help="Modellname (Standard: %s fuer cli)" % DEFAULT_CLI_MODEL,
    )
    parser.add_argument(
        "--opencode-bin", default=None, help="Pfad zur opencode-CLI",
    )
    parser.add_argument("--mongo", default=DEFAULT_MONGODB_URL)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--list-quizzes", action="store_true")
    args = parser.parse_args(argv)

    if args.cli or args.list_quizzes:
        return cli_main(args)

    if not _TK_AVAILABLE:
        print("Tkinter ist nicht verfuegbar.", file=sys.stderr)
        return 1
    app = ExerciseCreatorApp()
    app.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
