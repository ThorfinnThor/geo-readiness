// The published research the methodology is informed by.
//
// IMPORTANT: every entry below is a real, verifiable paper. Do not add a source
// unless it genuinely exists and genuinely informs a scoring principle — an
// invented citation would destroy exactly the trust this section is meant to build.
// We say the methodology is *informed by* this research; we do not claim to
// reproduce any paper, nor that these authors endorse this product.

export type ResearchSource = {
  title: string;
  authors: string;
  venue: string;
  year: number;
  url: string; // canonical arXiv/DOI landing page
  /** What principle in our methodology this work informs. */
  informs: string;
};

export const RESEARCH_BASIS: ResearchSource[] = [
  {
    title: "GEO: Generative Engine Optimization",
    authors: "Aggarwal, Murahari, Rajpurohit, Kalyan, Narasimhan, Deshpande",
    venue: "ACM SIGKDD (KDD)",
    year: 2024,
    url: "https://arxiv.org/abs/2311.09735",
    informs:
      "Controlled experiments showing which page-level characteristics — clear topical alignment, cited sources, quotations and concrete statistics — make content more likely to be used by generative engines. This underpins Sourceability and how we treat citation and quantified evidence.",
  },
  {
    title: "Evaluating Verifiability in Generative Search Engines",
    authors: "Liu, Zhang, Liang",
    venue: "Findings of EMNLP",
    year: 2023,
    url: "https://arxiv.org/abs/2304.09848",
    informs:
      "Measures how well generative search engines attribute statements to sources, motivating our focus on source attribution and first-party evidence rather than unverifiable claims. This underpins Evidence & Trust and Citation Readiness.",
  },
  {
    title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
    authors: "Lewis, Perez, Piktus, et al.",
    venue: "NeurIPS",
    year: 2020,
    url: "https://arxiv.org/abs/2005.11401",
    informs:
      "The retrieval-augmented pattern behind modern AI answer engines: a system first retrieves candidate documents, then generates from them. This is why we separate Retrieval Readiness (can your page be found and understood) from citation and extraction.",
  },
  {
    title: "Lost in the Middle: How Language Models Use Long Contexts",
    authors: "Liu, Lin, Hewitt, et al.",
    venue: "Transactions of the ACL (TACL)",
    year: 2024,
    url: "https://arxiv.org/abs/2307.03172",
    informs:
      "Shows that models use clearly-placed, well-structured information far more reliably than information buried in long prose, motivating our Answer Extractability checks for concise answers, tables, lists and definitions.",
  },
];

// Schema.org / structured-data vocabularies are open web standards (not a paper);
// we reference them for Structured Data scoring.
export const RESEARCH_NOTE =
  "The methodology is informed by peer-reviewed research on generative-engine optimization, " +
  "retrieval-augmented generation and citation/verifiability, together with open web standards " +
  "such as Schema.org. It is a deterministic, transparent estimate — not a reproduction of any " +
  "single study, and not a claim of endorsement by these authors.";
