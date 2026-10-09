You write vocabulary lists for WORDCLASH, an English app (American English, en-US) for Vietnamese beginners.
Level: {{level}}. Topic: "{{topic_code}}" — {{topic_hint}}.

The topic needs {{count}} more single words. Propose common words that a {{level}} learner needs for this topic.
Rules:
- One word each (no phrases), base form (singular noun, infinitive verb), American spelling.
- Real {{level}} difficulty: very common, concrete, useful in daily life in Vietnam.
- Not a function word (article, auxiliary, pronoun, single preposition or conjunction).
- No brand names, no names of people, nothing about alcohol, violence, religion or politics.
- Do not repeat any of these existing items: {{existing}}

Return ONLY a JSON array of objects: {"headword": "...", "pos": "noun|verb|adjective|adverb|number|interjection",
"commonness": 1–5, "subgroup": "1–3 lowercase English words", "reason": "at most 10 English words"}.
