const FALLBACK_IMAGE = "./assets/images/no-image.png";

export function populateSelect(selectElement, items) {
	for (const item of items) {
		const option = document.createElement("option");
		option.value = item;
		option.textContent = item;
		selectElement.append(option);
	}
}

export function renderCards(container, cards, viewMode, onClickCard, checkedCardIds = new Set(), onToggleCardCheck = () => {}) {
	container.innerHTML = "";
	container.classList.remove("cards--image", "cards--detail");
	container.classList.add(viewMode === "image" ? "cards--image" : "cards--detail");

	for (const card of cards) {
		const isChecked = checkedCardIds.has(card.id);
		const article = document.createElement("article");
		article.className = "card";
		article.innerHTML = `
      <div class="card__thumb">
        <img src="${escapeHtml(card.image || FALLBACK_IMAGE)}" alt="${escapeHtml(card.name)}" loading="lazy">
      </div>
        <div class="card__body">
        <div class="card__heading">
          <p class="card__id">${escapeHtml(card.id || "-")}</p>
          <h3 class="card__ttl">${escapeHtml(card.name || "名称未設定")}</h3>
          <label class="card__check" aria-label="このカードを選択">
            <input class="card__check-input" type="checkbox" ${isChecked ? "checked" : ""}>
          </label>
        </div>
        <div class="card__meta">
          ${chip(formatTypeColor(card.type, getColor(card)), getColorChipClass(card))}
          ${chip(formatCost(card))}
          ${renderPowerChip(card)}
        </div>
        ${renderOptionalLine("card__characteristic", "特性", card.characteristic)}
        <p class="card__txt">${formatMultilineText(card.text || "テキストなし")}</p>
        ${renderOptionalLine("card__trash", "遺業能力", card.trash)}
      </div>
    `;

		const img = article.querySelector("img");
		img.addEventListener("error", () => {
			img.src = FALLBACK_IMAGE;
		});

		const checkInput = article.querySelector(".card__heading .card__check-input");
		const checkLabel = article.querySelector(".card__heading .card__check");
		checkLabel.addEventListener("click", (event) => {
			event.stopPropagation();
		});
		checkInput.addEventListener("click", (event) => {
			event.stopPropagation();
		});
		checkInput.addEventListener("change", () => {
			onToggleCardCheck(card, checkInput.checked);
		});

		article.addEventListener("click", () => onClickCard(card));
		container.append(article);
	}
}

export function renderModal(modalElement, contentElement, card, checkedCardIds = new Set(), onToggleCardCheck = () => {}) {
	const isChecked = checkedCardIds.has(card.id);
	contentElement.innerHTML = `
    <div class="card-modal__img">
      <img src="${escapeHtml(card.image || FALLBACK_IMAGE)}" alt="${escapeHtml(card.name)}">
    </div>
    <div class="card-modal__body">
      <div class="card__heading">
        <p class="card__id">${escapeHtml(card.id || "-")}</p>
        <h2 class="card__ttl">${escapeHtml(card.name || "名称未設定")}</h2>
        <label class="card__check" aria-label="このカードを選択">
          <input class="card__check-input" type="checkbox" ${isChecked ? "checked" : ""}>
        </label>
      </div>
      <div class="card__meta">
        ${chip(formatTypeColor(card.type, getColor(card)), getColorChipClass(card))}
        ${chip(formatCost(card))}
        ${renderPowerChip(card)}
      </div>
      ${renderOptionalLine("card__characteristic", "特性", card.characteristic)}
      <p class="card__txt">${formatMultilineText(card.text || "テキストなし")}</p>
      ${renderOptionalLine("card__trash", "遺業能力", card.trash)}
    </div>
  `;

	const img = contentElement.querySelector("img");
	img.addEventListener("error", () => {
		img.src = FALLBACK_IMAGE;
	});

	const checkInput = contentElement.querySelector(".card__heading .card__check-input");
	const checkLabel = contentElement.querySelector(".card__heading .card__check");
	checkLabel.addEventListener("click", (event) => {
		event.stopPropagation();
	});
	checkInput.addEventListener("click", (event) => {
		event.stopPropagation();
	});
	checkInput.addEventListener("change", () => {
		onToggleCardCheck(card, checkInput.checked);
	});

	setupModalClose(modalElement);
	if (modalElement.open) {
		modalElement.close();
	}
	lockBackgroundScroll(modalElement);
	modalElement.showModal();
}

