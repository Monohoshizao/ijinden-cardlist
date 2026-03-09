import { loadCards } from "./data-loader.js";
import { buildFilterOptions, filterCards, sortCards } from "./filters.js";
import { populateSelect, renderCards, renderModal, setResultCount } from "./ui.js";

const PAGE_SIZE = 40;

const elements = {
	controls: document.querySelector(".viewer__controls"),
	controlsToggleButton: document.querySelector("#controlsToggleButton"),
	openSearchModalButton: document.querySelector("#openSearchModalButton"),
	searchModal: document.querySelector("#searchModal"),
	searchModalSubmitButton: document.querySelector("#searchModalSubmitButton"),
	searchModalCloseButton: document.querySelector("#searchModalCloseButton"),
	searchModalInput: document.querySelector("#searchModalInput"),
	seriesFilterModal: document.querySelector("#seriesFilterModal"),
	typeFilterModal: document.querySelector("#typeFilterModal"),
	attributeFilterModal: document.querySelector("#attributeFilterModal"),
	costMinModal: document.querySelector("#costMinModal"),
	costMaxModal: document.querySelector("#costMaxModal"),
	bpMinModal: document.querySelector("#bpMinModal"),
	bpMaxModal: document.querySelector("#bpMaxModal"),
	sortSelectModal: document.querySelector("#sortSelectModal"),
	checkedOnlyFilterModal: document.querySelector("#checkedOnlyFilterModal"),
	searchInput: document.querySelector("#searchInput"),
	seriesFilter: document.querySelector("#seriesFilter"),
	typeFilter: document.querySelector("#typeFilter"),
	attributeFilter: document.querySelector("#attributeFilter"),
	costMin: document.querySelector("#costMin"),
	costMax: document.querySelector("#costMax"),
	bpMin: document.querySelector("#bpMin"),
	bpMax: document.querySelector("#bpMax"),
	sortSelect: document.querySelector("#sortSelect"),
	checkedOnlyFilter: document.querySelector("#checkedOnlyFilter"),
	viewImageButton: document.querySelector("#viewImageButton"),
	viewDetailButton: document.querySelector("#viewDetailButton"),
	resetFiltersButton: document.querySelector("#resetFiltersButton"),
	cardsGrid: document.querySelector("#cardsGrid"),
	emptyState: document.querySelector("#emptyState"),
	pagination: document.querySelector("#pagination"),
	paginationTotal: document.querySelector("#paginationTotal"),
	resultCount: document.querySelector("#resultCount"),
	totalCount: document.querySelector("#totalCount"),
	cardModal: document.querySelector("#cardModal"),
	modalContent: document.querySelector("#modalContent"),
};

const state = {
	keyword: "",
	series: "",
	type: "",
	attribute: "",
	costMin: null,
	costMax: null,
	bpMin: null,
	bpMax: null,
	sort: "series-number",
	selectedOnly: false,
	viewMode: "detail",
	currentPage: 1,
};

let allCards = [];
const selectedCardIds = new Set();

boot();

async function boot() {
	try {
		allCards = await loadCards();
		initializeFilters(allCards);
		bindEvents();
		updateControlsToggleButton();
		updateViewModeButtons();
		updateView();
	} catch (error) {
		console.error(error);
		elements.cardsGrid.innerHTML = `
      <div class="empty-state">
        データの読み込みに失敗しました。<br>
        assets/data/*.json の形式、またはローカルサーバー起動状況を確認してください。
      </div>
    `;
	}
}

function initializeFilters(cards) {
	const options = buildFilterOptions(cards);
	populateSelect(elements.seriesFilter, options.series);
	populateSelect(elements.typeFilter, options.types);
	populateSelect(elements.attributeFilter, options.attributes);
	populateSelect(elements.seriesFilterModal, options.series);
	populateSelect(elements.typeFilterModal, options.types);
	populateSelect(elements.attributeFilterModal, options.attributes);
	setResultCount(elements.resultCount, elements.totalCount, 0, cards.length);
}

