export interface Category {
  slug: string;
  name: string;
  description: string;
  badgeColor: string;
  badgeBg: string;
  icon: string;
}

export const categories: Category[] = [
  {
    slug: 'marketing-seo',
    name: 'Marketing & SEO',
    description: 'AI for content marketing, ad copy, social media',
    badgeColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-400/10 border border-emerald-400/20',
    icon: 'trending-up',
  },
  {
    slug: 'video-creative',
    name: 'Video & Creative',
    description: 'AI video editing, image gen, design tools',
    badgeColor: 'text-violet-400',
    badgeBg: 'bg-violet-400/10 border border-violet-400/20',
    icon: 'film',
  },
  {
    slug: 'sales-crm',
    name: 'Sales & CRM',
    description: 'Lead gen, outreach automation, CRM AI',
    badgeColor: 'text-sky-400',
    badgeBg: 'bg-sky-400/10 border border-sky-400/20',
    icon: 'target',
  },
  {
    slug: 'automation',
    name: 'Automation & Workflows',
    description: 'No-code AI workflows, Zapier/Make/n8n',
    badgeColor: 'text-amber-400',
    badgeBg: 'bg-amber-400/10 border border-amber-400/20',
    icon: 'zap',
  },
  {
    slug: 'writing-content',
    name: 'Writing & Content',
    description: 'AI copywriting, content generation',
    badgeColor: 'text-rose-400',
    badgeBg: 'bg-rose-400/10 border border-rose-400/20',
    icon: 'pen-tool',
  },
  {
    slug: 'customer-support',
    name: 'Customer Support',
    description: 'AI chatbots, helpdesk, voice AI',
    badgeColor: 'text-teal-400',
    badgeBg: 'bg-teal-400/10 border border-teal-400/20',
    icon: 'headphones',
  },
  {
    slug: 'data-analytics',
    name: 'Data & Analytics',
    description: 'AI for BI, reporting, spreadsheets',
    badgeColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-400/10 border border-cyan-400/20',
    icon: 'bar-chart',
  },
  {
    slug: 'ai-news',
    name: 'AI News',
    description: 'Industry news, funding, regulation',
    badgeColor: 'text-orange-400',
    badgeBg: 'bg-orange-400/10 border border-orange-400/20',
    icon: 'newspaper',
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
