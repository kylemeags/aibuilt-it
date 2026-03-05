/**
 * relevance.js
 *
 * "Real Implementation" relevance scoring filter.
 *
 * Scores standardized result items based on signals that indicate a genuine
 * AI implementation story (case study, tool launch, how-to, etc.) rather
 * than generic commentary or academic research.
 *
 * Also classifies items by content type and category for downstream use.
 *
 * Usage:
 *   import { scoreForRelevance, filterByRelevance, classifyContentType, classifyCategory } from './relevance.js';
 *   const scored = items.map(i => ({ ...i, score: scoreForRelevance(i) }));
 *   const filtered = filterByRelevance(items, 20);
 */

// ---------------------------------------------------------------------------
// Signal dictionaries
// ---------------------------------------------------------------------------

const IMPLEMENTATION_PHRASES = [
  'built',
  'automated',
  'saved .* hours',
  'increased revenue',
  'case study',
  'how i',
  'how we',
  'i made',
  'we made',
  'i created',
  'we created',
  'i built',
  'we built',
  'i automated',
  'we automated',
  'i replaced',
  'we replaced',
  'from scratch',
  'step by step',
  'our results',
  'real results',
  'in production',
];

const TOOL_NAMES = [
  'chatgpt',
  'gpt-4',
  'gpt-4o',
  'gpt4',
  'claude',
  'anthropic',
  'jasper',
  'zapier',
  'make\\.com',
  'make ',
  'n8n',
  'midjourney',
  'dall-e',
  'dalle',
  'stable diffusion',
  'cursor',
  'copilot',
  'github copilot',
  'notion ai',
  'otter\\.ai',
  'descript',
  'runway',
  'synthesia',
  'heygen',
  'elevenlabs',
  'whisper',
  'perplexity',
  'gemini',
  'llama',
  'mistral',
  'hugging face',
  'huggingface',
  'replicate',
  'vercel ai',
  'langchain',
  'llamaindex',
  'autogpt',
  'auto-gpt',
  'openai',
  'suno',
  'udio',
  'adobe firefly',
  'canva ai',
  'grammarly',
  'copy\\.ai',
  'writesonic',
  'surfer seo',
  'semrush ai',
  'ahrefs ai',
  'instantly\\.ai',
  'apollo\\.io',
  'lavender\\.ai',
  'superhuman',
  'reclaim\\.ai',
  'fireflies\\.ai',
  'otter ai',
  'tidio',
  'intercom fin',
  'zendesk ai',
  'drift',
];

const RESULTS_SIGNALS = [
  '\\$\\d',
  '\\d+%',
  'hours saved',
  'hours per',
  'roi',
  '10x',
  '\\d+x ',
  'revenue',
  'conversions',
  'converted',
  'reduced .* by',
  'increased .* by',
  'saved .* per',
  'boosted',
  'grew .* to',
  'from .* to .*\\d',
];

const LAUNCH_SIGNALS = [
  'show hn',
  'i built',
  'i made',
  'launched',
  'shipped',
  'just released',
  'introducing',
  'announcing',
  'now available',
  'open source',
  'side project',
];

const GENERAL_DISCUSSION_SIGNALS = [
  'what do you think',
  'will ai',
  'opinion',
  'debate',
  'hot take',
  'unpopular opinion',
  'change my mind',
  'thoughts on',
  'do you think',
  'rant',
  'am i the only',
  'does anyone else',
  'eli5',
  'cmv',
];

const ACADEMIC_SIGNALS = [
  'fine-tune',
  'fine tune',
  'finetune',
  'training loss',
  'cuda',
  'pytorch',
  'tensorflow',
  'arxiv',
  'paper:',
  'preprint',
  'ablation',
  'benchmark results',
  'perplexity score',
  'bleu score',
  'sota ',
  'state-of-the-art',
  'gradient descent',
  'backpropagation',
  'transformer architecture',
  'attention mechanism',
  'epoch',
  'hyperparameter',
];

const NEGATIVE_SIGNALS = [
  'scam',
  'overhyped',
  'bubble',
  'lawsuit',
  'sued',
  'layoff',
  'laid off',
  'shutdown',
  'shut down',
  'going away',
  'dead',
  'rip ',
  'waste of',
  'don\'t bother',
  'avoid',
  'disappointed',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether any pattern in a list matches the given text.
 * Patterns can contain regex syntax (e.g. `saved .* hours`).
 */
function matchesAny(text, patterns) {
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern, 'i').test(text)) return true;
    } catch {
      // If the pattern is invalid regex, fall back to includes
      if (text.includes(pattern)) return true;
    }
  }
  return false;
}

