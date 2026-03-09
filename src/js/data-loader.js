export async function loadCards() {
	const files = ["1st", "2nd", "3rd", "4th", "5th"];

	const responses = await Promise.all(files.map((f) => fetch(`./assets/data/${f}.json`)));

	responses.forEach((res, i) => {
		if (!res.ok) {
			throw new Error(`${files[i]}.json の読み込みに失敗しました。`);
		}
	});

	const jsons = await Promise.all(responses.map((r) => r.json()));
	const cards = [];

	jsons.forEach((items, index) => {
		if (!Array.isArray(items)) {
			throw new Error(`${files[index]}.json の形式が不正です。配列である必要があります。`);
		}
		for (const card of items) {
			cards.push({ ...card, __sourceSeries: files[index] });
		}
	});

	return cards.map(normalizeCard);
}

function normalizeCard(card) {
	const id = String(card.id ?? "");
	const series = String(card.series ?? card.__sourceSeries ?? "");
	const characteristic = String(card.characteristic ?? "").trim();
	const colors = normalizeColors(card.color ?? card.attribute);
	const tags = Array.isArray(card.tags)
		? card.tags
		: characteristic
			? [characteristic]
			: [];

	return {
		id,
		name: String(card.name ?? ""),
		series,
		number: String(card.number ?? deriveNumberFromId(id)),
		type: String(card.type ?? ""),
		color: colors.length <= 1 ? (colors[0] ?? "") : colors,
		attribute: colors[0] ?? "",
		costText: String(card.cost ?? ""),
		cost: toNumberOrNull(card.cost),
		power: String(card.power ?? card.bp ?? ""),
		bp: toNumberOrNull(card.bp ?? card.power),
		text: String(card.text ?? "").trim(),
		characteristic,
		trash: String(card.trash ?? "").trim(),
		image: buildImagePath(series, id),
		rarity: String(card.rarity ?? ""),
		tags,
	};
}

function normalizeColors(value) {
	const rawList = Array.isArray(value) ? value : splitColorText(value);
	return rawList
		.map((item) => String(item ?? "").trim())
		.filter(Boolean);
}

function splitColorText(value) {
	const text = String(value ?? "").trim();
	if (!text) return [];
	return text.split(/[\/、・,\s]+/);
}

function buildImagePath(series, id) {
	const safeSeries = String(series ?? "").trim();
	const safeId = String(id ?? "").trim();
	if (!safeSeries || !safeId) return "";
	return `./assets/images/${safeSeries}/${safeId}.png`;
}

function deriveNumberFromId(id) {
	if (!id) return "";

	const match = id.match(/^\d+(?:st|nd|rd|th)-(.+)$/i);
	if (match) return match[1].trim();
	return id.trim();
}

function toNumberOrNull(value) {
	if (value === "" || value === null || value === undefined) return null;
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}

	const text = String(value).trim();
	if (!text) return null;

	const direct = Number(text);
	if (Number.isFinite(direct)) return direct;

	const firstNumber = text.match(/-?\d+(?:\.\d+)?/);
	if (!firstNumber) return null;

	const parsed = Number(firstNumber[0]);
	return Number.isFinite(parsed) ? parsed : null;
}
