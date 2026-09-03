// Per-archetype pages at /for/<slug>. Each one is written from how the engine
// actually treats that kind of site — the questions it generates, and the
// failure modes seen in real scans — so the pages carry information that exists
// nowhere else, rather than being a template filled with a different noun.

export interface Segment {
  slug: string;
  name: string; // short label, used in nav and lists
  title: string;
  description: string;
  intro: string;
  /** The shape of question the engine generates for this archetype. */
  questions: string[];
  /** What the audit reads on this kind of site to decide what it is. */
  reads: string[];
  pitfalls: { h: string; p: string }[];
  faqs: { q: string; a: string }[];
  updated: string;
}

export const SEGMENTS: Segment[] = [
  {
    slug: "local-business",
    name: "Local businesses",
    title: "AI search readiness for local businesses",
    description:
      "When somebody asks an AI assistant for a provider in their town, the answer names a " +
      "handful of businesses. Here is what decides whether yours is one of them.",
    intro:
      "A local business is asked for by place, not by name. Nobody types your company into " +
      "ChatGPT before they know you exist; they ask who does this work near them. That makes two " +
      "things decisive: whether a machine can tell what you do, and whether it can tell where you " +
      "do it. Most local sites are clear to a human on both counts and ambiguous to a machine on " +
      "at least one.",
    questions: [
      "Which providers are there for childcare in Ulm?",
      "Which childminders in Ulm are recommended?",
      "How do you recognise a trustworthy childcare provider?",
    ],
    reads: [
      "LocalBusiness schema and its subtypes, including the specific ones like ChildCare, Dentist or Plumber",
      "The postal address, phone number and opening hours, and whether they agree across pages",
      "The service named in your page titles, with the town and the brand affix stripped off",
    ],
    pitfalls: [
      {
        h: "The town appears only in the footer",
        p: "A place name in small print under the copyright is not a statement that you serve that area. The service and the place need to appear together, in a sentence, on the page about that service.",
      },
      {
        h: "The schema says Organization, not what you actually are",
        p: "Generic Organization markup tells a machine you exist. A LocalBusiness subtype tells it what kind of business you are, which is what a local question is matched against.",
      },
      {
        h: "The offer lives in the logo or a photo",
        p: "If the only place your service is named is inside an image, it does not exist for a crawler. The audit reads text; so does the model.",
      },
      {
        h: "Contact details disagree between pages",
        p: "A phone number that differs between the footer, the contact page and the schema is a trust problem before it is a data problem. Machines resolve the conflict by trusting none of them.",
      },
    ],
    faqs: [
      {
        q: "Do I need a Google Business Profile for AI search?",
        a: "It helps, because it is a corroborating source, but it does not replace your own site. Answer engines read your pages directly, and a profile cannot state facts your website contradicts.",
      },
      {
        q: "We serve several towns. Do we need a page for each?",
        a: "You need one page per town only if you can write something genuinely different on each. Ten near-identical pages with the place name swapped is the classic doorway pattern and reads as thin content to both search engines and models.",
      },
    ],
    updated: "2026-09-03",
  },
  {
    slug: "online-shop",
    name: "Online shops",
    title: "AI search readiness for online shops",
    description:
      "Shoppers now ask an assistant what to buy before they ever reach a shop. Whether your " +
      "products are in that answer depends on what your product pages state in machine-readable form.",
    intro:
      "A shop has the raw material an answer engine wants — names, prices, availability, " +
      "specifications — and usually hides most of it behind scripts, images and a filter " +
      "interface. The gap between what a shopper sees and what a crawler receives is wider on " +
      "shops than on any other kind of site.",
    questions: [
      "Which providers for garden saunas should be compared?",
      "How much does a Karibu Monterey sauna house cost?",
      "What are the alternatives to a barrel sauna?",
    ],
    reads: [
      "Product schema: name, price, currency, availability, and whether the seller is you",
      "The product category, which is the term buyers actually search for",
      "Whether the price a shopper sees matches the price in the markup",
    ],
    pitfalls: [
      {
        h: "The price is rendered by JavaScript",
        p: "A crawler that does not run scripts sees a product page with no price. Price is the single most-asked attribute in shopping questions, so this one omission removes you from most of them.",
      },
      {
        h: "Category pages have nothing but a grid",
        p: "The category page is the one that matches a category question, and on most shops it is a wall of tiles with no prose. A few honest paragraphs about choosing within that category is often the highest-value page a shop can add.",
      },
      {
        h: "Schema claims things the page does not show",
        p: "Ratings nobody left, availability that is not real, a price the page contradicts. Answer engines cross-check, and a contradiction costs more than the missing field would have.",
      },
      {
        h: "Every variant is its own thin page",
        p: "Twelve near-identical pages for twelve sizes split the evidence twelve ways. One strong page with variants marked up beats twelve weak ones.",
      },
    ],
    faqs: [
      {
        q: "Will AI search send me traffic or just answer for me?",
        a: "Both happen. Transactional questions still send people to a shop to buy, and answers that name a shop are how they choose which one. Being the shop named in the answer is the goal; the click follows it.",
      },
      {
        q: "Do I need schema on every product?",
        a: "On every product you want to be asked about. Start with the products that carry your margin, get name, price, availability and category right there first, then widen.",
      },
    ],
    updated: "2026-09-03",
  },
  {
    slug: "comparison-site",
    name: "Comparison and finder sites",
    title: "AI search readiness for comparison and finder sites",
    description:
      "A comparison site is not a seller, and it should not be tested as one. Here is what " +
      "answer engines actually ask a finder, and what decides whether it is the source they use.",
    intro:
      "A finder, a comparison site or an affiliate guide lists products it does not sell. That " +
      "distinction matters more than it sounds: the questions worth winning are not about who " +
      "supplies a particular model, they are about the decision. Somebody choosing between " +
      "categories, budgets and types is exactly the reader a comparison site is built for, and " +
      "exactly the question an answer engine has to source from somewhere.",
    questions: [
      "Finnish sauna: what should you look out for when buying?",
      "Infrared cabin: what costs should you expect?",
      "Which providers for barrel saunas are there?",
    ],
    reads: [
      "Whether the offers on your product pages name you or the manufacturer as the seller",
      "Whether the offer links point to your domain or to somebody else's",
      "The Product category field, which supplies the term the decision is actually asked in",
    ],
    pitfalls: [
      {
        h: "The site reads as a shop it is not",
        p: "Product pages with full commerce markup and no signal of who sells make a finder look like a failing retailer. Naming the real seller in the offer is both more honest and better-read.",
      },
      {
        h: "Everything is a specification table",
        p: "Tables compare; they do not advise. The passage that gets quoted is the one that says which option suits which buyer and why, in sentences.",
      },
      {
        h: "There is no page for the category itself",
        p: "If every page is one product, there is nothing to match the category question, which is where most of the demand sits. A serious guide to the category is usually the missing page.",
      },
      {
        h: "The comparison criteria are unstated",
        p: "A model deciding whether to trust a ranking looks for how it was made. Saying what you compared, and what you did not, is a trust signal and a differentiator at once.",
      },
    ],
    faqs: [
      {
        q: "How does the audit know we do not sell what we list?",
        a: "From your own markup. If the offer names another company as the seller, or the offer link leaves your domain, the audit treats those products as covered rather than sold, and asks category-level questions instead of asking who supplies a single model.",
      },
      {
        q: "Do affiliate links hurt AI search readiness?",
        a: "Not in themselves. What hurts is a page that is only links: no independent judgement, no criteria, nothing a model could quote that it could not get from the manufacturer.",
      },
    ],
    updated: "2026-09-03",
  },
  {
    slug: "saas",
    name: "SaaS and software",
    title: "AI search readiness for SaaS and software companies",
    description:
      "Software buyers ask assistants for shortlists and alternatives. Getting onto those lists " +
      "depends on facts your marketing site usually states everywhere except in text.",
    intro:
      "Software is the category where AI assistants are used most heavily for shortlisting, and " +
      "the category where marketing sites are least willing to say anything concrete. Pricing " +
      "behind a form, capabilities described as outcomes, integrations shown only as a wall of " +
      "logos: each one removes a fact a model needed to include you.",
    questions: [
      "Which provider for invoice automation is recommended?",
      "What are the alternatives to a helpdesk platform?",
      "Which providers for CRM offer suitable integrations?",
    ],
    reads: [
      "SoftwareApplication or WebApplication schema, and its category",
      "Whether pricing exists as text on a page, not only inside a calculator",
      "Named integrations, named limits, and who the product is for, stated plainly",
    ],
    pitfalls: [
      {
        h: "Pricing is “contact us”",
        p: "A model asked what something costs cannot answer with a form. Even a range, or a starting price with the conditions attached, puts you back into the answer.",
      },
      {
        h: "Integrations are a logo grid",
        p: "Logos are images. If the integration is not named in text, it does not exist for the question “which tools connect to X”, which is one of the highest-intent questions in software.",
      },
      {
        h: "Capabilities are described as benefits",
        p: "“Unlock your team's potential” is unquotable. What the software does, for whom, and what it does not do, is what a shortlist is built from.",
      },
      {
        h: "The comparison pages are all self-serving",
        p: "A comparison where you win every row reads as marketing and is treated as such. Stating where a competitor is the better fit is the single most effective trust move on a software site.",
      },
    ],
    faqs: [
      {
        q: "Should we write pages comparing ourselves to competitors?",
        a: "Yes, if they are honest. Alternative and comparison questions are a large share of software search, and a fair page is quotable in a way an advert is not.",
      },
      {
        q: "Does our docs site count?",
        a: "It counts a great deal. Documentation is specific, first-party and structured — the most quotable content most software companies own, and often the part their marketing site links to least.",
      },
    ],
    updated: "2026-09-03",
  },
  {
    slug: "service-business",
    name: "Service businesses and agencies",
    title: "AI search readiness for service businesses and agencies",
    description:
      "Service buyers ask assistants who does this work, who is any good, and what it costs. " +
      "Most agency sites answer none of the three in a form a machine can use.",
    intro:
      "A service business sells something with no specification sheet, which is why its site so " +
      "often says nothing checkable. The paradox is that vagueness feels safe and reads as " +
      "absence: a model comparing three agencies uses whichever one stated something, and drops " +
      "the two that described their passion for their craft.",
    questions: [
      "Which providers are there for technical SEO consulting?",
      "How do you recognise a trustworthy provider for brand strategy?",
      "Which providers offer design and development from a single source?",
    ],
    reads: [
      "Service schema, and whether each service has a page of its own",
      "Named services extracted from your navigation and page titles",
      "Evidence: named clients, real numbers, dated work, an identifiable team",
    ],
    pitfalls: [
      {
        h: "One page lists twelve services",
        p: "A page that mentions everything ranks for nothing and answers nothing. Each service a buyer would ask about separately needs somewhere it is the subject.",
      },
      {
        h: "The case studies name nobody",
        p: "Anonymous results are unverifiable and are treated that way. One named client with a real number beats ten anonymous success stories.",
      },
      {
        h: "No indication of price at all",
        p: "You do not have to publish a rate card. A typical project range, or the size of engagement you take on, keeps you in the answer to the question every buyer asks first.",
      },
      {
        h: "The team is a stock photo",
        p: "Who does the work is an expertise signal with a schema field waiting for it. An unattributed agency competes with every other unattributed agency.",
      },
    ],
    faqs: [
      {
        q: "We deliberately do not publish prices. Is that fatal?",
        a: "No, but it is a cost. Something bounded — a starting point, a typical range, the size of project you take — recovers most of the ground without publishing a rate card.",
      },
      {
        q: "Do testimonials help?",
        a: "Attributed ones do. A quote with a name, a company and a date is evidence; an anonymous quote is decoration, and both models and readers treat it that way.",
      },
    ],
    updated: "2026-09-03",
  },
  {
    slug: "one-page-site",
    name: "One-page sites",
    title: "AI search readiness for one-page sites and landing pages",
    description:
      "A single page has one chance to say what this is, who it is for and why it is credible. " +
      "Most one-pagers spend it on a slogan.",
    intro:
      "One page is not a disadvantage in AI search — a focused page can be extremely quotable. " +
      "The failure mode is different from a large site's: there is no second page to carry the " +
      "detail a model needs, so anything the single page leaves implicit is simply absent.",
    questions: [
      "What should you know about agent trajectory marketplaces?",
      "What are the best sources to learn about this topic?",
    ],
    reads: [
      "The page title and heading, which usually carry the only statement of what this is",
      "Whether any business identity exists at all: an address, a contact, an imprint",
      "Whether the substance is text or lives inside a hero image",
    ],
    pitfalls: [
      {
        h: "The heading is a slogan",
        p: "“Build the future, faster” names no category. If neither the heading nor the title says what the thing is, the audit has nothing to work with, and neither does a model.",
      },
      {
        h: "The only content is above the fold",
        p: "A page with sixty words has nothing to retrieve. A single page can still carry a thousand words of genuine substance without becoming a website.",
      },
      {
        h: "No identity anywhere",
        p: "No company name, no location, no contact. A page nobody appears to be responsible for is a page nothing will quote on a question that matters.",
      },
      {
        h: "Everything is a signup form",
        p: "A gate before any information means there is nothing to read. Whatever you would say on the call, say some of it on the page.",
      },
    ],
    faqs: [
      {
        q: "Should we build more pages just for AI search?",
        a: "Only where you have something to put on them. One page with real substance outperforms five pages of padding, and padding is recognisable.",
      },
      {
        q: "Can a one-page site score well?",
        a: "Yes. Focus is an advantage at the retrieval step. What it cannot survive is having nothing concrete on it.",
      },
    ],
    updated: "2026-09-03",
  },
];

export function segment(slug: string): Segment | undefined {
  return SEGMENTS.find((s) => s.slug === slug);
}
