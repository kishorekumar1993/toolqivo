import { TOOLS } from "@/data/tools";
import { Tool } from "@/data/types";

export interface SearchResult {
  tool: Tool;
  score: number;
  matchType: "exact" | "alias" | "name" | "keyword" | "description";
}

export function searchTools(query: string, limit: number = 8): Tool[] {
  if (!query || !query.trim()) {
    return [];
  }

  const cleanQuery = query.toLowerCase().trim();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const results: SearchResult[] = [];

  for (const tool of TOOLS) {
    const nameLower = tool.name.toLowerCase();
    const descLower = tool.description.toLowerCase();
    const catLower = tool.category.toLowerCase();
    const keywords = tool.keywords.map((k) => k.toLowerCase());
    const aliases = tool.aliases.map((a) => a.toLowerCase());

    let score = 0;
    let matchType: SearchResult["matchType"] = "description";

    // 1. Exact Name match
    if (nameLower === cleanQuery) {
      score += 100;
      matchType = "exact";
    }
    // 2. Name starts with query
    else if (nameLower.startsWith(cleanQuery)) {
      score += 80;
      matchType = "name";
    }
    // 3. Name contains query
    else if (nameLower.includes(cleanQuery)) {
      score += 60;
      matchType = "name";
    }

    // 4. Exact Alias match (e.g. "loan", "photo size", "reduce pdf")
    for (const alias of aliases) {
      if (alias === cleanQuery) {
        score = Math.max(score, 90);
        matchType = "alias";
      } else if (alias.includes(cleanQuery) || cleanQuery.includes(alias)) {
        score = Math.max(score, 70);
        matchType = "alias";
      }
    }

    // 5. Keyword matches
    for (const kw of keywords) {
      if (kw === cleanQuery) {
        score = Math.max(score, 75);
        if (matchType !== "exact" && matchType !== "alias") matchType = "keyword";
      } else if (kw.includes(cleanQuery)) {
        score = Math.max(score, 50);
        if (matchType !== "exact" && matchType !== "alias") matchType = "keyword";
      }
    }

    // 6. Token based matching
    const matchesAllTokens = queryTokens.every(
      (token) =>
        nameLower.includes(token) ||
        descLower.includes(token) ||
        catLower.includes(token) ||
        keywords.some((k) => k.includes(token)) ||
        aliases.some((a) => a.includes(token))
    );

    if (matchesAllTokens && score === 0) {
      score += 30;
    }

    // 7. Description contains full query
    if (descLower.includes(cleanQuery)) {
      score = Math.max(score, 20);
    }

    if (score > 0) {
      // Prioritize popular tools slightly
      if (tool.popular) score += 5;
      results.push({ tool, score, matchType });
    }
  }

  // Sort descending by score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, limit).map((r) => r.tool);
}