/**
 * Count how many patterns in a list match the given text.
 */
function countMatches(text, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    try {
      if (new RegExp(pattern, 'i').test(text)) count++;
    } catch {
      if (text.includes(pattern)) count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Score a standardized result item for "real implementation" relevance.
 *
 * @param {Object} item - A standardized result object (title, summary, source, etc.)
 * @returns {number} A numeric relevance score (higher = more relevant).
 */
export function scoreForRelevance(item) {
  let score = 0;
  const title = (item.title || '').toLowerCase();
  const summary = (item.summary || '').toLowerCase();
  const combined = `${title} ${summary}`;

  // +30: Implementation language in title
  if (matchesAny(title, IMPLEMENTATION_PHRASES)) {
    score += 30;
  }

  // +20: Implementation language in summary/body
  if (matchesAny(summary, IMPLEMENTATION_PHRASES)) {
    score += 20;
  }

  // +25: Specific tool mentions in title
  if (matchesAny(title, TOOL_NAMES)) {
    score += 25;
  }

  // +15: Specific tool mentions in summary
  if (matchesAny(summary, TOOL_NAMES)) {
    score += 15;
  }

  // +20: Results/metrics signals anywhere
  if (matchesAny(combined, RESULTS_SIGNALS)) {
    score += 20;
  }

  // +15: "Show HN" / "I built" / launch signals
  if (matchesAny(combined, LAUNCH_SIGNALS)) {
    score += 15;
  }

  // +10/+20/+30: Source engagement bonus
  const upvotes = item.upvotes || item.points || 0;
  if (upvotes > 200) {
    score += 30;
  } else if (upvotes > 100) {
    score += 20;
  } else if (upvotes > 50) {
    score += 10;
  }

  // -20: Too general/discussion-like
  if (matchesAny(combined, GENERAL_DISCUSSION_SIGNALS)) {
    score -= 20;
  }

  // -15: Too technical/academic
  if (matchesAny(combined, ACADEMIC_SIGNALS)) {
    score -= 15;
  }

  // -10: Negative sentiment
  if (matchesAny(combined, NEGATIVE_SIGNALS)) {
    score -= 10;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Score all items for relevance, filter out those below the threshold,
 * and return the remaining items sorted by score descending.
 *
 * @param {Array} items - Array of standardized result objects.
 * @param {number} [minScore=20] - Minimum score to keep an item.
 * @returns {Array} Filtered and sorted items with `score` property updated.
 */
export function filterByRelevance(items, minScore = 20) {
  const scored = items.map((item) => ({
    ...item,
    score: scoreForRelevance(item),
  }));

  return scored
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Content type classification
// ---------------------------------------------------------------------------

/**
 * Classify the content type of a standardized result item.
 *
 * @param {Object} item
 * @returns {'case-study'|'tool-review'|'how-to'|'news'|'roundup'}
 */
export function classifyContentType(item) {
  const title = (item.title || '').toLowerCase();
  const summary = (item.summary || '').toLowerCase();
  const combined = `${title} ${summary}`;

  // Case study signals
  const caseStudyPatterns = [
    'case study',
    'how i',
    'how we',
    'our results',
    'real results',
    'saved .* hours',
    'increased .* by',
    'reduced .* by',
    'grew .* from',
    'i built',
    'we built',
    'i automated',
    'we automated',
    'in production',
  ];
  if (matchesAny(combined, caseStudyPatterns)) return 'case-study';

  // Tool review signals
  const reviewPatterns = [
    'review',
    'vs\\.?\\s',
    'versus',
    'compared',
    'comparison',
    'honest review',
    'pros and cons',
    'worth it',
    'tried',
    'tested',
    'my experience with',
    'after \\d+ (days|weeks|months)',
  ];
  if (matchesAny(combined, reviewPatterns)) return 'tool-review';

  // How-to signals
  const howToPatterns = [
    'how to',
    'tutorial',
    'guide',
    'step.by.step',
    'walkthrough',
    'getting started',
    'beginner',
    'set up',
    'setup',
    'configure',
    'integrate',
    'workflow',
    'automate your',
    'tips for',
    'tricks',
  ];
  if (matchesAny(combined, howToPatterns)) return 'how-to';

  // Roundup signals
  const roundupPatterns = [
    'best \\d+',
    'top \\d+',
    '\\d+ best',
    '\\d+ top',
    'roundup',
    'round-up',
    'alternatives',
    'tools for',
    'apps for',
    'resources',
    'ultimate list',
    'curated',
  ];
  if (matchesAny(combined, roundupPatterns)) return 'roundup';

  // Default to news
  return 'news';
}

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

/**
 * Classify which of the 8 site categories an item best fits into.
 *
 * @param {Object} item
 * @returns {'marketing-seo'|'video-creative'|'sales-crm'|'automation'|'writing-content'|'customer-support'|'data-analytics'|'ai-news'}
 */
export function classifyCategory(item) {
  const title = (item.title || '').toLowerCase();
  const summary = (item.summary || '').toLowerCase();
  const combined = `${title} ${summary}`;

  // Marketing & SEO
  const marketingPatterns = [
    'seo',
    'marketing',
    'google ads',
    'facebook ads',
    'social media',
    'content marketing',
    'email marketing',
    'newsletter',
    'blog post',
    'organic traffic',
    'keyword',
    'backlink',
    'surfer',
    'semrush',
    'ahrefs',
    'rank',
    'serp',
    'ad copy',
    'landing page',
    'conversion rate',
    'lead gen',
    'lead magnet',
    'brand',
    'campaign',
  ];
  if (countMatches(combined, marketingPatterns) >= 2) return 'marketing-seo';

  // Video & Creative
  const videoPatterns = [
    'video',
    'youtube',
    'tiktok',
    'thumbnail',
    'midjourney',
    'dall-e',
    'dalle',
    'stable diffusion',
    'image generation',
    'runway',
    'synthesia',
    'heygen',
    'descript',
    'creative',
    'design',
    'illustration',
    'visual',
    'animation',
    'podcast',
    'audio',
    'elevenlabs',
    'suno',
    'udio',
    'music',
    'adobe firefly',
    'canva',
    'photoshop',
    'editing',
  ];
  if (countMatches(combined, videoPatterns) >= 2) return 'video-creative';

  // Sales & CRM
  const salesPatterns = [
    'sales',
    'crm',
    'cold email',
    'outreach',
    'pipeline',
    'deal',
    'prospect',
    'lead scoring',
    'salesforce',
    'hubspot',
    'apollo',
    'instantly',
    'lavender',
    'close rate',
    'revenue',
    'b2b',
    'client',
    'proposal',
    'demo',
    'booking',
    'meetings',
  ];
  if (countMatches(combined, salesPatterns) >= 2) return 'sales-crm';

  // Automation
  const automationPatterns = [
    'automat',
    'workflow',
    'zapier',
    'make\\.com',
    'n8n',
    'integromat',
    'ifttt',
    'api',
    'no-code',
    'nocode',
    'low-code',
    'integration',
    'bot ',
    'scraping',
    'scraper',
    'rpa',
    'pipeline',
    'cron',
    'schedule',
    'trigger',
    'webhook',
  ];
  if (countMatches(combined, automationPatterns) >= 2) return 'automation';

  // Writing & Content
  const writingPatterns = [
    'writing',
    'writer',
    'copywriting',
    'copy',
    'blog',
    'article',
    'content',
    'jasper',
    'grammarly',
    'writesonic',
    'copy\\.ai',
    'notion ai',
    'draft',
    'editing',
    'proofread',
    'summarize',
    'summarization',
    'translate',
    'transcri',
    'chatgpt.*writ',
    'gpt.*writ',
    'prompt',
  ];
  if (countMatches(combined, writingPatterns) >= 2) return 'writing-content';

  // Customer Support
  const supportPatterns = [
    'customer support',
    'customer service',
    'chatbot',
    'chat bot',
    'helpdesk',
    'help desk',
    'ticket',
    'intercom',
    'zendesk',
    'drift',
    'tidio',
    'freshdesk',
    'support agent',
    'live chat',
    'faq',
    'knowledge base',
    'response time',
    'resolution',
    'onboarding',
  ];
  if (countMatches(combined, supportPatterns) >= 2) return 'customer-support';

  // Data & Analytics
  const dataPatterns = [
    'data',
    'analytics',
    'dashboard',
    'report',
    'spreadsheet',
    'excel',
    'google sheets',
    'visualization',
    'chart',
    'insight',
    'metrics',
    'kpi',
    'sql',
    'database',
    'warehouse',
    'bi ',
    'business intelligence',
    'forecast',
    'predict',
    'trend',
    'segment',
    'cohort',
  ];
  if (countMatches(combined, dataPatterns) >= 2) return 'data-analytics';

  // Default to AI News
  return 'ai-news';
}
