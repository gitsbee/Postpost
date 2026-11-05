export function extractTags(body) {
  return [...new Set(Array.from(body.matchAll(/(?:^|\s)#([\p{L}\p{N}_]{1,30})(?=$|[^\p{L}\p{N}_])/gu), match => match[1].normalize('NFKC').toLowerCase()))].slice(0, 10);
}

export function matchesSearch(post, search) {
  const terms = search.trim().normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${post.body} ${post.authorName}`.normalize('NFKC').toLowerCase();
  const tags = [...extractTags(post.body), ...(post.tags || [])];
  return terms.every(term => term.startsWith('#') ? tags.includes(term.slice(1)) : text.includes(term));
}
