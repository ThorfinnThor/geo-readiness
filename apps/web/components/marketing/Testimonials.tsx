// Early user feedback on the home page. Quotes are rendered exactly as given
// (see lib/content/testimonials) and stay anonymous, so there is nothing here
// to invent: no names, no companies, no star ratings.
import { TESTIMONIALS } from "@/lib/content/testimonials";

export function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 border-t border-border py-16">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">What early users say</h2>
        <p className="max-w-2xl text-fg-muted">
          Unedited feedback from people who ran a scan, quoted word for word and kept anonymous.
        </p>
      </div>

      {/* CSS columns so quotes of different lengths pack without ragged gaps. */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.quote.slice(0, 40)}
            className="mb-4 break-inside-avoid rounded-xl border border-border bg-surface/40 p-5"
          >
            <blockquote className="text-sm leading-relaxed text-fg-muted">“{t.quote}”</blockquote>
          </figure>
        ))}
      </div>
    </section>
  );
}
