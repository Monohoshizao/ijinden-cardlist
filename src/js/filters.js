export function buildFilterOptions(cards) {
  return {
    series: uniqueSorted(cards.map((card) => card.series)),
    types: uniqueSorted(cards.map((card) => card.type)),
    attributes: uniqueSorted(cards.flatMap((card) => getCardColors(card))),
  };
}

export function filterCards(cards, state) {
  const keyword = state.keyword.trim().toLowerCase();

  return cards.filter((card) => {
    if (state.series && card.series !== state.series) return false;
    if (state.type && card.type !== state.type) return false;
    if (state.attribute && !getCardColors(card).includes(state.attribute)) return false;

    if (state.costMin !== null && (card.cost ?? -Infinity) < state.costMin) return false;
    if (state.costMax !== null && (card.cost ?? Infinity) > state.costMax) return false;
    if (state.bpMin !== null && (card.bp ?? -Infinity) < state.bpMin) return false;
    if (state.bpMax !== null && (card.bp ?? Infinity) > state.bpMax) return false;

    if (keyword) {
      const haystack = [
        card.id,
        card.name,
        card.text,
        card.type,
        getCardColors(card).join(" "),
        card.characteristic,
        card.trash,
        ...(card.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
}

export function sortCards(cards, sortKey) {
  const copied = [...cards];

  copied.sort((a, b) => {
    switch (sortKey) {
      case 'name-asc':
        return compareText(a.name, b.name);
      case 'cost-asc':
        return compareNumber(a.cost, b.cost);
      case 'cost-desc':
        return compareNumber(b.cost, a.cost);
      case 'bp-asc':
        return compareNumber(a.bp, b.bp);
      case 'bp-desc':
        return compareNumber(b.bp, a.bp);
      case 'series-number':
      default: {
        const seriesCompare = compareText(a.series, b.series);
        if (seriesCompare !== 0) return seriesCompare;
        return compareNatural(a.number, b.number);
      }
    }
  });

  return copied;
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort(compareText);
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'ja');
}

function compareNatural(a, b) {
  return String(a).localeCompare(String(b), 'ja', { numeric: true });
}

function compareNumber(a, b) {
  const safeA = a === null || a === undefined ? Number.POSITIVE_INFINITY : a;
  const safeB = b === null || b === undefined ? Number.POSITIVE_INFINITY : b;
  return safeA - safeB;
}

function getCardColors(card) {
  const source = card.color ?? card.attribute;
  const rawList = Array.isArray(source) ? source : splitColorText(source);
  return rawList
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function splitColorText(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text.split(/[\/、・,\s]+/);
}
