import { ArticleLayout } from "@/components/content/ArticleLayout";
import { CONTENT } from "@/lib/content/registry";
import { contentMetadata } from "@/lib/seo/content-metadata";

const meta = CONTENT.find((c) => c.slug === "/guides/structured-data")!;

export const metadata = contentMetadata(meta.slug);

export default function Page() {
  return (
    <ArticleLayout
      title="Structured Data. Stop making machines guess"
      description="Structured data spells out your facts in a machine-readable format so AI does not have to guess who you are. A plain-language guide to adding it, no coding degree required."
      category="Guide"
      updated={meta.updated}
      path={meta.slug}
      faqs={[
        {
          q: "Is structured data the same as SEO keywords?",
          a: "No. Keywords are the visible words on your page. Structured data is a small block of labels in the page's code that states facts explicitly, like your name, address, prices and an FAQ, in a format machines read directly, without interpretation.",
        },
        {
          q: "Do I need a developer to add it?",
          a: "Often not for the basics. Most website builders and content systems have a plugin or a settings field for it, and there are free generators for the common types. For custom sites, it is a small, well-documented addition a developer can do quickly.",
        },
        {
          q: "Which types should a small business start with?",
          a: "Organization, or LocalBusiness, for your identity and contact details, and FAQPage for your common questions. Those two cover the most valuable ground. Add Product or Service markup if you sell specific, listable items.",
        },
      ]}
    >
      <p>
        Structured data is a small set of labels in your page&apos;s code that state your facts in a
        way machines read without guessing. Instead of hoping an AI correctly infers that BrightSolar
        is your business name and Austin is your city, you <em>tell</em> it, explicitly. It removes
        ambiguity, which is exactly what makes you eligible for specific answers.
      </p>

      <h2>What it looks like, conceptually</h2>
      <p>
        You do not need to read code to get the idea. Structured data is like filling in a form the
        machine can read. The type is Organization, the name is BrightSolar, the city is Austin, TX,
        and then the phone, email and opening hours. Google uses it for rich results like stars, FAQs
        and business info, and AI systems use it as a clean, trustworthy statement of the facts, with
        no interpretation required.
      </p>

      <h2>The types worth having</h2>
      <ol>
        <li>
          <strong>Organization or LocalBusiness</strong> for your identity, meaning name, URL,
          address, contact and hours. This is the single highest-value piece for most businesses.
        </li>
        <li>
          <strong>FAQPage</strong>, which marks your common questions and answers so they are
          recognized as clean, extractable questions and answers.
        </li>
        <li>
          <strong>Product or Service</strong>, if you sell specific, listable things, to mark up name,
          description and price.
        </li>
        <li>
          <strong>Breadcrumb</strong>, which helps machines understand where a page sits in your site.
        </li>
      </ol>

      <h2>How to add it</h2>
      <ol>
        <li>
          <strong>On a website builder or content system</strong>, look for a built-in SEO or schema
          setting, or a plugin, since most platforms have one. Fill in your business details once.
        </li>
        <li>
          <strong>Use a free generator</strong> for the snippet of the type you need, then paste it
          into the page, or hand it to your developer.
        </li>
        <li>
          <strong>Keep it truthful and consistent</strong> with what is visible on the page.
          Structured data that contradicts the page is worse than none.
        </li>
        <li>
          <strong>Validate it</strong> with a free structured-data testing tool to catch mistakes.
        </li>
      </ol>

      <p>
        One caution. Structured data states facts, it does not create them. It works <em>with</em>{" "}
        clear on-page content, not instead of it. A free readiness scan checks whether your structured
        data is present and complete, and flags where it is missing.
      </p>
    </ArticleLayout>
  );
}
