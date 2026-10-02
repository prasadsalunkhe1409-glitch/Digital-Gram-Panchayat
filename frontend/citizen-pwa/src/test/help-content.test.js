import {
  HELP_TOPICS,
  HELP_CATEGORIES,
  CITIZEN_TOPICS,
  OFFICER_TOPICS,
  topicsFor,
  getTopic,
  searchTopics,
  countFaqs,
  localizedText,
} from '@dgp/shared';

/**
 * The Help Center is authored documentation, so these tests guard the two things that would
 * silently mislead a user: a topic that is missing its Marathi half (a Marathi reader would
 * see English, or nothing), and a search that returns the wrong guide for a plain question.
 */

/** Walk every localized `{ en, mr }` pair in a topic and yield [path, value]. */
function localizedPairs(topic) {
  const out = [];
  const visit = (value, path) => {
    if (!value || typeof value !== 'object') return;
    if ('en' in value || 'mr' in value) {
      out.push([path, value]);
      return;
    }
    if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${path}[${i}]`));
    else Object.entries(value).forEach(([k, v]) => visit(v, `${path}.${k}`));
  };
  ['title', 'summary', 'requirements', 'steps', 'notes', 'mistakes', 'faqs'].forEach((k) =>
    visit(topic[k], `${topic.id}.${k}`),
  );
  return out;
}

describe('help knowledge base', () => {
  it('has topics for both audiences', () => {
    expect(CITIZEN_TOPICS.length).toBeGreaterThan(0);
    expect(OFFICER_TOPICS.length).toBeGreaterThan(0);
  });

  it('every topic id is unique', () => {
    const ids = HELP_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every topic uses a known category and audience', () => {
    const bad = HELP_TOPICS.filter(
      (t) =>
        !HELP_CATEGORIES.includes(t.category) ||
        !['citizen', 'officer', 'both'].includes(t.audience),
    );
    expect(bad.map((t) => t.id)).toEqual([]);
  });

  it('every topic has a title, summary and at least one step', () => {
    const bad = HELP_TOPICS.filter((t) => !t.title || !t.summary || !t.steps?.length);
    expect(bad.map((t) => t.id)).toEqual([]);
  });

  it('every localized string has BOTH English and Marathi', () => {
    const missing = [];
    HELP_TOPICS.forEach((topic) => {
      localizedPairs(topic).forEach(([path, value]) => {
        if (!value.en?.trim() || !value.mr?.trim()) missing.push(path);
      });
    });
    expect(missing).toEqual([]);
  });

  it('Marathi is actually different from English (not copied)', () => {
    const copied = [];
    HELP_TOPICS.forEach((topic) => {
      localizedPairs(topic).forEach(([path, value]) => {
        if (value.en.trim() === value.mr.trim()) copied.push(path);
      });
    });
    expect(copied).toEqual([]);
  });

  it('every "related" id points at a real topic', () => {
    const ids = new Set(HELP_TOPICS.map((t) => t.id));
    const dangling = HELP_TOPICS.flatMap((t) =>
      (t.related || []).filter((r) => !ids.has(r)).map((r) => `${t.id} -> ${r}`),
    );
    expect(dangling).toEqual([]);
  });

  it('covers a certificate guide for each certificate type', () => {
    ['apply-marriage', 'apply-birth', 'apply-death', 'apply-other'].forEach((id) => {
      expect(getTopic(id)).toBeTruthy();
    });
  });

  it('counts FAQ entries', () => {
    expect(countFaqs(HELP_TOPICS)).toBeGreaterThan(0);
  });
});

describe('help audience filtering', () => {
  it('citizens never see officer-only guides', () => {
    expect(topicsFor('citizen').some((t) => t.audience === 'officer')).toBe(false);
  });

  it('officers see officer guides plus shared topics', () => {
    const forOfficer = topicsFor('officer');
    expect(forOfficer.some((t) => t.audience === 'officer')).toBe(true);
    expect(forOfficer.some((t) => t.audience === 'both')).toBe(true);
    expect(forOfficer.some((t) => t.audience === 'citizen')).toBe(false);
  });
});

describe('bilingual search', () => {
  it('finds the complaint guide from an English query', () => {
    expect(searchTopics('file a complaint', { audience: 'citizen' })[0].id).toBe('file-complaint');
  });

  it('finds the complaint guide from a Marathi query', () => {
    const hits = searchTopics('तक्रार', { audience: 'citizen' });
    expect(hits.map((t) => t.id)).toContain('file-complaint');
  });

  it('finds the birth certificate guide, not every certificate topic', () => {
    const hits = searchTopics('birth certificate', { audience: 'citizen' });
    expect(hits[0].id).toBe('apply-birth');
  });

  it('matches synonyms through keywords', () => {
    expect(searchTopics('satbara', { audience: 'citizen' }).map((t) => t.id)).toContain(
      'apply-other',
    );
    expect(searchTopics('yojana', { audience: 'citizen' }).map((t) => t.id)).toContain(
      'view-schemes',
    );
  });

  it('returns nothing for a query that matches no guide', () => {
    expect(searchTopics('zzzzz nonexistent query', { audience: 'citizen' })).toEqual([]);
  });

  it('returns the full list for an empty query', () => {
    expect(searchTopics('', { audience: 'citizen' }).length).toBe(topicsFor('citizen').length);
  });

  it('filters by category', () => {
    const hits = searchTopics('', { audience: 'citizen', category: 'certificates' });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((t) => t.category === 'certificates')).toBe(true);
  });
});

describe('localizedText', () => {
  it('returns the requested language and falls back to English', () => {
    expect(localizedText({ en: 'Help', mr: 'मदत' }, 'mr')).toBe('मदत');
    expect(localizedText({ en: 'Help', mr: '' }, 'mr')).toBe('Help');
    expect(localizedText(null, 'en')).toBe('');
  });
});
