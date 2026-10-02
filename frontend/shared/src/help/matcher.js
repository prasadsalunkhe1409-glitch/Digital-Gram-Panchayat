import { CITIZEN_TOPICS } from './topics.citizen.js';
import { OFFICER_TOPICS } from './topics.officer.js';

// Imported from the topic modules directly rather than from ./index.js: index re-exports this
// file, and a cycle between them is fragile under bundler tree-shaking.
const ALL_TOPICS = [...CITIZEN_TOPICS, ...OFFICER_TOPICS];
const forAudience = (audience) =>
  ALL_TOPICS.filter((t) => t.audience === audience || t.audience === 'both');

/**
 * Deterministic, offline question matcher for the Help Assistant.
 *
 * There is no language model here, by design: the assistant answers questions about how to get a
 * birth certificate or pay tax, and a plausible-but-wrong answer sends a citizen to the office
 * with the wrong papers. Every reply is an authored topic or an explicit "I'm not sure" — the
 * matcher only ever *selects*, never *composes*.
 *
 * Pipeline: normalize -> tokenize -> detect language -> expand synonyms -> score -> threshold.
 */

/** Confidence bands. Below `LOW` the assistant must not answer with a single topic. */
export const CONFIDENCE = { HIGH: 0.62, LOW: 0.3 };

/**
 * Cross-language and colloquial synonyms. The left side is what a user might type; the right
 * side are terms that appear in the knowledge base. This is what lets a Marathi speaker type
 * "दाखला" and reach the English-titled certificate guides, and an English speaker type "satbara".
 */
const SYNONYMS = {
  // certificates
  dakhala: ['certificate', 'दाखला'],
  दाखला: ['certificate', 'dakhala'],
  प्रमाणपत्र: ['certificate', 'dakhala'],
  certificate: ['dakhala', 'दाखला'],
  satbara: ['7/12', 'land', 'उतारा'],
  सातबारा: ['7/12', 'land', 'उतारा'],
  janma: ['birth', 'जन्म'],
  जन्म: ['birth'],
  mrityu: ['death', 'मृत्यू'],
  मृत्यू: ['death'],
  rahivasi: ['residence', 'रहिवासी'],
  रहिवासी: ['residence'],
  vivah: ['marriage', 'विवाह'],
  विवाह: ['marriage'],
  lagna: ['marriage', 'विवाह'],
  लग्न: ['marriage', 'विवाह'],
  // complaints
  takrar: ['complaint', 'तक्रार'],
  तक्रार: ['complaint'],
  complaint: ['तक्रार', 'grievance'],
  grievance: ['complaint', 'तक्रार'],
  // tax
  kar: ['tax', 'कर'],
  कर: ['tax'],
  tax: ['कर', 'घरपट्टी', 'पाणीपट्टी'],
  घरपट्टी: ['tax', 'property'],
  पाणीपट्टी: ['tax', 'water'],
  // schemes / notices
  yojana: ['scheme', 'योजना'],
  योजना: ['scheme'],
  scheme: ['योजना', 'yojana'],
  suchana: ['notice', 'सूचना'],
  सूचना: ['notice', 'notification'],
  notice: ['सूचना'],
  // people / places
  sarpanch: ['directory', 'सरपंच', 'official'],
  सरपंच: ['directory', 'sarpanch'],
  ग्रामसेवक: ['directory', 'gram sevak'],
  talathi: ['directory', 'तलाठी'],
  // actions
  login: ['log in', 'signin', 'लॉगिन'],
  लॉगिन: ['login'],
  register: ['signup', 'नोंदणी', 'account'],
  नोंदणी: ['register', 'account'],
  password: ['पासवर्ड'],
  पासवर्ड: ['password'],
  download: ['डाउनलोड', 'save', 'print'],
  डाउनलोड: ['download'],
  bhasha: ['language', 'भाषा'],
  भाषा: ['language'],
  // misc
  emergency: ['आपत्कालीन', 'police', 'ambulance', 'helpline'],
  आपत्कालीन: ['emergency', 'helpline'],
  qr: ['verify', 'पडताळणी'],
  पडताळणी: ['verify', 'qr'],
};

/** Words that carry no signal; dropped before scoring so they can't inflate a match. */
const STOPWORDS = new Set([
  'how',
  'do',
  'i',
  'to',
  'the',
  'a',
  'an',
  'my',
  'is',
  'can',
  'what',
  'where',
  'and',
  'for',
  'of',
  'in',
  'on',
  'me',
  'you',
  'it',
  'this',
  'that',
  'please',
  'help',
  'want',
  'need',
  'get',
  'कसे',
  'कसा',
  'कशी',
  'काय',
  'मी',
  'मला',
  'आहे',
  'करावी',
  'करावे',
  'करायचे',
  'व',
  'आणि',
  'का',
]);

/**
 * Lowercase, strip punctuation, collapse whitespace.
 *
 * `\p{M}` (combining marks) must be kept: Devanagari vowel signs and the virama are marks, not
 * letters, so a letters-only filter turns "तक्रार" into "तक र र" and silently breaks every
 * Marathi match.
 */
export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}/\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split into meaningful tokens (stopwords removed, 1-character noise dropped). */
export function tokenize(text) {
  return normalize(text)
    .split(' ')
    .filter((w) => w && w.length > 1 && !STOPWORDS.has(w));
}

/** 'mr' when the text contains Devanagari, otherwise 'en'. */
export function detectLanguage(text) {
  return /[ऀ-ॿ]/.test(String(text || '')) ? 'mr' : 'en';
}