function bindEvents() {
	elements.searchInput.addEventListener("input", () => {
		state.keyword = elements.searchInput.value;
		resetPageAndUpdate();
	});

	elements.seriesFilter.addEventListener("change", () => {
		state.series = elements.seriesFilter.value;
		resetPageAndUpdate();
	});

	elements.typeFilter.addEventListener("change", () => {
		state.type = elements.typeFilter.value;
		resetPageAndUpdate();
	});

	elements.attributeFilter.addEventListener("change", () => {
		state.attribute = elements.attributeFilter.value;
		resetPageAndUpdate();
	});

	for (const [element, key] of [
		[elements.costMin, "costMin"],
		[elements.costMax, "costMax"],
		[elements.bpMin, "bpMin"],
		[elements.bpMax, "bpMax"],
	]) {
		element.addEventListener("input", () => {
			state[key] = element.value === "" ? null : Number(element.value);
			resetPageAndUpdate();
		});
	}

	elements.sortSelect.addEventListener("change", () => {
		state.sort = elements.sortSelect.value;
		resetPageAndUpdate();
	});

	elements.checkedOnlyFilter.addEventListener("change", () => {
		state.selectedOnly = elements.checkedOnlyFilter.checked;
		resetPageAndUpdate();
	});

	elements.viewImageButton.addEventListener("click", () => {
		setViewMode("image");
	});

	elements.viewDetailButton.addEventListener("click", () => {
		setViewMode("detail");
	});

	elements.resetFiltersButton.addEventListener("click", () => {
		resetFilters();
		resetPageAndUpdate();
	});

	elements.controlsToggleButton.addEventListener("click", () => {
		const isCollapsed = elements.controls.classList.toggle("is-collapsed");
		updateControlsToggleButton(isCollapsed);
	});

	elements.openSearchModalButton.addEventListener("click", () => {
		syncMainFiltersToModal();
		lockSearchModalBackground();
		elements.searchModal.showModal();
	});
	elements.searchModalSubmitButton.addEventListener("click", () => {
		applyModalFiltersToMain();
		elements.searchModal.close();
	});
	elements.searchModalCloseButton.addEventListener("click", () => {
		elements.searchModal.close();
	});
	elements.searchModal.addEventListener("click", (event) => {
		if (event.target === elements.searchModal) {
			elements.searchModal.close();
		}
	});
	elements.searchModal.addEventListener("close", () => {
		unlockSearchModalBackground();
	});

	elements.pagination.addEventListener("click", (event) => {
		if (!(event.target instanceof Element)) return;
		const button = event.target.closest("button[data-page]");
		if (!button) return;
		const nextPage = Number(button.dataset.page);
		if (!Number.isFinite(nextPage) || nextPage === state.currentPage) return;
		state.currentPage = nextPage;
		updateView();
	});
}

function updateControlsToggleButton(isCollapsed = elements.controls.classList.contains("is-collapsed")) {
	elements.controlsToggleButton.textContent = isCollapsed ? "検索を開く" : "検索を閉じる";
	elements.controlsToggleButton.setAttribute("aria-expanded", String(!isCollapsed));
}

function setViewMode(mode) {
	if (state.viewMode === mode) return;
	state.viewMode = mode;
	updateViewModeButtons();
	updateView();
}

function updateViewModeButtons() {
	const isImage = state.viewMode === "image";
	elements.viewImageButton.classList.toggle("is-active", isImage);
	elements.viewDetailButton.classList.toggle("is-active", !isImage);
	elements.viewImageButton.setAttribute("aria-pressed", String(isImage));
	elements.viewDetailButton.setAttribute("aria-pressed", String(!isImage));
}

function resetPageAndUpdate() {
	state.currentPage = 1;
	updateView();
}

function resetFilters() {
	state.keyword = "";
	state.series = "";
	state.type = "";
	state.attribute = "";
	state.costMin = null;
	state.costMax = null;
	state.bpMin = null;
	state.bpMax = null;
	state.sort = "series-number";
	state.selectedOnly = false;

	elements.searchInput.value = "";
	elements.seriesFilter.value = "";
	elements.typeFilter.value = "";
	elements.attributeFilter.value = "";
	elements.costMin.value = "";
	elements.costMax.value = "";
	elements.bpMin.value = "";
	elements.bpMax.value = "";
	elements.sortSelect.value = "series-number";
	elements.checkedOnlyFilter.checked = false;
	elements.checkedOnlyFilterModal.checked = false;
}

function updateView() {
	let filtered = filterCards(allCards, state);
	if (state.selectedOnly) {
		filtered = filtered.filter((card) => selectedCardIds.has(card.id));
	}
	const sorted = sortCards(filtered, state.sort);
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

	if (state.currentPage > totalPages) {
		state.currentPage = totalPages;
	}

	const start = (state.currentPage - 1) * PAGE_SIZE;
	const pageCards = sorted.slice(start, start + PAGE_SIZE);

	renderCards(
		elements.cardsGrid,
		pageCards,
		state.viewMode,
		(card) => {
			renderModal(elements.cardModal, elements.modalContent, card, selectedCardIds, toggleCardSelection);
		},
		selectedCardIds,
		toggleCardSelection,
	);

	setResultCount(elements.resultCount, elements.totalCount, sorted.length, allCards.length);
	elements.emptyState.classList.toggle("is-hidden", sorted.length !== 0);
	elements.cardsGrid.classList.toggle("is-hidden", sorted.length === 0);
	renderPagination(totalPages, sorted.length);
}

