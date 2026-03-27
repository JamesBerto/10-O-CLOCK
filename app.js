const LOGO_COLLAPSE_DISTANCE_PX = 420;
const REVEAL_FALLBACK_SCROLL_PX = 70;
const FIRST_SCROLL_REVEAL_PX = 12;
const HINT_SHOW_PROGRESS_MAX = 0.14;
const SECTION_IDS = ["logo-section", "info-section", "more-section"];
let isTicking = false;
let revealItems = [];
let hasStartedScroll = false;
let sectionTargets = [];
let currentSectionIndex = 0;
let activeNavKey = null;

if ("scrollRestoration" in history) {
	history.scrollRestoration = "auto";
}

function revealAllText() {
	revealItems.forEach((item) => item.classList.add("is-visible"));
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function getCurrentSectionIndex() {
	if (!sectionTargets.length) {
		return 0;
	}

	let nearestIndex = 0;
	let nearestDistance = Number.POSITIVE_INFINITY;

	sectionTargets.forEach((section, index) => {
		const distance = Math.abs(window.scrollY - section.offsetTop);
		if (distance < nearestDistance) {
			nearestDistance = distance;
			nearestIndex = index;
		}
	});

	return nearestIndex;
}

function scrollToSection(index) {
	if (!sectionTargets.length) {
		return;
	}

	const targetIndex = clamp(index, 0, sectionTargets.length - 1);
	const targetSection = sectionTargets[targetIndex];

	if (!targetSection) {
		return;
	}

	if (targetIndex > 0) {
		hasStartedScroll = true;
		document.body.classList.add("has-started-scroll");
		revealAllText();
	}

	currentSectionIndex = targetIndex;
	targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function moveToAdjacentSection(direction) {
	if (!sectionTargets.length) {
		return;
	}

	currentSectionIndex = getCurrentSectionIndex();

	const nextIndex = clamp(currentSectionIndex + direction, 0, sectionTargets.length - 1);

	if (nextIndex === currentSectionIndex) {
		return;
	}

	scrollToSection(nextIndex);
}

function removeIndexFromUrl() {
	if (!window.location.pathname.endsWith("/index.html")) {
		return;
	}

	const cleanPath = window.location.pathname.slice(0, -"index.html".length);

	try {
		history.replaceState(history.state, "", `${cleanPath}${window.location.search}${window.location.hash}`);
	} catch (_error) {
		// Some environments can block history URL rewrite (for example restricted file contexts).
	}
}

function updateHeaderState() {
	const y = window.scrollY;
	const progress = clamp(y / LOGO_COLLAPSE_DISTANCE_PX, 0, 1);

	document.documentElement.style.setProperty("--logo-progress", progress.toFixed(3));
	document.body.classList.toggle("is-scrolled", progress > 0.02);
	document.body.classList.toggle("in-logo-section", progress <= HINT_SHOW_PROGRESS_MAX);

	if (!hasStartedScroll && y >= FIRST_SCROLL_REVEAL_PX) {
		hasStartedScroll = true;
		document.body.classList.add("has-started-scroll");
		revealAllText();
	}

	currentSectionIndex = getCurrentSectionIndex();
}

function onKeyDown(event) {
	if (event.repeat || event.key === activeNavKey) {
		return;
	}

	const isDownAction = event.key === "ArrowDown";
	const isUpAction = event.key === "ArrowUp";

	if (isDownAction) {
		activeNavKey = event.key;
		event.preventDefault();
		moveToAdjacentSection(1);
	} else if (isUpAction) {
		activeNavKey = event.key;
		event.preventDefault();
		moveToAdjacentSection(-1);
	}
}

function onKeyUp(event) {
	if (event.key === "ArrowDown" || event.key === "ArrowUp") {
		activeNavKey = null;
	}
}

function setupSectionNavigation() {
	sectionTargets = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);
	currentSectionIndex = getCurrentSectionIndex();
}

function onScroll() {
	if (isTicking) {
		return;
	}

	isTicking = true;
	window.requestAnimationFrame(() => {
		updateHeaderState();

		// Fallback: ensure description text never stays hidden while user scrolls.
		if (window.scrollY >= REVEAL_FALLBACK_SCROLL_PX) {
			revealAllText();
		}

		isTicking = false;
	});
}

function setupMiddleReveal() {
	revealItems = Array.from(document.querySelectorAll(".reveal-on-middle"));

	if (!revealItems.length) {
		return;
	}

	if (!("IntersectionObserver" in window)) {
		revealItems.forEach((item) => item.classList.add("is-visible"));
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			});
		},
		{
			root: null,
			rootMargin: "-30% 0px -30% 0px",
			threshold: 0
		}
	);

	revealItems.forEach((item) => observer.observe(item));
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("resize", updateHeaderState);
window.addEventListener("load", () => {
	removeIndexFromUrl();
	document.body.classList.toggle("has-started-scroll", window.scrollY >= FIRST_SCROLL_REVEAL_PX);
	hasStartedScroll = document.body.classList.contains("has-started-scroll");
	setupSectionNavigation();
	updateHeaderState();
	setupMiddleReveal();
});