/** Expand tokens with their synonyms so a query in either language reaches the same topics. */
export function expand(tokens) {
  const out = new Set(tokens);
  tokens.forEach((tok) =>
    (SYNONYMS[tok] || []).forEach((s) =>
      normalize(s)
        .split(' ')
        .forEach((w) => out.add(w)),
    ),
  );
  return [...out];
}

/** Everything about a topic that a query can match against, weighted by field. */
function fields(topic) {
  const join = (...vals) =>
    normalize(
      vals
        .flat()
        .filter(Boolean)
        .map((v) => (typeof v === 'string' ? v : `${v.en || ''} ${v.mr || ''}`))
        .join(' '),
    );
  return {
    title: join(topic.title),
    keywords: join(
      [...(topic.keywords?.en || []), ...(topic.keywords?.mr || [])],
      topic.id.replace(/-/g, ' '),
    ),
    summary: join(topic.summary),
    body: join(
      (topic.steps || []).map((s) => s.text),
      (topic.faqs || []).map((f) => f.q),
      (topic.faqs || []).map((f) => f.a),
      topic.requirements || [],
    ),
  };
}

// A hit in the title is worth far more than a hit deep in the body.
const WEIGHTS = { title: 5, keywords: 4, summary: 2, body: 1 };

/**
 * Score every candidate topic for a question and return them ranked, with a normalised
 * confidence in [0,1]. Confidence is the share of the query's own tokens that matched,
 * weighted by where they matched — so a question whose words all appear in a topic title
 * scores near 1, and a question that only glances off one body word scores near 0.
 *
 * @param {string} question
 * @param {{ audience?: 'citizen'|'officer', route?: string }} [options]
 * @returns {{ topic: object, score: number, confidence: number }[]}
 */
export function rankTopics(question, { audience } = {}) {
  const pool = audience ? forAudience(audience) : ALL_TOPICS;
  const baseTokens = tokenize(question);
  if (baseTokens.length === 0) return [];
  const tokens = expand(baseTokens);

  // Best possible score for this query: every original token hitting a title.
  const max = baseTokens.length * WEIGHTS.title;

  return (
    pool
      .map((topic) => {
        const f = fields(topic);
        let score = 0;
        const matchedBase = new Set();

        tokens.forEach((tok) => {
          let best = 0;
          for (const [field, weight] of Object.entries(WEIGHTS)) {
            const hay = f[field];
            if (!hay) continue;
            // Whole-word match scores full weight; a partial (prefix) match scores less, which
            // lets "certif" find "certificate" without letting "car" match "card" too strongly.
            if (new RegExp(`(^| )${tok}( |$)`).test(hay)) best = Math.max(best, weight);
            else if (tok.length >= 4 && hay.includes(tok)) best = Math.max(best, weight * 0.6);
          }
          if (best > 0) {
            score += best;
            if (baseTokens.includes(tok)) matchedBase.add(tok);
          }
        });

        if (score === 0) return null;
        // Confidence blends how much of the query matched with how strongly it matched.
        const coverage = matchedBase.size / baseTokens.length;
        const strength = Math.min(1, score / max);
        const confidence = Math.min(1, coverage * 0.65 + strength * 0.35);
        return { topic, score, confidence };
      })
      .filter(Boolean)
      // Confidence first, raw score only as the tie-breaker. How much of the user's question a
      // topic accounts for matters more than how often it repeats a word: asking "birth
      // certificate" must reach the Birth guide, not the certificates overview that happens to
      // say "certificate" in more places.
      .sort((a, b) => b.confidence - a.confidence || b.score - a.score)
  );
}

/**
 * Answer a question. Returns a discriminated result the UI renders directly — it never
 * fabricates prose.
 *
 *  - `answer`   : one confident topic (plus alternatives).
 *  - `clarify`  : matched something, but not confidently — show the closest topics and let the
 *                 user choose, rather than guessing for them.
 *  - `fallback` : nothing matched — point at the Help Center and the Gram Panchayat office.
 *
 * @param {string} question
 * @param {{ audience?: 'citizen'|'officer' }} [options]
 */
export function answerQuestion(question, { audience } = {}) {
  const ranked = rankTopics(question, { audience });
  const lang = detectLanguage(question);

  if (ranked.length === 0) return { kind: 'fallback', lang, topics: [] };

  const top = ranked[0];
  if (top.confidence >= CONFIDENCE.HIGH) {
    return {
      kind: 'answer',
      lang,
      topic: top.topic,
      confidence: top.confidence,
      alternatives: ranked.slice(1, 4).map((r) => r.topic),
    };
  }
  if (top.confidence >= CONFIDENCE.LOW) {
    return { kind: 'clarify', lang, topics: ranked.slice(0, 4).map((r) => r.topic) };
  }
  return { kind: 'fallback', lang, topics: ranked.slice(0, 3).map((r) => r.topic) };
}

/**
 * Questions to offer before the user types anything. Topics whose `route` matches the screen
 * the user is on come first, so the assistant is about *where they are*.
 *
 * @param {{ audience?: 'citizen'|'officer', route?: string, limit?: number }} [options]
 */
export function suggestedTopics({ audience, route, limit = 4 } = {}) {
  const pool = audience ? forAudience(audience) : ALL_TOPICS;
  const onThisScreen = route ? pool.filter((t) => t.route && t.route === route) : [];
  const nearThisScreen = route
    ? pool.filter(
        (t) => t.route && t.route !== route && route.startsWith(t.route) && t.route !== '/',
      )
    : [];
  const rest = pool.filter((t) => !onThisScreen.includes(t) && !nearThisScreen.includes(t));
  return [...onThisScreen, ...nearThisScreen, ...rest].slice(0, limit);
}