export function setResultCount(resultCountElement, totalCountElement, resultCount, totalCount) {
	resultCountElement.textContent = String(resultCount);
	totalCountElement.textContent = String(totalCount);
}

function chip(label, extraClass = "") {
	const className = extraClass ? `card__chip ${extraClass}` : "card__chip";
	return `<span class="${className}">${escapeHtml(label)}</span>`;
}

function formatTypeColor(type, color) {
	const safeType = type ? String(type).trim() : "";
	const safeColorRaw = color ? String(color).trim() : "";
	const safeColor = safeColorRaw === "-" ? "" : safeColorRaw;
	if (!safeType && !safeColor) return "-";
	if (!safeType) return safeColor;
	if (!safeColor) return safeType;
	return `${safeType}・${safeColor}`;
}

function getColor(card) {
	const colors = extractColors(card);
	if (!colors.length) return "-";
	return colors.join("/");
}

function getColorChipClass(card) {
	const colors = extractColors(card);
	if (!colors.length) return "";
	const suffix = COLOR_CLASS_SUFFIX[colors[0]];
	return suffix ? `card__chip--${suffix}` : "";
}

function formatCost(card) {
	return `コスト ${rawValue(card.costText ?? card.cost)}`;
}

function formatPower(card) {
	return `パワー ${rawValue(card.power ?? card.bp)}`;
}

function renderPowerChip(card) {
	const value = card.power ?? card.bp;
	if (value === null || value === undefined) return "";
	if (String(value).trim() === "") return "";
	return chip(formatPower(card));
}

function rawValue(value) {
	if (value === null || value === undefined) return "-";
	const str = String(value).trim();
	return str === "" ? "-" : str;
}

function renderOptionalLine(className, label, value) {
	if (value === null || value === undefined) return "";
	const str = String(value).trim();
	if (!str) return "";
	return `<p class="${className}"><span>${escapeHtml(label)}</span>：${escapeHtml(str)}</p>`;
}

function formatMultilineText(value) {
	return escapeHtml(value).replaceAll("\n", "<br>");
}

const COLOR_CLASS_SUFFIX = {
	赤: "red",
	青: "blue",
	緑: "green",
	黄: "yellow",
	紫: "purple",
};

function extractColors(card) {
	const source = card.color ?? card.attribute;
	const rawList = Array.isArray(source) ? source : splitColorText(source);

	return rawList
		.map((value) => String(value ?? "").trim())
		.filter((value) => value && COLOR_CLASS_SUFFIX[value]);
}

function splitColorText(value) {
	const text = String(value ?? "").trim();
	if (!text) return [];
	return text.split(/[\/、・,\s]+/);
}

function escapeHtml(value) {
	return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function setupModalClose(modalElement) {
	if (modalElement.dataset.closeReady === "1") return;
	modalElement.dataset.closeReady = "1";

	const closeButton = modalElement.querySelector(".card-modal__close");
	if (closeButton) {
		closeButton.addEventListener("click", () => {
			modalElement.close();
		});
	}

	modalElement.addEventListener("click", (event) => {
		if (event.target === modalElement) {
			modalElement.close();
		}
	});

	modalElement.addEventListener("close", () => {
		unlockBackgroundScroll(modalElement);
	});
}

function lockBackgroundScroll(modalElement) {
	const scrollY = window.scrollY || window.pageYOffset || 0;
	modalElement.dataset.scrollY = String(scrollY);
	document.body.style.top = `-${scrollY}px`;
	document.body.classList.add("is-fixed");
}

function unlockBackgroundScroll(modalElement) {
	const scrollY = Number(modalElement.dataset.scrollY || "0");
	const html = document.documentElement;
	const previousScrollBehavior = html.style.scrollBehavior;
	html.style.scrollBehavior = "auto";

	document.body.classList.remove("is-fixed");
	document.body.style.top = "";
	window.scrollTo(0, scrollY);

	requestAnimationFrame(() => {
		html.style.scrollBehavior = previousScrollBehavior;
	});
}
