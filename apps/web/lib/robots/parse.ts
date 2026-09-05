// A small robots.txt parser, enough to answer one question honestly: is this
// user agent allowed to fetch the site root?
//
// Follows RFC 9309 on the parts that decide that answer: groups are formed by
// consecutive user-agent lines, the agent token is matched case-insensitively
// and exactly (not as a substring, or "Claude-User" would wrongly pick up a
// rule written for "Claude-SearchBot"), a group for the specific agent beats
// the "*" group, an empty Disallow imposes nothing, and where an Allow and a
// Disallow both match, Allow wins.

export interface RobotsRule {
  allow: boolean;
  path: string;
}

export interface RobotsGroup {
  agents: string[]; // lowercased tokens
  rules: RobotsRule[];
}

export interface RobotsFile {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export type Verdict = "allowed" | "blocked";

export interface AgentVerdict {
  verdict: Verdict;
  /** Which group decided it: the agent's own, the wildcard, or none at all. */
  matchedBy: "agent" | "wildcard" | "default";
  /** The rules of the deciding group, so the reader can see the whole picture. */
  rules: RobotsRule[];
}

const FIELD = /^([a-zA-Z-]+)\s*:\s*(.*)$/;

export function parseRobots(text: string): RobotsFile {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  // A user-agent line directly after rules starts a NEW group; one directly
  // after another user-agent line joins the same group.
  let lastWasAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0]!.trim();
    if (!line) continue;
    const m = FIELD.exec(line);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      if (value) current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }

    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }

    if (field === "allow" || field === "disallow") {
      if (!current) continue; // a rule before any user-agent line applies to nothing
      current.rules.push({ allow: field === "allow", path: value });
      lastWasAgent = false;
    }
  }

  return { groups, sitemaps };
}

/** Does this rule path govern the site root? */
function governsRoot(path: string): boolean {
  const p = path.trim();
  return p === "/" || p === "/*" || p === "*";
}

function pickGroup(file: RobotsFile, token: string): { group: RobotsGroup | null; how: AgentVerdict["matchedBy"] } {
  const wanted = token.toLowerCase();
  const own = file.groups.find((g) => g.agents.includes(wanted));
  if (own) return { group: own, how: "agent" };
  const star = file.groups.find((g) => g.agents.includes("*"));
  if (star) return { group: star, how: "wildcard" };
  return { group: null, how: "default" };
}

/**
 * Whether `token` may fetch the site root. Deliberately narrow: a site can
 * allow the root and still block individual paths, so this answers "can it
 * crawl the site at all", not "can it reach every page".
 */
export function rootVerdict(file: RobotsFile, token: string): AgentVerdict {
  const { group, how } = pickGroup(file, token);
  if (!group) return { verdict: "allowed", matchedBy: "default", rules: [] };

  // An empty Disallow value is an explicit "nothing is disallowed".
  const blocking = group.rules.some((r) => !r.allow && r.path !== "" && governsRoot(r.path));
  const allowing = group.rules.some((r) => r.allow && governsRoot(r.path));
  // Allow wins a tie (RFC 9309 §2.2.2, and Google's documented behaviour).
  const verdict: Verdict = blocking && !allowing ? "blocked" : "allowed";
  return { verdict, matchedBy: how, rules: group.rules };
}

/** True if any rule in the deciding group restricts paths below the root. */
export function hasPathRestrictions(v: AgentVerdict): boolean {
  return v.rules.some((r) => !r.allow && r.path !== "" && !governsRoot(r.path));
}
