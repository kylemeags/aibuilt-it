declare module 'astro:content' {
	interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"articles": {
"anthropic-ceo-dario-amodei-calls-openai-s-messaging-around-military-deal-straight-up-lies-report-says.md": {
	id: "anthropic-ceo-dario-amodei-calls-openai-s-messaging-around-military-deal-straight-up-lies-report-says.md";
  slug: "anthropic-ceo-dario-amodei-calls-openai-s-messaging-around-military-deal-straight-up-lies-report-says";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"apple-music-to-add-transparency-tags-to-distinguish-ai-music-says-report.md": {
	id: "apple-music-to-add-transparency-tags-to-distinguish-ai-music-says-report.md";
  slug: "apple-music-to-add-transparency-tags-to-distinguish-ai-music-says-report";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"coruna-ios-exploit-kit-uses-23-exploits-across-five-chains-targeting-ios-13-17-2-1.md": {
	id: "coruna-ios-exploit-kit-uses-23-exploits-across-five-chains-targeting-ios-13-17-2-1.md";
  slug: "coruna-ios-exploit-kit-uses-23-exploits-across-five-chains-targeting-ios-13-17-2-1";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"father-sues-google-claiming-gemini-chatbot-drove-son-into-fatal-delusion.md": {
	id: "father-sues-google-claiming-gemini-chatbot-drove-son-into-fatal-delusion.md";
  slug: "father-sues-google-claiming-gemini-chatbot-drove-son-into-fatal-delusion";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"getting-started.md": {
	id: "getting-started.md";
  slug: "getting-started";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"google-search-rolls-out-gemini-s-canvas-in-ai-mode-to-all-us-users.md": {
	id: "google-search-rolls-out-gemini-s-canvas-in-ai-mode-to-all-us-users.md";
  slug: "google-search-rolls-out-gemini-s-canvas-in-ai-mode-to-all-us-users";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"new-rfp-template-for-ai-usage-control-and-ai-governance.md": {
	id: "new-rfp-template-for-ai-usage-control-and-ai-governance.md";
  slug: "new-rfp-template-for-ai-usage-control-and-ai-governance";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"one-startup-s-pitch-to-provide-more-reliable-ai-answers-crowdsource-the-chatbots.md": {
	id: "one-startup-s-pitch-to-provide-more-reliable-ai-answers-crowdsource-the-chatbots.md";
  slug: "one-startup-s-pitch-to-provide-more-reliable-ai-answers-crowdsource-the-chatbots";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"open-source-cyberstrikeai-deployed-in-ai-driven-fortigate-attacks-across-55-countries.md": {
	id: "open-source-cyberstrikeai-deployed-in-ai-driven-fortigate-attacks-across-55-countries.md";
  slug: "open-source-cyberstrikeai-deployed-in-ai-driven-fortigate-attacks-across-55-countries";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"tailwind-tips.md": {
	id: "tailwind-tips.md";
  slug: "tailwind-tips";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"use-canvas-in-ai-mode-to-get-things-done-and-bring-your-ideas-to-life-right-in-search.md": {
	id: "use-canvas-in-ai-mode-to-get-things-done-and-bring-your-ideas-to-life-right-in-search.md";
  slug: "use-canvas-in-ai-mode-to-get-things-done-and-bring-your-ideas-to-life-right-in-search";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
"why-ai-startups-are-selling-the-same-equity-at-two-different-prices.md": {
	id: "why-ai-startups-are-selling-the-same-equity-at-two-different-prices.md";
  slug: "why-ai-startups-are-selling-the-same-equity-at-two-different-prices";
  body: string;
  collection: "articles";
  data: InferEntrySchema<"articles">
} & { render(): Render[".md"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = typeof import("../../src/content/config.js");
}