function renderPagination(totalPages, totalItems) {
	elements.pagination.innerHTML = "";

	if (totalItems === 0) {
		elements.pagination.classList.add("is-hidden");
		elements.paginationTotal.classList.add("is-hidden");
		elements.paginationTotal.textContent = "";
		return;
	}

	elements.pagination.classList.remove("is-hidden");
	elements.paginationTotal.classList.remove("is-hidden");
	elements.paginationTotal.textContent = `[ 全 ${totalPages} ページ ]`;

	const addButton = (label, page, disabled = false, isCurrent = false, extraClass = "") => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = extraClass ? `pagination__button ${extraClass}` : "pagination__button";
		button.textContent = label;
		button.dataset.page = String(page);
		if (disabled) button.disabled = true;
		if (isCurrent) {
			button.setAttribute("aria-current", "page");
			button.classList.add("is-current");
		}
		elements.pagination.append(button);
	};

	if (state.currentPage > 1) {
		addButton("前ページ", state.currentPage - 1, false, false, "pagination__button--prev");
	}

	let startPage = Math.max(1, state.currentPage - 2);
	let endPage = Math.min(totalPages, startPage + 4);
	startPage = Math.max(1, endPage - 4);

	for (let page = startPage; page <= endPage; page += 1) {
		addButton(String(page), page, false, page === state.currentPage);
	}

	if (state.currentPage < totalPages) {
		addButton("次ページ", state.currentPage + 1, false, false, "pagination__button--next");
	}
}

function syncMainFiltersToModal() {
	elements.searchModalInput.value = elements.searchInput.value;
	elements.seriesFilterModal.value = elements.seriesFilter.value;
	elements.typeFilterModal.value = elements.typeFilter.value;
	elements.attributeFilterModal.value = elements.attributeFilter.value;
	elements.costMinModal.value = elements.costMin.value;
	elements.costMaxModal.value = elements.costMax.value;
	elements.bpMinModal.value = elements.bpMin.value;
	elements.bpMaxModal.value = elements.bpMax.value;
	elements.sortSelectModal.value = elements.sortSelect.value;
	elements.checkedOnlyFilterModal.checked = elements.checkedOnlyFilter.checked;
}

function applyModalFiltersToMain() {
	elements.searchInput.value = elements.searchModalInput.value;
	elements.seriesFilter.value = elements.seriesFilterModal.value;
	elements.typeFilter.value = elements.typeFilterModal.value;
	elements.attributeFilter.value = elements.attributeFilterModal.value;
	elements.costMin.value = elements.costMinModal.value;
	elements.costMax.value = elements.costMaxModal.value;
	elements.bpMin.value = elements.bpMinModal.value;
	elements.bpMax.value = elements.bpMaxModal.value;
	elements.sortSelect.value = elements.sortSelectModal.value;
	elements.checkedOnlyFilter.checked = elements.checkedOnlyFilterModal.checked;

	state.keyword = elements.searchInput.value;
	state.series = elements.seriesFilter.value;
	state.type = elements.typeFilter.value;
	state.attribute = elements.attributeFilter.value;
	state.costMin = elements.costMin.value === "" ? null : Number(elements.costMin.value);
	state.costMax = elements.costMax.value === "" ? null : Number(elements.costMax.value);
	state.bpMin = elements.bpMin.value === "" ? null : Number(elements.bpMin.value);
	state.bpMax = elements.bpMax.value === "" ? null : Number(elements.bpMax.value);
	state.sort = elements.sortSelect.value;
	state.selectedOnly = elements.checkedOnlyFilter.checked;
	resetPageAndUpdate();
}

function toggleCardSelection(card, checked) {
	if (!card?.id) return;
	if (checked) {
		selectedCardIds.add(card.id);
	} else {
		selectedCardIds.delete(card.id);
	}
	updateView();
}

function lockSearchModalBackground() {
	const scrollY = window.scrollY || window.pageYOffset || 0;
	elements.searchModal.dataset.scrollY = String(scrollY);
	document.body.style.top = `-${scrollY}px`;
	document.body.classList.add("is-fixed");
}

function unlockSearchModalBackground() {
	const scrollY = Number(elements.searchModal.dataset.scrollY || "0");
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
