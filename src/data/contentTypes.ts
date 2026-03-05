export type ContentType = 'case-study' | 'tool-review' | 'how-to' | 'news' | 'roundup';

export interface ContentTypeInfo {
  slug: ContentType;
  label: string;
  pillColor: string;
}

export const contentTypes: ContentTypeInfo[] = [
  { slug: 'case-study', label: 'Case Study', pillColor: 'text-indigo-300 bg-indigo-400/10 border border-indigo-400/20' },
  { slug: 'tool-review', label: 'Tool Review', pillColor: 'text-slate-300 bg-slate-400/10 border border-slate-400/20' },
  { slug: 'how-to', label: 'How-To', pillColor: 'text-green-300 bg-green-400/10 border border-green-400/20' },
  { slug: 'news', label: 'News', pillColor: 'text-yellow-300 bg-yellow-400/10 border border-yellow-400/20' },
  { slug: 'roundup', label: 'Roundup', pillColor: 'text-pink-300 bg-pink-400/10 border border-pink-400/20' },
];

export function getContentTypeInfo(type: ContentType): ContentTypeInfo | undefined {
  return contentTypes.find((ct) => ct.slug === type);
}
