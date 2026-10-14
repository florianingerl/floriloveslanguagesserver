# -*- coding: utf-8 -*-
"""Tests fuer article_exercise_creator (ohne Netz und ohne Datenbank).

Aufruf aus dem Ordner scripts:
    python -m unittest test_article_exercise_creator -v
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import article_exercise_creator as m  # noqa: E402


WIKI_HTML = """<!DOCTYPE html>
<html lang="de">
<head><title>Aktivit\u00e4tsdiagramm - Wikipedia</title></head>
<body>
<nav><p>Diese Navigation ist lang genug, um wie ein Absatz auszusehen, und
soll trotzdem verworfen werden.</p></nav>
<div id="mw-parser-output">
<h1>Aktivit\u00e4tsdiagramm</h1>
<p>Ein Aktivit\u00e4tsdiagramm ist ein Diagramm zur Modellierung von
Abl\u00e4ufen und geh\u00f6rt zu den Verhaltensdiagrammen der UML.</p>
<img src="/img/start.png" width="300" height="200">
<h2>Symbole</h2>
<p>Ein Aktivit\u00e4tsdiagramm besteht aus einer Vielzahl von Symbolen,
die unterschiedliche Bedeutungen haben.</p>
<img src="//upload.example.org/a.png">
<p>Der Startknoten markiert den Beginn eines Ablaufs im Diagramm.</p>
<h2>Endknoten</h2>
<p>Der Endknoten markiert das Ende aller Kontrollfl\u00fcsse.</p>
</div>
</body>
</html>
"""


NO_ROOT_HTML = """<html lang="en"><head><title>Plain page</title></head>
<body>
<p>This is a fairly long plain paragraph that should be collected because no
content root element exists on this page at all.</p>
<img src="https://cdn.example.org/one.png" width="500">
<p>Another fairly long plain paragraph that should also be collected here.</p>
</body></html>
"""


class ResolveUrlTests(unittest.TestCase):
    def test_relative_becomes_absolute(self):
        self.assertEqual(
            m.resolve_url("https://de.wikipedia.org/wiki/X", "/img/a.png"),
            "https://de.wikipedia.org/img/a.png",
        )

    def test_protocol_relative(self):
        self.assertEqual(
            m.resolve_url("https://a.org/x", "//cdn.org/b.png"),
            "https://cdn.org/b.png",
        )

    def test_data_and_mailto_are_ignored(self):
        self.assertIsNone(m.resolve_url("https://a.org", "data:image/png;base64,xx"))
        self.assertIsNone(m.resolve_url("https://a.org", "mailto:x@y.z"))
        self.assertIsNone(m.resolve_url("https://a.org", ""))


class ParseArticleTests(unittest.TestCase):
    def setUp(self):
        self.article = m.parse_article(WIKI_HTML, "https://de.wikipedia.org/wiki/A")

    def test_title_and_language(self):
        self.assertEqual(self.article["title"], "Aktivit\u00e4tsdiagramm")
        self.assertEqual(self.article["lang"], "de")

    def test_navigation_is_dropped(self):
        for block in self.article["blocks"]:
            self.assertNotIn("Navigation", block["text"])

    def test_blocks_and_sections(self):
        sections = [b["section"] for b in self.article["blocks"]]
        self.assertEqual(sections[0], "Aktivit\u00e4tsdiagramm")
        self.assertIn("Symbole", sections)
        self.assertIn("Endknoten", sections)
        self.assertEqual(len(self.article["blocks"]), 4)

    def test_image_assignment(self):
        blocks = self.article["blocks"]
        self.assertEqual(self.article["first_image"], "https://de.wikipedia.org/img/start.png")
        # Erster Absatz: das naechste Bild gehoert zu ihm.
        self.assertEqual(blocks[0]["image"], "https://de.wikipedia.org/img/start.png")
        # Absatz unter "Symbole": das folgende Bild wird zugeordnet.
        self.assertEqual(blocks[1]["image"], "https://upload.example.org/a.png")
        # Spaetere Absaetze ohne nachfolgendes Bild nehmen das letzte Bild.
        self.assertEqual(blocks[2]["image"], "https://upload.example.org/a.png")
        self.assertEqual(blocks[3]["image"], "https://upload.example.org/a.png")

    def test_stray_closing_tag_keeps_content(self):
        # WordPress-Seiten enthalten oft ein einzelnes "</p>" ohne offenes <p>.
        # Es darf den Inhaltsbereich nicht vorzeitig schliessen.
        html = (
            '<html lang="de"><head><title>Zeiger in C</title></head><body>'
            '<article id="post-82"><header><h1>Zeiger in C</h1></header>'
            '<div class="entry-content"><a name="224"></a></p>'
            "<p>Ein Zeiger ist eine Variable, die die Adresse eines anderen "
            "Wertes im Speicher speichert.</p>"
            "<h2>Beispiel</h2>"
            "<p>Der Zeiger zeigt dabei immer auf die Adresse der "
            "urspruenglichen Variablen im Speicher.</p>"
            '<img src="/img/zeiger.gif">'
            "</div></article>"
            "<footer><p>Dies ist ein Werbeabsatz, der lang genug ist, um "
            "sonst als Inhalt aufzufallen.</p></footer>"
            "</body></html>"
        )
        article = m.parse_article(html, "https://example.org/zeiger/")
        texts = [b["text"] for b in article["blocks"]]
        self.assertEqual(len(article["blocks"]), 2)
        self.assertIn("Ein Zeiger ist eine Variable", texts[0])
        self.assertIn("Der Zeiger zeigt dabei", texts[1])
        for block in article["blocks"]:
            self.assertNotIn("Werbeabsatz", block["text"])
        self.assertEqual(article["first_image"], "https://example.org/img/zeiger.gif")
        self.assertEqual(article["blocks"][0]["image"], "https://example.org/img/zeiger.gif")

    def test_page_without_content_root(self):
        article = m.parse_article(NO_ROOT_HTML, "https://example.org/p")
        self.assertEqual(article["title"], "Plain page")
        self.assertEqual(len(article["blocks"]), 2)
        self.assertEqual(article["first_image"], "https://cdn.example.org/one.png")


class BuildPromptTests(unittest.TestCase):
    def test_prompt_contains_blocks_and_language(self):
        article = {
            "title": "Titel",
            "lang": "de",
            "blocks": [
                {"section": "A", "text": "Erster Absatz", "image": None},
                {"section": "B", "text": "Zweiter Absatz", "image": None},
            ],
        }
        messages = m.build_prompt(article, 2)
        self.assertEqual(messages[0]["role"], "system")
        content = messages[1]["content"]
        self.assertIn("[0]", content)
        self.assertIn("Erster Absatz", content)
        self.assertIn("[1]", content)
        self.assertIn("de", content)


class ParseLlmJsonTests(unittest.TestCase):
    def test_plain_array(self):
        text = json.dumps([
            {"block": 0, "question": "Frage?", "options": ["a", "b", "c", "d"], "correct": 2}
        ])
        result = m.parse_llm_json(text)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["question"], "Frage?")
        self.assertEqual(result[0]["correct"], 2)
        self.assertEqual(result[0]["options"], ["a", "b", "c", "d"])

    def test_fenced_with_prose(self):
        text = (
            "Hier sind die Aufgaben:\n```json\n"
            '[{"question": "Q", "options": ["x", "y"], "correct": 1}]\n'
            "```\nViel Erfolg!"
        )
        result = m.parse_llm_json(text)
        self.assertEqual(result[0]["correct"], 1)

    def test_invalid_options_are_skipped(self):
        text = json.dumps([
            {"question": "gut", "options": ["a", "b"], "correct": 0},
            {"question": "zu wenige", "options": ["nur eine"], "correct": 0},
            {"question": "falscher index", "options": ["a", "b"], "correct": 9},
        ])
        result = m.parse_llm_json(text)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["question"], "gut")

    def test_empty_raises(self):
        with self.assertRaises(ValueError):
            m.parse_llm_json("")

    def test_no_array_raises(self):
        with self.assertRaises(ValueError):
            m.parse_llm_json("Ich kann das leider nicht.")

    def test_nothing_valid_raises(self):
        with self.assertRaises(ValueError):
            m.parse_llm_json(json.dumps([{"question": "", "options": []}]))


class BuildDocsTests(unittest.TestCase):
    def _article(self):
        return {
            "title": "Aktivit\u00e4tsdiagramm",
            "first_image": "https://x/first.png",
            "blocks": [
                {"section": "A", "text": "t1", "image": "https://x/a.png"},
                {"section": "B", "text": "t2", "image": None},
            ],
        }

    def test_build_topic_doc(self):
        now = m.datetime(2026, 1, 1, tzinfo=m.timezone.utc)
        doc = m.build_topic_doc(
            "quiz1", "informatics", "Aktivit\u00e4tsdiagramm",
            '<a href="u">Aktivit\u00e4tsdiagramm</a>', "Uni Aachen", "user1", now,
        )
        self.assertEqual(doc["subject"], "informatics")
        self.assertEqual(doc["title"], "Aktivit\u00e4tsdiagramm")
        self.assertEqual(doc["school"], "Uni Aachen")
        self.assertEqual(doc["quiz"], "quiz1")
        self.assertEqual(doc["user"], "user1")
        self.assertEqual(doc["tutorial"], '<a href="u">Aktivit\u00e4tsdiagramm</a>')
        self.assertEqual(doc["createdAt"], now)

    def test_build_exercise_docs(self):
        now = m.datetime(2026, 1, 1, tzinfo=m.timezone.utc)
        items = [
            {"question": "Frage 1?", "options": ["a", "b", "c", "d"], "correct": 1, "block": 0},
            {"question": "Frage 2?", "options": ["a", "b"], "correct": 0, "block": 1},
        ]
        docs = m.build_exercise_docs(
            "quiz1", "informatics", "topic1", "user1",
            items, self._article()["blocks"], self._article()["first_image"], now,
        )
        self.assertEqual(len(docs), 2)
        first = docs[0]
        self.assertEqual(first["type"], "multipleChoice")
        self.assertEqual(first["quiz"], "quiz1")
        self.assertEqual(first["subject"], "informatics")
        self.assertEqual(first["topic"], "topic1")
        self.assertEqual(first["imageUrl"], "https://x/a.png")
        self.assertEqual(first["instruction"], m.DEFAULT_INSTRUCTION)
        self.assertEqual(
            first["options"],
            [
                {"option": "a", "correct": False},
                {"option": "b", "correct": True},
                {"option": "c", "correct": False},
                {"option": "d", "correct": False},
            ],
        )
        # Zweiter Abschnitt hat kein eigenes Bild -> erstes Artikelbild.
        self.assertEqual(docs[1]["imageUrl"], "https://x/first.png")


class ApiKeyTests(unittest.TestCase):
    def test_explicit_key_wins(self):
        with mock.patch.dict(os.environ, {"OPENCODE_API_KEY": "from-env-1234567890"}):
            self.assertEqual(m.load_api_key("explicit-key-1234567890"), "explicit-key-1234567890")

    def test_env_key(self):
        with mock.patch.dict(os.environ, {"OPENCODE_API_KEY": "env-key-1234567890"}, clear=False):
            self.assertEqual(m.load_api_key(), "env-key-1234567890")

    def test_auth_file_key(self):
        with tempfile.TemporaryDirectory() as tmp:
            auth_dir = Path(tmp) / ".local" / "share" / "opencode"
            auth_dir.mkdir(parents=True)
            (auth_dir / "auth.json").write_text(
                json.dumps({"opencode-go": {"type": "api", "key": "file-key-1234567890"}}),
                encoding="utf-8",
            )
            env = {k: v for k, v in os.environ.items() if k != "OPENCODE_API_KEY"}
            env.pop("OPENCODE_GO_API_KEY", None)
            with mock.patch.dict(os.environ, env, clear=True):
                with mock.patch.object(Path, "home", return_value=Path(tmp)):
                    self.assertEqual(m.load_api_key(), "file-key-1234567890")

    def test_broken_key_is_ignored(self):
        with tempfile.TemporaryDirectory() as tmp:
            auth_dir = Path(tmp) / ".local" / "share" / "opencode"
            auth_dir.mkdir(parents=True)
            (auth_dir / "auth.json").write_text(
                json.dumps({"opencode-go": {"type": "api", "key": "/exit"}}),
                encoding="utf-8",
            )
            env = {k: v for k, v in os.environ.items() if k != "OPENCODE_API_KEY"}
            env.pop("OPENCODE_GO_API_KEY", None)
            with mock.patch.dict(os.environ, env, clear=True):
                with mock.patch.object(Path, "home", return_value=Path(tmp)):
                    self.assertIsNone(m.load_api_key())


class NormalizeModelTests(unittest.TestCase):
    def test_cli_default(self):
        self.assertEqual(m.normalize_model(None, "cli"), "opencode/big-pickle")

    def test_cli_prefixes_provider(self):
        self.assertEqual(m.normalize_model("big-pickle", "cli"), "opencode/big-pickle")
        self.assertEqual(
            m.normalize_model("opencode/glm-5.3-flash", "cli"),
            "opencode/glm-5.3-flash",
        )

    def test_http_default_and_strip(self):
        self.assertEqual(m.normalize_model("", "http"), "big-pickle")
        self.assertEqual(m.normalize_model("opencode/big-pickle", "http"), "big-pickle")


class CliTextTests(unittest.TestCase):
    def test_extracts_text_events(self):
        stdout = "\n".join([
            "> build - big-pickle",
            '{"type":"step_start","part":{"type":"step-start"}}',
            '{"type":"text","part":{"type":"text","text":"Hal"}}',
            '{"type":"text","part":{"type":"text","text":"lo"}}',
            '{"type":"step_finish","part":{"type":"step-finish"}}',
            "not json at all",
        ])
        self.assertEqual(m._extract_cli_text(stdout), "Hallo")

    def test_ignores_non_text_parts(self):
        stdout = '{"type":"text","part":{"type":"reasoning","text":"x"}}'
        self.assertEqual(m._extract_cli_text(stdout), "")

    def test_messages_to_prompt(self):
        messages = [
            {"role": "system", "content": "Sei knapp."},
            {"role": "user", "content": "Frage?"},
        ]
        self.assertEqual(m.messages_to_prompt(messages), "Sei knapp.\n\nFrage?")


class PipelineTests(unittest.TestCase):
    def test_dry_run_uses_injected_generator(self):
        captured = {}

        def fake_generator(messages):
            captured["messages"] = messages
            return json.dumps([
                {"block": 0, "question": "Was ist ein Diagramm?",
                 "options": ["A", "B", "C", "D"], "correct": 0}
            ])

        with mock.patch.object(m, "fetch_article", return_value=WIKI_HTML):
            result = m.create_for_article(
                "https://de.wikipedia.org/wiki/A", "Uni", {"_id": "q1", "subject": "informatics"},
                backend="cli", dry_run=True, generator=fake_generator, log=lambda *a: None,
            )

        self.assertTrue(result["dry_run"])
        self.assertEqual(result["exercises"], 1)
        self.assertIn("Aktivit\u00e4tsdiagramm", captured["messages"][1]["content"])

    def test_http_without_key_raises(self):
        with mock.patch.object(m, "fetch_article", return_value=WIKI_HTML):
            with mock.patch.object(m, "load_api_key", return_value=None):
                with self.assertRaises(RuntimeError):
                    m.create_for_article(
                        "https://de.wikipedia.org/wiki/A", "Uni",
                        {"_id": "q1", "subject": "informatics"},
                        backend="http", dry_run=True, log=lambda *a: None,
                    )


if __name__ == "__main__":
    unittest.main(verbosity=2)
