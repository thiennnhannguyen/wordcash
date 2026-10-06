"""
AI giả cho test quy trình kho từ: trả lời có tính toán (không ngẫu nhiên) theo loại prompt nhận ra từ nội dung system prompt.
Không gọi mạng. Dùng chung cho test đơn vị và test tích hợp toàn quy trình.
"""

import json
import re

from data_pipeline.lib.ai import FakeAIClient

TOPIC_OF = {
    "hello": "greetings", "goodbye": "greetings", "name": "greetings", "friend": "greetings", "happy": "greetings",
    "mother": "family", "father": "family", "brother": "family", "sister": "family", "baby": "family", "old": "family",
    "one": "numbers_time", "two": "numbers_time", "monday": "numbers_time", "clock": "numbers_time", "morning": "numbers_time",
    "rice": "food", "apple": "food", "water": "food", "eat": "food", "drink": "food", "noodle": "food", "egg": "food",
    "house": "home", "room": "home", "bed": "home", "door": "home", "kitchen": "home",
    "bus": "travel", "car": "travel", "street": "travel", "bike": "travel", "train": "travel",
    "shop": "shopping", "money": "shopping", "buy": "shopping", "shirt": "shopping", "red": "shopping",
    "rain": "weather", "sun": "weather", "hot": "weather", "cold": "weather", "wind": "weather",
    "dog": "nature", "cat": "nature", "tree": "nature", "river": "nature", "flower": "nature",
    "book": "school", "pen": "school", "teacher": "school", "student": "school", "read": "school",
}
LOW_CONFIDENCE = {"happy", "old", "red"}


def _classify(user: str) -> str:
    out = []
    for m in re.finditer(r'\{"headword": "([^"]+)", "pos": "([^"]+)"\}', user):
        head, pos = m.groups()
        out.append({"headword": head, "pos": pos, "topic_code": TOPIC_OF.get(head, "greetings"),
                    "confidence": 0.4 if head in LOW_CONFIDENCE else 0.9, "reason": "fake",
                    "commonness": 5 if len(head) <= 4 else 3, "basic_communication": head in ("hello", "goodbye"),
                    "subgroup": "group " + head[0]})
    return json.dumps(out)


def _letters(n: int) -> str:
    s = ""
    n += 1
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(97 + r) + s
    return s


def _generated(system: str, kind: str) -> str:
    topic = re.search(r'Topic: "(\w+)"', system).group(1)
    count = int(re.search(r"(?:Propose|needs) (\d+)", system).group(1))
    if kind == "phrases":
        return json.dumps([{"headword": f"good {topic[:4]} {_letters(i)}", "commonness": 4, "basic_communication": i == 0,
                            "subgroup": "phrases"} for i in range(count)])
    return json.dumps([{"headword": f"{topic[:3]}{_letters(i)}", "pos": "noun", "commonness": 2, "subgroup": "extra",
                        "reason": "fake"} for i in range(count)])


def handler(system: str, user: str) -> str:
    if "You classify English vocabulary" in system:
        return _classify(user)
    if "FIXED PHRASES" in system:
        return _generated(system, "phrases")
    if "more single words" in system:
        return _generated(system, "suggest")
    raise AssertionError("Prompt lạ: " + system[:80])


def client(custom=None) -> FakeAIClient:
    return FakeAIClient(custom or handler)
