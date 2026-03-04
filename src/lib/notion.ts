import { Client } from '@notionhq/client';

const notion = new Client({ auth: import.meta.env.NOTION_TOKEN });

const ARTICLES_DB = import.meta.env.NOTION_ARTICLES_DB;

interface NotionArticle {
  title: string;
  slug: string;
  date: string;
  tags: string[];
  excerpt: string;
  body: string;
  author: string;
}

function richTextToPlain(richText: any[]): string {
  if (!richText || !Array.isArray(richText)) return '';
  return richText.map((t: any) => t.plain_text || '').join('');
}

export async function getPublishedArticles(): Promise<NotionArticle[]> {
  const response = await notion.databases.query({
    database_id: ARTICLES_DB,
    filter: {
      property: 'Status',
      select: { equals: 'Published' },
    },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  return response.results.map((page: any) => {
    const props = page.properties;
    return {
      title: richTextToPlain(props.Title?.title || []),
      slug: richTextToPlain(props.Slug?.rich_text || []),
      date: props.Date?.date?.start || new Date().toISOString().split('T')[0],
      tags: (props.Tags?.multi_select || []).map((t: any) => t.name),
      excerpt: richTextToPlain(props.Excerpt?.rich_text || []),
      body: richTextToPlain(props.Body?.rich_text || []),
      author: richTextToPlain(props.Author?.rich_text || []) || 'aibuilt.it',
    };
  });
}
