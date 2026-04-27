function getTextBaselineInfo(node) {
	if (node.type !== "TEXT") return void 0;
	const baselines = node.textData?.baselines;
	if (!Array.isArray(baselines) || baselines.length === 0) return void 0;
	let maxWidth = -Infinity;
	let offsetX = 0;
	for (const b of baselines) {
		const width = b?.width;
		if (typeof width === "number" && width > maxWidth) {
			maxWidth = width;
			const posX = b?.position?.x;
			offsetX = typeof posX === "number" ? posX : 0;
		}
	}
	if (maxWidth > 0) return {
		width: maxWidth,
		offsetX
	};
}
function hasVisualStylesForSpacing(node) {
	if (node.type === "TEXT") return false;
	if (node.styles?.background || node.styles?.border || node.styles?.borderRadius) return true;
	if (Array.isArray(node.fills) && node.fills.length > 0) return true;
	if (Array.isArray(node.strokes) && node.strokes.length > 0) return true;
	if (node.cornerRadius !== void 0 || node.borderRadius !== void 0) return true;
	return false;
}
function getLayoutBounds(node) {
	return {
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height
	};
}
function getEffectiveBounds(node) {
	if (node.children && node.children.length > 0 && !hasVisualStylesForSpacing(node)) {
		let minX = Infinity, minY = Infinity;
		let maxX = -Infinity, maxY = -Infinity;
		for (const child of node.children) {
			const b = getEffectiveBounds(child);
			minX = Math.min(minX, b.x);
			minY = Math.min(minY, b.y);
			maxX = Math.max(maxX, b.x + b.width);
			maxY = Math.max(maxY, b.y + b.height);
		}
		if (minX !== Infinity && minY !== Infinity && maxX !== -Infinity && maxY !== -Infinity) return {
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY
		};
	}
	const baselineInfo = getTextBaselineInfo(node);
	if (baselineInfo) return {
		x: node.x + baselineInfo.offsetX,
		y: node.y,
		width: baselineInfo.width,
		height: node.height
	};
	return {
		x: node.x,
		y: node.y,
		width: node.width,
		height: node.height
	};
}
function analyzeChildSpacing(parent, sortedChildren, isRow) {
	const result = {
		useGap: false,
		gap: 0,
		padding: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		}
	};
	if (sortedChildren.length === 0) return result;
	const parentBounds = getLayoutBounds(parent);
	let minTop = Infinity, minLeft = Infinity, minRight = Infinity, minBottom = Infinity;
	for (const child of sortedChildren) {
		const bounds = getLayoutBounds(child);
		minTop = Math.min(minTop, bounds.y - parentBounds.y);
		minLeft = Math.min(minLeft, bounds.x - parentBounds.x);
		minRight = Math.min(minRight, parentBounds.x + parentBounds.width - (bounds.x + bounds.width));
		minBottom = Math.min(minBottom, parentBounds.y + parentBounds.height - (bounds.y + bounds.height));
	}
	result.padding.top = Math.max(0, minTop);
	result.padding.left = Math.max(0, minLeft);
	result.padding.right = Math.max(0, minRight);
	result.padding.bottom = Math.max(0, minBottom);
	if (sortedChildren.length < 2) {
		result.useGap = true;
		result.gap = 0;
		return result;
	}
	const gaps = [];
	for (let i = 1; i < sortedChildren.length; i++) {
		const prev = getLayoutBounds(sortedChildren[i - 1]);
		const curr = getLayoutBounds(sortedChildren[i]);
		if (isRow) gaps.push(Math.max(0, curr.x - (prev.x + prev.width)));
		else gaps.push(Math.max(0, curr.y - (prev.y + prev.height)));
	}
	const minGap = Math.min(...gaps);
	const maxGap = Math.max(...gaps);
	if (maxGap - minGap <= 2) {
		result.useGap = true;
		result.gap = Math.round((minGap + maxGap) / 2);
	}
	return result;
}
function calcChildMargins(child, parent, prevChild, isRow, parentUsesGap, parentGap, parentPadding, alignItems) {
	const result = {
		marginTop: 0,
		marginLeft: 0
	};
	const parentBounds = getLayoutBounds(parent);
	const currBounds = getLayoutBounds(child);
	if (isRow) {
		if (prevChild) {
			const prevBounds = getLayoutBounds(prevChild);
			const prevRight = prevBounds.x + prevBounds.width;
			let actualGap = currBounds.x - prevRight;
			if (actualGap < 0 && actualGap >= -2) actualGap = 0;
			if (!parentUsesGap) result.marginLeft = actualGap;
			else if (Math.abs(actualGap - parentGap) > 2) result.marginLeft = actualGap - parentGap;
		}
		const contentTop = parentBounds.y + parentPadding.top;
		const contentBottom = parentBounds.y + parentBounds.height - parentPadding.bottom;
		const contentHeight = Math.max(0, contentBottom - contentTop);
		const childHeight = currBounds.height;
		const align = alignItems || "flex-start";
		let expectedTop = contentTop;
		if (align === "center") expectedTop = contentTop + (contentHeight - childHeight) / 2;
		else if (align === "flex-end") expectedTop = contentBottom - childHeight;
		const delta = currBounds.y - expectedTop;
		if (Math.abs(delta) > 1) result.marginTop = delta;
	} else {
		if (prevChild) {
			const prevBounds = getLayoutBounds(prevChild);
			const prevBottom = prevBounds.y + prevBounds.height;
			let actualGap = currBounds.y - prevBottom;
			if (actualGap < 0 && actualGap >= -2) actualGap = 0;
			if (!parentUsesGap) result.marginTop = actualGap;
			else if (Math.abs(actualGap - parentGap) > 2) result.marginTop = actualGap - parentGap;
		}
		const contentLeft = parentBounds.x + parentPadding.left;
		const contentRight = parentBounds.x + parentBounds.width - parentPadding.right;
		const contentWidth = Math.max(0, contentRight - contentLeft);
		const childWidth = currBounds.width;
		const align = alignItems || "flex-start";
		let expectedLeft = contentLeft;
		if (align === "center") expectedLeft = contentLeft + (contentWidth - childWidth) / 2;
		else if (align === "flex-end") expectedLeft = contentRight - childWidth;
		const delta = currBounds.x - expectedLeft;
		if (Math.abs(delta) > 1) result.marginLeft = delta;
	}
	return result;
}
function computeFingerprint(styles) {
	if (styles.length === 0) return "";
	const str = [...styles].sort().join("|");
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16).padStart(8, "0");
}
function generateSharedClassName(fingerprint, _index) {
	return `s-${fingerprint.slice(0, 6)}`;
}
function deduplicateStyles(entries, minSharedCount = 2) {
	const sharedClasses = [];
	const nodeClassMap = /* @__PURE__ */ new Map();
	const uniqueStyles = /* @__PURE__ */ new Map();
	const groups = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		if (!entry.fingerprint) continue;
		const group = groups.get(entry.fingerprint) || [];
		group.push(entry);
		groups.set(entry.fingerprint, group);
	}
	const usedClassNames = /* @__PURE__ */ new Set();
	for (const [fingerprint, group] of groups) if (group.length >= minSharedCount) {
		let className = generateSharedClassName(fingerprint, sharedClasses.length);
		while (usedClassNames.has(className)) className = `${className}-${sharedClasses.length}`;
		usedClassNames.add(className);
		sharedClasses.push({
			className,
			styles: group[0].styles,
			nodeIds: group.map((e) => e.nodeId)
		});
		for (const entry of group) nodeClassMap.set(entry.nodeId, [className]);
	} else for (const entry of group) {
		nodeClassMap.set(entry.nodeId, [entry.nodeClass]);
		uniqueStyles.set(entry.nodeId, entry.styles);
	}
	return {
		sharedClasses,
		nodeClassMap,
		uniqueStyles
	};
}
function generateSharedCss(sharedClasses) {
	if (sharedClasses.length === 0) return "";
	return `/* 共享样式类 */\n${sharedClasses.map((sc) => {
		const body = sc.styles.map((s) => `  ${s};`).join("\n");
		return `.${sc.className} {\n${body}\n}`;
	}).join("\n\n")}`;
}
function generateUniqueCss(uniqueStyles, nodeClassMap) {
	const rules = [];
	for (const [nodeId, styles] of uniqueStyles) {
		if (styles.length === 0) continue;
		const classNames = nodeClassMap.get(nodeId);
		if (!classNames || classNames.length === 0) continue;
		const nodeClass = classNames.find((c) => c.startsWith("n-"));
		if (!nodeClass) continue;
		const body = styles.map((s) => `  ${s};`).join("\n");
		rules.push(`.${nodeClass} {\n${body}\n}`);
	}
	if (rules.length === 0) return "";
	return `/* 唯一样式 */\n${rules.join("\n\n")}`;
}
function createStyleEntry(nodeId, nodeClass, styles) {
	return {
		nodeId,
		nodeClass,
		styles,
		fingerprint: computeFingerprint(styles)
	};
}
var NAME_TAG_RULES = [
	{
		exact: [
			"button",
			"btn",
			"按钮"
		],
		contains: ["button", "btn"],
		tag: "button",
		extraClass: "btn"
	},
	{
		exact: ["card", "卡片"],
		startsWith: ["卡片"],
		tag: "article",
		extraClass: "card"
	},
	{
		exact: [
			"link",
			"链接",
			"常用链接"
		],
		tag: "a",
		extraClass: "link"
	}
];
function inferTagFromName(name) {
	if (!name) return null;
	const lowerName = name.toLowerCase().trim();
	for (const rule of NAME_TAG_RULES) {
		if (rule.exact) {
			for (const keyword of rule.exact) if (lowerName === keyword.toLowerCase()) return {
				tag: rule.tag,
				role: rule.role,
				extraClass: rule.extraClass
			};
		}
		if (rule.startsWith) {
			for (const keyword of rule.startsWith) if (lowerName.startsWith(keyword.toLowerCase())) return {
				tag: rule.tag,
				role: rule.role,
				extraClass: rule.extraClass
			};
		}
		if (rule.contains) {
			for (const keyword of rule.contains) if (keyword.match(/^[a-z]+$/i)) {
				if (new RegExp(`(^|[^a-z])${keyword}([^a-z]|$)`, "i").test(lowerName)) return {
					tag: rule.tag,
					role: rule.role,
					extraClass: rule.extraClass
				};
			}
		}
	}
	return null;
}
function inferTagFromType(node) {
	switch (node.type) {
		case "TEXT": return {
			tag: "span",
			extraClass: "text"
		};
		case "ICON": return {
			tag: "img",
			extraClass: "icon",
			role: "img"
		};
		case "IMAGE": return {
			tag: "img",
			role: "img"
		};
		case "VECTOR": return {
			tag: "img",
			extraClass: "vector",
			role: "img"
		};
		case "INSTANCE":
		case "VIRTUAL_GROUP":
		case "FRAME":
		case "GROUP":
		default:
			if (node.shouldBeImage && (!node.children || node.children.length === 0)) return {
				tag: "img",
				role: "img"
			};
			return { tag: "div" };
	}
}
function inferTag(node) {
	const nameInference = inferTagFromName(node.name);
	if (nameInference) return nameInference;
	return inferTagFromType(node);
}
function isSelfClosingTag(tag) {
	return [
		"img",
		"input",
		"br",
		"hr",
		"meta",
		"link"
	].includes(tag);
}
const IMG_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%2525%27 height=%27100%2525%27 viewBox=%270 0 120 80%27 preserveAspectRatio=%27none%27%3E%3Crect fill=%27%23e8ecf1%27 stroke=%27%23000%27 stroke-width=%271%27 vector-effect=%27non-scaling-stroke%27 width=%27120%27 height=%2780%27/%3E%3Cg transform=%27translate(60,40)%27%3E%3Cpath d=%27M-20 8L-10-8L-2 4L6-12L20 8Z%27 fill=%27%23b0bec5%27/%3E%3Ccircle cx=%27-12%27 cy=%27-12%27 r=%274%27 fill=%27%23b0bec5%27/%3E%3C/g%3E%3C/svg%3E";
function sortChildrenForRender(node) {
	const children = node.children ?? [];
	if (children.length <= 1) return [...children];
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const isWrap = node.layout?.flexWrap === "wrap";
	return [...children].sort((a, b) => {
		if (isWrap) return isRow ? a.y - b.y || a.x - b.x : a.x - b.x || a.y - b.y;
		return isRow ? a.x - b.x : a.y - b.y;
	});
}
function mergeClassNames(...classNames) {
	const seen = /* @__PURE__ */ new Set();
	const tokens = [];
	for (const value of classNames) {
		if (!value) continue;
		for (const token of value.split(/\s+/).filter(Boolean)) {
			if (seen.has(token)) continue;
			seen.add(token);
			tokens.push(token);
		}
	}
	return tokens.join(" ");
}
function removeRedundantNesting(node) {
	if (node.children && node.children.length > 0) node = {
		...node,
		children: node.children.map((child) => removeRedundantNesting(child))
	};
	if (node.children && node.children.length === 1 && node.children[0].children && node.children[0].children.length > 0) {
		const child = node.children[0];
		if (Math.abs(node.width - child.width) < 2 && Math.abs(node.height - child.height) < 2 && child.type === "VIRTUAL_GROUP") return {
			...node,
			layout: child.layout || node.layout,
			children: child.children
		};
	}
	return node;
}
function escapeHtml$1(input) {
	return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function sanitizeClassName(value) {
	return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function nodeIdToClass(nodeId) {
	return `id-${nodeId.replace(/[^a-zA-Z0-9]/g, "-")}`;
}
function buildClassNames(node, classMode, debugMode = false) {
	const hasChildren = node.children && node.children.length > 0;
	const classes = [];
	if (debugMode) {
		classes.push("layout-node", hasChildren ? "is-container" : "is-leaf", `type-${node.type.toLowerCase()}`);
		if (node.id) classes.push(nodeIdToClass(node.id));
	} else {
		classes.push("layout-node");
		const hasExplicitVisualStyles = !!(node.styles?.background || node.styles?.border || node.styles?.borderRadius);
		if (node.mask !== true && !hasExplicitVisualStyles) {
			if (node.type === "IMAGE") classes.push("type-image");
			else if (node.type === "ICON") classes.push("type-icon");
			else if (node.type === "VECTOR") classes.push("type-vector");
		}
	}
	if (classMode === "tailwind") {
		if (node.layout?.display === "flex") {
			const direction = node.layout.flexDirection === "row" || !node.layout.flexDirection ? "row" : "col";
			const alignItems = node.layout.alignItems || "flex-start";
			let alignSuffix = "start";
			if (alignItems === "center") alignSuffix = "center";
			else if (alignItems === "flex-end") alignSuffix = "end";
			classes.push(`flex-${direction}-${alignSuffix}`);
			const justify = node.layout.justifyContent;
			if (justify === "center") classes.push("justify-center");
			else if (justify === "flex-end") classes.push("justify-end");
			else if (justify === "space-between") classes.push("justify-between");
		}
	} else classes.push("layout-box");
	return classes;
}
function containsTextContent(node) {
	if (node.type === "TEXT") return true;
	return !!node.children?.some((c) => c.type === "TEXT");
}
function shouldUseSpaceBetween(node, spacingAnalysis) {
	if (!spacingAnalysis || !node.children || node.children.length !== 2) return false;
	if (!(node.layout?.flexDirection === "row" || !node.layout?.flexDirection)) return false;
	const justify = node.layout?.justifyContent;
	if (justify && justify !== "flex-start") return false;
	const parentWidth = typeof node.width === "number" ? node.width : 0;
	if (parentWidth <= 0) return false;
	const { left, right: right$1 } = spacingAnalysis.padding;
	const sorted = [...node.children].sort((a, b) => a.x - b.x);
	if (spacingAnalysis.useGap && spacingAnalysis.gap > 0) {
		if (left > 1 || right$1 > 1) return false;
		const leftWidth = getEffectiveBounds(sorted[0]).width;
		const rightWidth = getEffectiveBounds(sorted[1]).width;
		const expectedGap = parentWidth - left - right$1 - leftWidth - rightWidth;
		return Math.abs(expectedGap - spacingAnalysis.gap) <= 2;
	}
	const rightChild = sorted[1];
	const rightChildEdge = rightChild.x + rightChild.width;
	const parentEdge = node.x + parentWidth;
	if (!(Math.abs(rightChildEdge - parentEdge) <= 3)) return false;
	if (sorted[0].x + sorted[0].width - rightChild.x <= 0) return false;
	if (!containsTextContent(sorted[0]) && !containsTextContent(sorted[1])) return false;
	const hasVS = (n) => !!(n.styles?.background || n.styles?.border || n.styles?.borderRadius);
	if (hasVS(sorted[0]) && hasVS(sorted[1])) return false;
	return true;
}
function hasOverflowingChildren(node) {
	if (!node.children || node.children.length === 0) return false;
	if (!(typeof node.width === "number" && node.width > 0 && typeof node.height === "number" && node.height > 0)) return false;
	const tolerance = 2;
	const right$1 = node.x + node.width;
	const bottom$1 = node.y + node.height;
	return node.children.some((child) => child.x < node.x - tolerance || child.y < node.y - tolerance || child.x + child.width > right$1 + tolerance || child.y + child.height > bottom$1 + tolerance);
}
var THIN_ELEMENT_TYPES = new Set([
	"VECTOR",
	"LINE",
	"RECTANGLE",
	"PATH"
]);
var THIN_HEIGHT_THRESHOLD = 5;
function shouldPreserveColumnTextHeight(node, parentCtx) {
	if (!parentCtx || parentCtx.isRow || !parentCtx.parent.children?.length) return false;
	const siblings = [...parentCtx.parent.children].sort((a, b) => a.y - b.y || a.x - b.x);
	const index = siblings.findIndex((sibling) => sibling.id === node.id);
	if (index === -1) return false;
	return siblings.slice(index + 1).some((sibling) => THIN_ELEMENT_TYPES.has(sibling.type) && typeof sibling.height === "number" && sibling.height < THIN_HEIGHT_THRESHOLD);
}
function collectStyleParts(node, isRoot, spacingAnalysis, parentCtx, imagePlaceholder) {
	const parts = [];
	const isLeaf = !node.children || node.children.length === 0;
	const isGraphic = [
		"IMAGE",
		"ICON",
		"RECTANGLE",
		"ELLIPSE",
		"LINE",
		"POLYGON",
		"STAR",
		"VECTOR",
		"PATH"
	].includes(node.type);
	const isText = node.type === "TEXT";
	const hasVisualStyles = !!(node.styles?.background || node.styles?.border || node.styles?.borderRadius);
	const addDimensions = () => {
		if (typeof node.width === "number" && node.width > 0) parts.push(`width: ${node.width}px`);
		if (typeof node.height === "number" && node.height > 0) parts.push(`height: ${node.height}px`);
	};
	const isContainerInRow = parentCtx?.isRow && !isRoot && !isLeaf && !isText;
	const isWrapContainer = node.layout?.flexWrap === "wrap";
	if (isRoot || isGraphic || isLeaf && !isText || hasVisualStyles || isContainerInRow || isWrapContainer) addDimensions();
	else if (isText) {
		const baselines = node.textData?.baselines;
		const baselineCount = Array.isArray(baselines) ? baselines.length : 0;
		const hasBaselineInfo = baselineCount > 0;
		const isMultiLineByBaseline = hasBaselineInfo && baselineCount > 1;
		const hasExplicitHeight = typeof node.height === "number" && node.height > 0;
		const preserveSingleLineHeight = shouldPreserveColumnTextHeight(node, parentCtx);
		let isMultiLineByHeight = false;
		if (!hasBaselineInfo) {
			const singleLineHeight = parseFloat(node.styles?.fontSize || "14px") * parseFloat(node.styles?.lineHeight || "1.5");
			isMultiLineByHeight = !!(node.height && node.height > singleLineHeight + 1);
		}
		if ((isMultiLineByBaseline || isMultiLineByHeight) && typeof node.width === "number" && node.width > 0) parts.push(`width: ${node.width}px`);
		if (!isMultiLineByBaseline && !isMultiLineByHeight && preserveSingleLineHeight && hasExplicitHeight) {
			parts.push(`height: ${node.height}px`);
			if (!node.styles?.lineHeight) parts.push(`line-height: ${node.height}px`);
		}
	}
	const layoutGap = node.layout?.gap;
	const layoutRowGap = node.layout?.rowGap;
	const layoutColumnGap = node.layout?.columnGap;
	const hasLayoutGap = typeof layoutGap === "number" && layoutGap > 0;
	const hasLayoutRowGap = typeof layoutRowGap === "number" && layoutRowGap > 0;
	const hasLayoutColumnGap = typeof layoutColumnGap === "number" && layoutColumnGap > 0;
	const hasLayoutPadding = typeof node.layout?.paddingTop === "number" || typeof node.layout?.paddingRight === "number" || typeof node.layout?.paddingBottom === "number" || typeof node.layout?.paddingLeft === "number";
	if (node.layout?.flexWrap) parts.push(`flex-wrap: ${node.layout.flexWrap}`);
	if (hasLayoutGap || hasLayoutRowGap || hasLayoutColumnGap || hasLayoutPadding) {
		if (hasLayoutGap) parts.push(`gap: ${layoutGap}px`);
		if (hasLayoutRowGap) parts.push(`row-gap: ${layoutRowGap}px`);
		if (hasLayoutColumnGap) parts.push(`column-gap: ${layoutColumnGap}px`);
		const padParts = [
			node.layout?.paddingTop ?? 0,
			node.layout?.paddingRight ?? 0,
			node.layout?.paddingBottom ?? 0,
			node.layout?.paddingLeft ?? 0
		].map((value) => value > 0 ? `${value}px` : "0");
		if (padParts.some((value) => value !== "0")) parts.push(`padding: ${padParts.join(" ")}`);
	} else if (spacingAnalysis) {
		const { useGap, gap, padding } = spacingAnalysis;
		const useSpaceBetween = shouldUseSpaceBetween(node, spacingAnalysis);
		const gapRound = Math.round(gap);
		if (useSpaceBetween) {
			if (!parts.some((part) => part.startsWith("width:")) && typeof node.width === "number" && node.width > 0) parts.push(`width: ${node.width}px`);
			parts.push("justify-content: space-between");
		} else if (useGap && gapRound > 0) parts.push(`gap: ${gapRound}px`);
		const padParts = [
			Math.round(padding.top),
			Math.round(padding.right),
			Math.round(padding.bottom),
			Math.round(padding.left)
		].map((value) => value > 0 ? `${value}px` : "0");
		if (padParts.some((value) => value !== "0")) parts.push(`padding: ${padParts.join(" ")}`);
	}
	if (parentCtx) {
		const hasLayoutMarginTop = typeof node.layout?.marginTop === "number";
		const hasLayoutMarginLeft = typeof node.layout?.marginLeft === "number";
		let mt = hasLayoutMarginTop ? Math.round(node.layout.marginTop) : 0;
		let ml = hasLayoutMarginLeft ? Math.round(node.layout.marginLeft) : 0;
		if (!(parentCtx.parent.layout?.flexWrap === "wrap") && !parentCtx.spaceBetween && (!hasLayoutMarginTop || !hasLayoutMarginLeft)) {
			const pUseGap = typeof parentCtx.parent.layout?.gap === "number" && parentCtx.parent.layout.gap > 0 || parentCtx.useGap;
			const pGap = typeof parentCtx.parent.layout?.gap === "number" ? parentCtx.parent.layout.gap : parentCtx.gap;
			const pPadding = {
				top: parentCtx.parent.layout?.paddingTop ?? parentCtx.padding.top,
				right: parentCtx.parent.layout?.paddingRight ?? parentCtx.padding.right,
				bottom: parentCtx.parent.layout?.paddingBottom ?? parentCtx.padding.bottom,
				left: parentCtx.parent.layout?.paddingLeft ?? parentCtx.padding.left
			};
			const margins = calcChildMargins(node, parentCtx.parent, parentCtx.prevSibling, parentCtx.isRow, pUseGap, pGap, pPadding, parentCtx.alignItems);
			if (!hasLayoutMarginTop) mt = Math.round(margins.marginTop);
			if (!hasLayoutMarginLeft) ml = Math.round(margins.marginLeft);
		}
		if (mt !== 0) parts.push(`margin-top: ${mt}px`);
		if (ml !== 0 && !parentCtx.spaceBetween) parts.push(`margin-left: ${ml}px`);
	}
	if (!isLeaf && hasVisualStyles && hasOverflowingChildren(node)) parts.push("overflow: hidden");
	if (node.styles) {
		for (const [key, value] of Object.entries(node.styles)) if (value !== void 0 && value !== null) {
			const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			let cssValue = String(value);
			if (imagePlaceholder && cssKey === "background" && cssValue.includes("url(") && !cssValue.includes("data:")) cssValue = `url("${IMG_PLACEHOLDER}") no-repeat center/cover`;
			parts.push(`${cssKey}: ${cssValue}`);
		}
	}
	return parts;
}
const COMPONENT_BASE_STYLES = `.layout-root { position: relative; }
.layout-node { box-sizing: border-box; flex-shrink: 0; }
.flex-row-start { display: flex; flex-direction: row; align-items: flex-start; }
.flex-row-center { display: flex; flex-direction: row; align-items: center; }
.flex-row-end { display: flex; flex-direction: row; align-items: flex-end; }
.flex-col-start { display: flex; flex-direction: column; align-items: flex-start; }
.flex-col-center { display: flex; flex-direction: column; align-items: center; }
.flex-col-end { display: flex; flex-direction: column; align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.btn { display: inline-flex; align-items: center; justify-content: center; text-align: center; border: none; padding: 0; background: none; outline: none; appearance: none; -webkit-appearance: none; }
.type-image, .type-icon, .type-vector { border-radius: 4px; display: block; object-fit: cover; }`;
function collectAllStyles(node, isRoot, path, parentCtx, entries, contexts, imagePlaceholder = false) {
	const hasChildren = node.children && node.children.length > 0;
	const nodeId = node.id || `node-${path}`;
	const nodeClass = `n-${sanitizeClassName(nodeId)}`;
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const sortedChildren = hasChildren ? sortChildrenForRender(node) : [];
	const spacingAnalysis = hasChildren ? analyzeChildSpacing(node, sortedChildren, isRow) : void 0;
	const styles = collectStyleParts(node, isRoot, spacingAnalysis, parentCtx, imagePlaceholder);
	entries.push(createStyleEntry(nodeId, nodeClass, styles));
	contexts.push({
		node,
		nodeId,
		nodeClass,
		isRoot,
		spacingAnalysis,
		parentCtx,
		path
	});
	if (hasChildren) {
		const usesSpaceBetween = shouldUseSpaceBetween(node, spacingAnalysis);
		const childCtxBase = {
			parent: node,
			useGap: spacingAnalysis?.useGap ?? false,
			gap: spacingAnalysis?.gap ?? 0,
			padding: {
				top: spacingAnalysis?.padding?.top ?? 0,
				right: spacingAnalysis?.padding?.right ?? 0,
				bottom: spacingAnalysis?.padding?.bottom ?? 0,
				left: spacingAnalysis?.padding?.left ?? 0
			},
			isRow,
			alignItems: node.layout?.alignItems,
			spaceBetween: usesSpaceBetween
		};
		sortedChildren.forEach((child, index) => {
			const prev = index > 0 ? sortedChildren[index - 1] : null;
			const childCtx = {
				...childCtxBase,
				prevSibling: prev
			};
			collectAllStyles(child, false, `${path}-${index}`, childCtx, entries, contexts, imagePlaceholder);
		});
	}
}
function renderNodeWithDedup(node, _isRoot, includeLabels, classMode, debugMode, dedupResult, path, _parentCtx, semanticTags = true, includeNodeId = true, includeNodeName = false, imagePlaceholder = false) {
	const hasChildren = node.children && node.children.length > 0;
	const nodeId = node.id || `node-${path}`;
	const tagInfo = semanticTags ? inferTag(node) : { tag: "div" };
	const tag = tagInfo.tag;
	const baseClasses = buildClassNames(node, classMode, debugMode);
	if (tagInfo.extraClass) baseClasses.push(tagInfo.extraClass);
	const allClasses = [...dedupResult.nodeClassMap.get(nodeId) || [], ...baseClasses].join(" ");
	const label = includeLabels ? `<span class="layout-label">${escapeHtml$1(node.name || node.type)}</span>` : "";
	let content = "";
	if (node.characters) content = escapeHtml$1(node.characters);
	const dataType = debugMode ? ` data-type="${escapeHtml$1(node.type)}"` : "";
	const dataNodeId = includeNodeId && nodeId ? ` data-node-id="${escapeHtml$1(nodeId)}"` : "";
	const dataName = includeNodeName && node.name ? ` data-name="${escapeHtml$1(node.name)}"` : "";
	const _yoloInfo = node.componentInfo?.source === "yolo" ? node.componentInfo : node.componentInfo?._yolo;
	const dataComponent = _yoloInfo?.name ? ` data-component="${escapeHtml$1(_yoloInfo.name)}"` : "";
	const roleAttr = tagInfo.role ? ` role="${tagInfo.role}"` : "";
	const fillRef = imagePlaceholder ? void 0 : node.fills?.find((f) => f.type === "IMAGE" && f.imageRef && !f.imageRef.startsWith("$") && !f.imageRef.startsWith("data:"))?.imageRef;
	const imgSrc = imagePlaceholder ? IMG_PLACEHOLDER : node.imgUrl || node.blobPath || fillRef || `assets/${nodeId.replace(/:/g, "_")}.svg`;
	const srcAttr = tag === "img" && nodeId ? ` src="${imgSrc}"` : "";
	const onerrorAttr = tag === "img" && imgSrc !== "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%2525%27 height=%27100%2525%27 viewBox=%270 0 120 80%27 preserveAspectRatio=%27none%27%3E%3Crect fill=%27%23e8ecf1%27 stroke=%27%23000%27 stroke-width=%271%27 vector-effect=%27non-scaling-stroke%27 width=%27120%27 height=%2780%27/%3E%3Cg transform=%27translate(60,40)%27%3E%3Cpath d=%27M-20 8L-10-8L-2 4L6-12L20 8Z%27 fill=%27%23b0bec5%27/%3E%3Ccircle cx=%27-12%27 cy=%27-12%27 r=%274%27 fill=%27%23b0bec5%27/%3E%3C/g%3E%3C/svg%3E" ? ` onerror="this.onerror=null;this.src='${IMG_PLACEHOLDER}'"` : "";
	const altAttr = tag === "img" ? ` alt="${escapeHtml$1(node.name || "")}"` : "";
	if (isSelfClosingTag(tag)) return `<${tag} class="${allClasses}"${srcAttr}${onerrorAttr}${dataNodeId}${dataName}${dataComponent}${dataType}${roleAttr}${altAttr} />`;
	if (!hasChildren) return `<${tag} class="${allClasses}"${dataNodeId}${dataName}${dataComponent}${dataType}${roleAttr}>${label}${content}</${tag}>`;
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const sortedChildren = sortChildrenForRender(node);
	const spacingAnalysis = analyzeChildSpacing(node, sortedChildren, isRow);
	const childCtxBase = {
		parent: node,
		useGap: spacingAnalysis?.useGap ?? false,
		gap: spacingAnalysis?.gap ?? 0,
		padding: {
			top: spacingAnalysis?.padding?.top ?? 0,
			right: spacingAnalysis?.padding?.right ?? 0,
			bottom: spacingAnalysis?.padding?.bottom ?? 0,
			left: spacingAnalysis?.padding?.left ?? 0
		},
		isRow,
		alignItems: node.layout?.alignItems
	};
	return `<${tag} class="${allClasses}"${dataNodeId}${dataName}${dataComponent}${dataType}${roleAttr}>${label}${sortedChildren.map((child, index) => {
		const prev = index > 0 ? sortedChildren[index - 1] : null;
		const childCtx = {
			...childCtxBase,
			prevSibling: prev
		};
		return renderNodeWithDedup(child, false, includeLabels, classMode, debugMode, dedupResult, `${path}-${index}`, childCtx, semanticTags, includeNodeId, includeNodeName, imagePlaceholder);
	}).join("")}</${tag}>`;
}
function renderNode$1(node, isRoot, includeLabels, classMode, debugMode, cssRules, path, parentCtx, semanticTags = true, includeNodeId = true, includeNodeName = false, imagePlaceholder = false) {
	const hasChildren = node.children && node.children.length > 0;
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const sortedChildren = hasChildren ? sortChildrenForRender(node) : [];
	const spacingAnalysis = hasChildren ? analyzeChildSpacing(node, sortedChildren, isRow) : void 0;
	const tagInfo = semanticTags ? inferTag(node) : { tag: "div" };
	const tag = tagInfo.tag;
	const styleParts = collectStyleParts(node, isRoot, spacingAnalysis, parentCtx, imagePlaceholder);
	const hasStyles = styleParts.length > 0;
	const baseClasses = buildClassNames(node, classMode, debugMode);
	if (tagInfo.extraClass) baseClasses.push(tagInfo.extraClass);
	const allClasses = [...baseClasses];
	const nodeId = node.id || `node-${path}`;
	if (hasStyles) {
		const nodeClass = `n-${sanitizeClassName(nodeId)}`;
		allClasses.unshift(nodeClass);
		const cssBody = styleParts.map((p) => `  ${p};`).join("\n");
		cssRules.push(`.${nodeClass} {\n${cssBody}\n}`);
	}
	const label = includeLabels ? `<span class="layout-label">${escapeHtml$1(node.name || node.type)}</span>` : "";
	let content = "";
	if (node.characters) content = escapeHtml$1(node.characters);
	const dataType = debugMode ? ` data-type="${escapeHtml$1(node.type)}"` : "";
	const dataNodeId = includeNodeId && nodeId ? ` data-node-id="${escapeHtml$1(nodeId)}"` : "";
	const dataName = includeNodeName && node.name ? ` data-name="${escapeHtml$1(node.name)}"` : "";
	const _yolo = node.componentInfo?.source === "yolo" ? node.componentInfo : node.componentInfo?._yolo;
	const dataComponent = _yolo?.name ? ` data-component="${escapeHtml$1(_yolo.name)}"` : "";
	const roleAttr = tagInfo.role ? ` role="${tagInfo.role}"` : "";
	const fillRef = imagePlaceholder ? void 0 : node.fills?.find((f) => f.type === "IMAGE" && f.imageRef && !f.imageRef.startsWith("$") && !f.imageRef.startsWith("data:"))?.imageRef;
	const imgSrc = imagePlaceholder ? IMG_PLACEHOLDER : node.imgUrl || node.blobPath || fillRef || `assets/${nodeId.replace(/:/g, "_")}.svg`;
	const srcAttr = tag === "img" && nodeId ? ` src="${imgSrc}"` : "";
	const onerrorAttr = tag === "img" && imgSrc !== "data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27100%2525%27 height=%27100%2525%27 viewBox=%270 0 120 80%27 preserveAspectRatio=%27none%27%3E%3Crect fill=%27%23e8ecf1%27 stroke=%27%23000%27 stroke-width=%271%27 vector-effect=%27non-scaling-stroke%27 width=%27120%27 height=%2780%27/%3E%3Cg transform=%27translate(60,40)%27%3E%3Cpath d=%27M-20 8L-10-8L-2 4L6-12L20 8Z%27 fill=%27%23b0bec5%27/%3E%3Ccircle cx=%27-12%27 cy=%27-12%27 r=%274%27 fill=%27%23b0bec5%27/%3E%3C/g%3E%3C/svg%3E" ? ` onerror="this.onerror=null;this.src='${IMG_PLACEHOLDER}'"` : "";
	const altAttr = tag === "img" ? ` alt="${escapeHtml$1(node.name || "")}"` : "";
	if (isSelfClosingTag(tag)) return `<${tag} class="${allClasses.join(" ")}"${srcAttr}${onerrorAttr}${dataNodeId}${dataName}${dataComponent}${dataType}${roleAttr}${altAttr} />`;
	if (!hasChildren) return `<${tag} class="${allClasses.join(" ")}"${dataNodeId}${dataName}${dataComponent}${dataType}${roleAttr}>${label}${content}</${tag}>`;
	const usesSpaceBetween = shouldUseSpaceBetween(node, spacingAnalysis);
	const childCtxBase = {
		parent: node,
		useGap: spacingAnalysis?.useGap ?? false,
		gap: spacingAnalysis?.gap ?? 0,
		padding: {
			top: spacingAnalysis?.padding?.top ?? 0,
			right: spacingAnalysis?.padding?.right ?? 0,
			bottom: spacingAnalysis?.padding?.bottom ?? 0,
			left: spacingAnalysis?.padding?.left ?? 0
		},
		isRow,
		alignItems: node.layout?.alignItems,
		spaceBetween: usesSpaceBetween
	};
	const childrenHtml = sortedChildren.map((child, index) => {
		const prev = index > 0 ? sortedChildren[index - 1] : null;
		const childCtx = {
			...childCtxBase,
			prevSibling: prev
		};
		return renderNode$1(child, false, includeLabels, classMode, debugMode, cssRules, `${path}-${index}`, childCtx, semanticTags, includeNodeId, includeNodeName, imagePlaceholder);
	}).join("");
	return `<${tag} class="${allClasses.join(" ")}"${dataNodeId}${dataName}${dataComponent}${dataType}${roleAttr}>${label}${childrenHtml}</${tag}>`;
}
var PAGE_BASE_STYLES = `body { margin: 0; padding: 16px; }
${COMPONENT_BASE_STYLES}`;
function renderLayoutPageWithCss(node, options = {}) {
	const { title = "Layout Render", includeStyles = true, ...rest } = options;
	const { rootClassName = "layout-root", includeLabels = false, classMode = "tailwind", debugMode = false, enableDedup = false, semanticTags = true, includeNodeId = true, includeNodeName = false, imagePlaceholder = false } = rest;
	const designWidth = node.width || 1920;
	const cleanedNode = removeRedundantNesting(node);
	let body;
	let css;
	if (enableDedup) {
		const entries = [];
		collectAllStyles(cleanedNode, true, "0", void 0, entries, [], imagePlaceholder);
		const dedupResult = deduplicateStyles(entries);
		body = `<div id="layout-container" class="${mergeClassNames("layout-root", rootClassName)}">${renderNodeWithDedup(cleanedNode, true, includeLabels, classMode, debugMode, dedupResult, "0", void 0, semanticTags, includeNodeId, includeNodeName, imagePlaceholder)}</div>`;
		css = [generateSharedCss(dedupResult.sharedClasses), generateUniqueCss(dedupResult.uniqueStyles, dedupResult.nodeClassMap)].filter(Boolean).join("\n\n");
	} else {
		const cssRules = [];
		body = `<div id="layout-container" class="${mergeClassNames("layout-root", rootClassName)}">${renderNode$1(cleanedNode, true, includeLabels, classMode, debugMode, cssRules, "0", void 0, semanticTags, includeNodeId, includeNodeName, imagePlaceholder)}</div>`;
		css = cssRules.join("\n\n");
	}
	const fullCss = `${PAGE_BASE_STYLES}\n\n${css}`;
	const scaleScript = `
    <script>
      (function() {
        var designWidth = ${designWidth};
        var container = document.getElementById('layout-container');
        function updateScale() {
          var deviceWidth = window.innerWidth - 32; // 减去 body padding
          var scale = Math.min(deviceWidth / designWidth, 1);
          container.style.transform = 'scale(' + scale + ')';
          container.style.transformOrigin = 'top left';
        }
        updateScale();
        window.addEventListener('resize', updateScale);
      })();
    <\/script>`;
	return {
		html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml$1(title)}</title>
    ${includeStyles ? `<style>\n${fullCss}\n    </style>` : ""}
  </head>
  <body>
    ${body}
    ${scaleScript}
  </body>
</html>`,
		css,
		fullCss
	};
}
function indentBlock(content, level = 1) {
	const indent = "  ".repeat(level);
	return content.split("\n").map((line) => line ? `${indent}${line}` : line).join("\n");
}
function getVueChildrenMeta(node) {
	const hasChildren = !!(node.children && node.children.length > 0);
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const sortedChildren = hasChildren ? sortChildrenForRender(node) : [];
	return {
		hasChildren,
		isRow,
		sortedChildren,
		spacingAnalysis: hasChildren ? analyzeChildSpacing(node, sortedChildren, isRow) : void 0
	};
}
function buildVueAttrString(node, classes, includeNodeId, includeNodeName, extraAttrs = []) {
	const attrs = [];
	const className = classes.filter(Boolean).join(" ");
	attrs.push(...extraAttrs);
	if (className) attrs.push(`class="${className}"`);
	if (includeNodeId && node.id) attrs.push(`data-node-id="${escapeHtml$1(node.id)}"`);
	if (includeNodeName && node.name) attrs.push(`data-name="${escapeHtml$1(node.name)}"`);
	return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}
function normalizePropList(list) {
	if (!Array.isArray(list)) return [];
	return list.map((item) => {
		if (!item || typeof item !== "object") return null;
		const key = item.key ?? item.k;
		const value = item.value ?? item.v;
		if (typeof key !== "string" || value === void 0 || value === null) return null;
		return {
			key,
			value: String(value),
			type: typeof item.type === "string" ? item.type : typeof item.t === "string" ? item.t : void 0
		};
	}).filter((item) => !!item);
}
function parseVariantAssignments(value) {
	if (typeof value !== "string" || !value.includes("=")) return [];
	return value.split(",").map((part) => part.trim()).map((part) => {
		const equalIndex = part.indexOf("=");
		if (equalIndex <= 0) return null;
		const key = part.slice(0, equalIndex).trim();
		const rawValue = part.slice(equalIndex + 1).trim();
		if (!key || !rawValue) return null;
		return {
			key,
			value: rawValue
		};
	}).filter((item) => !!item);
}
function dedupeProps(primary, fallback) {
	const seen = /* @__PURE__ */ new Set();
	const result = [];
	for (const item of [...primary, ...fallback]) {
		if (!item.key || seen.has(item.key)) continue;
		seen.add(item.key);
		result.push(item);
	}
	return result;
}
function getComponentInfo(input) {
	if (!input || typeof input !== "object") return void 0;
	return "componentInfo" in input ? input.componentInfo : void 0;
}
function normalizeComponentMeta(input) {
	const info = getComponentInfo(input);
	if (!info || typeof info !== "object") return void 0;
	const props = dedupeProps(normalizePropList(info.instanceProperties ?? info.prop), dedupeProps(parseVariantAssignments(info.symbolName), parseVariantAssignments(info.styleName)));
	const meta = {
		componentKey: typeof info.componentKey === "string" ? info.componentKey : void 0,
		componentName: typeof info.componentName === "string" ? info.componentName : typeof info.name === "string" ? info.name : void 0,
		instanceName: typeof info.instanceName === "string" ? info.instanceName : void 0,
		nodeName: typeof info.nodeName === "string" ? info.nodeName : void 0,
		symbolName: typeof info.symbolName === "string" ? info.symbolName : void 0,
		styleName: typeof info.styleName === "string" ? info.styleName : void 0,
		props
	};
	if (!meta.componentKey && !meta.componentName && !meta.instanceName && props.length === 0) return;
	return meta;
}
function inferPropType(value) {
	if (/^(true|false)$/i.test(value)) return "boolean";
	if (/^-?\d+(\.\d+)?$/.test(value)) return "number";
	return "string";
}
function getLookupKeys(meta) {
	return [
		meta.componentKey,
		meta.componentName,
		meta.instanceName,
		meta.nodeName
	].filter((item) => !!item).map((item) => item.trim()).filter(Boolean);
}
function resolveVueComponent(node, registry) {
	if (!registry) return void 0;
	const meta = normalizeComponentMeta(node);
	if (!meta) return void 0;
	for (const key of getLookupKeys(meta)) {
		const entry = registry[key];
		if (!entry) continue;
		const importLocalName = entry.localName || entry.importName;
		const tagName = entry.tagName || importLocalName;
		return {
			meta,
			entry: {
				importType: "default",
				slotPolicy: "none",
				...entry
			},
			importLocalName,
			tagName,
			importKey: `${entry.importType || "default"}:${entry.importFrom}:${entry.importName}:${importLocalName}`
		};
	}
}
function buildVueComponentBindings(node, resolved) {
	const bindings = [];
	const rules = resolved.entry.props || {};
	for (const prop of resolved.meta.props) {
		const rule = rules[prop.key];
		if (rule?.omit) continue;
		const name = rule?.to || prop.key;
		const transformedValue = rule?.transform ? rule.transform(prop.value, prop, node) : prop.value;
		const bindType = rule?.type && rule.type !== "auto" ? rule.type : inferPropType(transformedValue);
		if (bindType === "boolean" || bindType === "number") {
			bindings.push({
				name: `:${name}`,
				value: transformedValue,
				dynamic: true
			});
			continue;
		}
		bindings.push({
			name,
			value: transformedValue
		});
	}
	return bindings;
}
function getVueComponentSlotContent(node, resolved) {
	if (resolved.entry.slotPolicy !== "default-text") return void 0;
	if (node.characters) return escapeHtml$1(node.characters);
	if (!node.children || node.children.length === 0) return void 0;
	const textChildren = node.children.filter((child) => child.type === "TEXT" && child.characters);
	if (textChildren.length !== 1) return void 0;
	return escapeHtml$1(textChildren[0].characters || "");
}
function stringifyVueBindings(bindings) {
	if (bindings.length === 0) return "";
	return bindings.map((binding) => {
		if (binding.value === void 0) return binding.name;
		return binding.dynamic ? `${binding.name}="${binding.value}"` : `${binding.name}="${escapeHtml$1(binding.value)}"`;
	}).join(" ");
}
function buildVueImportStatements(components) {
	const seen = /* @__PURE__ */ new Set();
	const lines = [];
	for (const component of components) {
		if (seen.has(component.importKey)) continue;
		seen.add(component.importKey);
		if (component.entry.importType === "named") {
			if (component.importLocalName !== component.entry.importName) lines.push(`import { ${component.entry.importName} as ${component.importLocalName} } from '${component.entry.importFrom}'`);
			else lines.push(`import { ${component.entry.importName} } from '${component.entry.importFrom}'`);
			continue;
		}
		lines.push(`import ${component.importLocalName} from '${component.entry.importFrom}'`);
	}
	return lines.join("\n");
}
function collectVueStyles(node, isRoot, path, parentCtx, entries) {
	const { hasChildren, isRow, sortedChildren, spacingAnalysis } = getVueChildrenMeta(node);
	const nodeId = node.id || `node-${path}`;
	const nodeClass = `n-${sanitizeClassName(nodeId)}`;
	const styles = collectStyleParts(node, isRoot, spacingAnalysis, parentCtx);
	entries.push(createStyleEntry(nodeId, nodeClass, styles));
	if (!hasChildren) return;
	const childCtxBase = {
		parent: node,
		useGap: spacingAnalysis?.useGap ?? false,
		gap: spacingAnalysis?.gap ?? 0,
		padding: {
			top: spacingAnalysis?.padding?.top ?? 0,
			right: spacingAnalysis?.padding?.right ?? 0,
			bottom: spacingAnalysis?.padding?.bottom ?? 0,
			left: spacingAnalysis?.padding?.left ?? 0
		},
		isRow,
		alignItems: node.layout?.alignItems
	};
	sortedChildren.forEach((child, index) => {
		const prev = index > 0 ? sortedChildren[index - 1] : null;
		collectVueStyles(child, false, `${path}-${index}`, {
			...childCtxBase,
			prevSibling: prev
		}, entries);
	});
}
function renderVueNode(node, isRoot, path, parentCtx, options, dedupResult, usedComponents, depth = 0) {
	const { hasChildren, isRow, sortedChildren, spacingAnalysis } = getVueChildrenMeta(node);
	const tagInfo = options.semanticTags ? inferTag(node) : { tag: "div" };
	const baseClasses = buildClassNames(node, options.classMode, false);
	if (tagInfo.extraClass) baseClasses.push(tagInfo.extraClass);
	const nodeId = node.id || `node-${path}`;
	if (dedupResult) baseClasses.unshift(...dedupResult.nodeClassMap.get(nodeId) || []);
	else if (collectStyleParts(node, isRoot, spacingAnalysis, parentCtx).length > 0) baseClasses.unshift(`n-${sanitizeClassName(nodeId)}`);
	const resolvedComponent = options.componentAware ? resolveVueComponent(node, options.componentRegistry) : void 0;
	if (resolvedComponent && usedComponents) usedComponents.set(resolvedComponent.importKey, resolvedComponent);
	const componentBindings = resolvedComponent ? stringifyVueBindings(buildVueComponentBindings(node, resolvedComponent)) : "";
	const extraAttrs = [];
	if (componentBindings) extraAttrs.push(componentBindings);
	if (!resolvedComponent && tagInfo.role) extraAttrs.push(`role="${tagInfo.role}"`);
	if (!resolvedComponent && tagInfo.tag === "img") {
		extraAttrs.push(`src="assets/${node.id.replace(/:/g, "_")}.svg"`);
		extraAttrs.push(`alt="${escapeHtml$1(node.name || "")}"`);
	}
	const tag = resolvedComponent?.tagName || tagInfo.tag;
	const attrs = buildVueAttrString(node, baseClasses, options.includeNodeId, options.includeNodeName, extraAttrs);
	const indent = "  ".repeat(depth);
	const textContent = node.characters ? escapeHtml$1(node.characters) : "";
	const slotContent = resolvedComponent ? getVueComponentSlotContent(node, resolvedComponent) : void 0;
	if (resolvedComponent) {
		if (slotContent) return `${indent}<${tag}${attrs}>${slotContent}</${tag}>`;
		return `${indent}<${tag}${attrs} />`;
	}
	if (isSelfClosingTag(tag)) return `${indent}<${tag}${attrs} />`;
	if (!hasChildren) return `${indent}<${tag}${attrs}>${textContent}</${tag}>`;
	const childCtxBase = {
		parent: node,
		useGap: spacingAnalysis?.useGap ?? false,
		gap: spacingAnalysis?.gap ?? 0,
		padding: {
			top: spacingAnalysis?.padding?.top ?? 0,
			right: spacingAnalysis?.padding?.right ?? 0,
			bottom: spacingAnalysis?.padding?.bottom ?? 0,
			left: spacingAnalysis?.padding?.left ?? 0
		},
		isRow,
		alignItems: node.layout?.alignItems
	};
	return `${indent}<${tag}${attrs}>\n${sortedChildren.map((child, index) => {
		const prev = index > 0 ? sortedChildren[index - 1] : null;
		return renderVueNode(child, false, `${path}-${index}`, {
			...childCtxBase,
			prevSibling: prev
		}, options, dedupResult, usedComponents, depth + 1);
	}).join("\n")}\n${indent}</${tag}>`;
}
function renderVue(tree, options = {}) {
	if (!tree) return "";
	const { classMode = "tailwind", enableDedup = true, semanticTags = true, includeNodeId = false, includeNodeName = false, rootClassName, scoped = true, componentAware = false, componentRegistry } = options;
	const cleanedTree = removeRedundantNesting(tree);
	const renderOptions = {
		classMode,
		semanticTags,
		includeNodeId,
		includeNodeName,
		componentAware,
		componentRegistry
	};
	let css = "";
	let template = "";
	const usedComponents = /* @__PURE__ */ new Map();
	if (enableDedup) {
		const entries = [];
		collectVueStyles(cleanedTree, true, "0", void 0, entries);
		const dedupResult = deduplicateStyles(entries);
		template = renderVueNode(cleanedTree, true, "0", void 0, renderOptions, dedupResult, usedComponents, 1);
		css = [generateSharedCss(dedupResult.sharedClasses), generateUniqueCss(dedupResult.uniqueStyles, dedupResult.nodeClassMap)].filter(Boolean).join("\n\n");
	} else {
		template = renderVueNode(cleanedTree, true, "0", void 0, renderOptions, void 0, usedComponents, 1);
		const entries = [];
		collectVueStyles(cleanedTree, true, "0", void 0, entries);
		css = generateUniqueCss(new Map(entries.map((entry) => [entry.nodeId, entry.styles])), new Map(entries.map((entry) => [entry.nodeId, [entry.nodeClass]])));
	}
	const styleBlock = [COMPONENT_BASE_STYLES, css].filter(Boolean).join("\n\n");
	const templateBlock = `<div class="${mergeClassNames("layout-root", rootClassName)}">\n${template}\n</div>`;
	const scopedAttr = scoped ? " scoped" : "";
	const scriptImports = buildVueImportStatements(usedComponents.values());
	return `${scriptImports ? `<script setup>\n${indentBlock(scriptImports)}\n<\/script>\n\n` : ""}<template>\n${indentBlock(templateBlock)}\n</template>\n\n<style${scopedAttr}>\n${indentBlock(styleBlock)}\n</style>`;
}
function emptyRemovedByReason() {
	return {
		hidden: 0,
		transparent: 0,
		zeroSize: 0,
		negativeCoords: 0,
		hueBlendMode: 0,
		overflow: 0,
		occluded: 0,
		emptyText: 0,
		emptyGroup: 0
	};
}
function syncRemovedByReason(stats) {
	stats.removedByReason = {
		hidden: stats.removedHidden,
		transparent: stats.removedTransparent,
		zeroSize: stats.removedZeroSize,
		negativeCoords: stats.removedNegativeCoords,
		hueBlendMode: stats.removedHueBlendMode,
		overflow: stats.removedOverflow,
		occluded: stats.removedOccluded,
		emptyText: stats.removedEmptyText,
		emptyGroup: stats.removedEmptyGroup
	};
}
function preprocess(rootNode, options = {}) {
	if (!rootNode) return {
		data: null,
		stats: {
			totalNodes: 0,
			removedHidden: 0,
			removedTransparent: 0,
			removedZeroSize: 0,
			removedNegativeCoords: 0,
			removedHueBlendMode: 0,
			removedOverflow: 0,
			removedOccluded: 0,
			removedEmptyText: 0,
			removedEmptyGroup: 0,
			remainingNodes: 0,
			removedByReason: emptyRemovedByReason()
		}
	};
	const opts = {
		removeHidden: options.removeHidden ?? true,
		removeTransparent: options.removeTransparent ?? true,
		removeZeroSize: options.removeZeroSize ?? true,
		removeNegativeCoords: options.removeNegativeCoords ?? true,
		removeHueBlendMode: options.removeHueBlendMode ?? true,
		removeOverflow: options.removeOverflow ?? true,
		removeOccluded: options.removeOccluded ?? true,
		removeEmptyText: options.removeEmptyText ?? false,
		removeEmptyGroup: options.removeEmptyGroup ?? false
	};
	const stats = {
		totalNodes: 0,
		removedHidden: 0,
		removedTransparent: 0,
		removedZeroSize: 0,
		removedNegativeCoords: 0,
		removedHueBlendMode: 0,
		removedOverflow: 0,
		removedOccluded: 0,
		removedEmptyText: 0,
		removedEmptyGroup: 0,
		remainingNodes: 0,
		removedByReason: emptyRemovedByReason()
	};
	const cleanedData = cleanNode(rootNode, opts, stats, getNodeBounds(rootNode));
	stats.remainingNodes = stats.totalNodes - stats.removedHidden - stats.removedTransparent - stats.removedZeroSize - stats.removedNegativeCoords - stats.removedHueBlendMode - stats.removedOverflow - stats.removedOccluded - stats.removedEmptyText - stats.removedEmptyGroup;
	syncRemovedByReason(stats);
	return {
		data: cleanedData,
		stats
	};
}
function cleanNode(node, options, stats, clipBounds) {
	if (!node) return null;
	stats.totalNodes++;
	if (options.removeHidden && node.visible === false) {
		stats.removedHidden++;
		return null;
	}
	if (options.removeTransparent && isFullyTransparent(node)) {
		stats.removedTransparent++;
		return null;
	}
	if (options.removeZeroSize && isZeroSize(node)) {
		stats.removedZeroSize++;
		return null;
	}
	if (options.removeNegativeCoords && isMostlyOutsideBounds(node, clipBounds)) {
		stats.removedNegativeCoords++;
		return null;
	}
	if (options.removeHueBlendMode && isHueBlendMode(node)) {
		stats.removedHueBlendMode++;
		return null;
	}
	if (options.removeOverflow && clipBounds && hasValidBounds(node)) {
		if (isCompletelyOutside(node, clipBounds)) {
			stats.removedOverflow++;
			return null;
		}
	}
	if (options.removeEmptyText && isEmptyText(node)) {
		stats.removedEmptyText++;
		return null;
	}
	if (node.children && Array.isArray(node.children)) {
		const childClip = computeChildClipBounds(node, clipBounds);
		let cleanedChildren = [];
		for (const child of node.children) {
			const cleanedChild = cleanNode(child, options, stats, childClip);
			if (cleanedChild !== null) cleanedChildren.push(cleanedChild);
		}
		if (options.removeOccluded && cleanedChildren.length > 1) cleanedChildren = removeOccludedSiblings(cleanedChildren, stats);
		if (options.removeEmptyGroup && cleanedChildren.length === 0 && isBareGroupContainer(node)) {
			stats.removedEmptyGroup++;
			return null;
		}
		return {
			...node,
			children: cleanedChildren
		};
	}
	return { ...node };
}
function isEmptyText(node) {
	if (node?.type !== "TEXT") return false;
	return (typeof node.characters === "string" ? node.characters : "").trim().length === 0;
}
function isBareGroupContainer(node) {
	if (!node) return false;
	if (!NON_VISUAL_TYPES.has(node.type)) return false;
	if (hasAnyVisibleFill(node)) return false;
	const strokes = node.strokes;
	if (Array.isArray(strokes) && strokes.some((s) => s.visible !== false)) return false;
	return true;
}
function getNodeBounds(node) {
	if (!hasValidBounds(node)) return null;
	return {
		x1: node.x,
		y1: node.y,
		x2: node.x + node.width,
		y2: node.y + node.height
	};
}
function hasValidBounds(node) {
	return typeof node.x === "number" && typeof node.y === "number" && typeof node.width === "number" && typeof node.height === "number" && node.width > 0 && node.height > 0;
}
function computeChildClipBounds(node, parentClip) {
	const nodeBounds = getNodeBounds(node);
	if (!nodeBounds && !parentClip) return null;
	if (!nodeBounds) return parentClip;
	if (!parentClip) return nodeBounds;
	return intersectBounds(parentClip, nodeBounds);
}
function intersectBounds(a, b) {
	return {
		x1: Math.max(a.x1, b.x1),
		y1: Math.max(a.y1, b.y1),
		x2: Math.min(a.x2, b.x2),
		y2: Math.min(a.y2, b.y2)
	};
}
function isCompletelyOutside(node, clip) {
	const nx1 = node.x;
	const ny1 = node.y;
	const nx2 = node.x + node.width;
	const ny2 = node.y + node.height;
	if (clip.x2 <= clip.x1 || clip.y2 <= clip.y1) return true;
	return nx2 <= clip.x1 || nx1 >= clip.x2 || ny2 <= clip.y1 || ny1 >= clip.y2;
}
var NON_VISUAL_TYPES = new Set(["GROUP", "SECTION"]);
function canVisuallyOcclude(node) {
	if (NON_VISUAL_TYPES.has(node.type)) return false;
	if (node.opacity === 0) return false;
	if (node.mask === true) return false;
	if (hasBackgroundBlur(node) && hasMinOpacityFill(node, .1)) return true;
	return hasOpaqueFill(node);
}
function hasBackgroundBlur(node) {
	const effects = node.effects;
	if (!Array.isArray(effects)) return false;
	return effects.some((e) => e.type === "BACKGROUND_BLUR" && e.visible !== false);
}
function hasAnyVisibleFill(node) {
	const fills = node.fills;
	if (!Array.isArray(fills) || fills.length === 0) return false;
	return fills.some((fill) => fill.visible !== false && OPAQUE_FILL_TYPES.has(fill.type));
}
function hasMinOpacityFill(node, threshold) {
	const fills = node.fills;
	if (!Array.isArray(fills) || fills.length === 0) return false;
	const nodeOpacity = node.opacity ?? 1;
	return fills.some((fill) => {
		if (fill.visible === false) return false;
		if (!OPAQUE_FILL_TYPES.has(fill.type)) return false;
		return (fill.opacity ?? 1) * nodeOpacity >= threshold;
	});
}
var OPAQUE_FILL_TYPES = new Set([
	"SOLID",
	"IMAGE",
	"GRADIENT_LINEAR",
	"GRADIENT_RADIAL",
	"GRADIENT_ANGULAR",
	"GRADIENT_DIAMOND"
]);
function hasOpaqueFill(node) {
	const fills = node.fills;
	if (!Array.isArray(fills) || fills.length === 0) return false;
	const OPACITY_THRESHOLD = .5;
	return fills.some((fill) => {
		if (fill.visible === false) return false;
		if (!OPAQUE_FILL_TYPES.has(fill.type)) return false;
		return (fill.opacity ?? 1) * (node.opacity ?? 1) > OPACITY_THRESHOLD;
	});
}
function removeOccludedSiblings(children, stats) {
	const result = [];
	for (let i = 0; i < children.length; i++) {
		const target = children[i];
		if (!hasValidBounds(target)) {
			result.push(target);
			continue;
		}
		let occluded = false;
		for (let j = 0; j < i; j++) {
			const cover = children[j];
			if (!hasValidBounds(cover)) continue;
			if (!canVisuallyOcclude(cover)) continue;
			if (isFullyCoveredBy(target, cover)) {
				occluded = true;
				break;
			}
		}
		if (occluded) stats.removedOccluded++;
		else result.push(target);
	}
	return result;
}
function isFullyCoveredBy(target, cover) {
	const e = 1;
	return cover.x <= target.x + e && cover.y <= target.y + e && cover.x + cover.width >= target.x + target.width - e && cover.y + cover.height >= target.y + target.height - e;
}
var NEAR_TRANSPARENT_THRESHOLD = .05;
function isFullyTransparent(node) {
	const nodeOpacity = node.opacity ?? 1;
	if (nodeOpacity === 0) return true;
	if ([
		"RECTANGLE",
		"ELLIPSE",
		"LINE",
		"VECTOR",
		"STAR",
		"POLYGON"
	].includes(node.type)) {
		if (!node.fills || node.fills.length === 0) {
			if (!node.strokes || node.strokes.length === 0) return false;
		}
		if (node.fills && Array.isArray(node.fills)) {
			const allFillsTransparent = node.fills.every((fill) => {
				if (fill.visible === false) return true;
				if (fill.opacity === 0) return true;
				if ((fill.opacity ?? 1) * nodeOpacity < NEAR_TRANSPARENT_THRESHOLD) return true;
				return false;
			});
			const strokeThreshold = allFillsTransparent ? .2 : NEAR_TRANSPARENT_THRESHOLD;
			const strokeWeight = node.strokeWeight ?? 0;
			if (allFillsTransparent && (!node.strokes || node.strokes.length === 0 || strokeWeight === 0 || node.strokes.every((s) => s.visible === false || (s.opacity ?? 1) * nodeOpacity < strokeThreshold))) return true;
		}
	}
	return false;
}
function isZeroSize(node) {
	if (node.width !== void 0 && node.height !== void 0) {
		if (node.width < .1 || node.height < .1) return true;
	}
	return false;
}
var VISIBLE_RATIO_THRESHOLD = .15;
function isMostlyOutsideBounds(node, clipBounds) {
	if (!hasValidBounds(node)) return false;
	if (!clipBounds) return node.x < -5 || node.y < -5;
	if (clipBounds.x2 <= clipBounds.x1 || clipBounds.y2 <= clipBounds.y1) return true;
	const nodeArea = node.width * node.height;
	if (nodeArea <= 0) return false;
	return Math.max(0, Math.min(node.x + node.width, clipBounds.x2) - Math.max(node.x, clipBounds.x1)) * Math.max(0, Math.min(node.y + node.height, clipBounds.y2) - Math.max(node.y, clipBounds.y1)) / nodeArea < VISIBLE_RATIO_THRESHOLD;
}
function isHueBlendMode(node) {
	return node.blendMode === "HUE";
}
function clipRawMaskBounds(node) {
	if (!node.children || !Array.isArray(node.children)) return;
	const maskChild = node.children.find((c) => c.mask === true);
	if (maskChild && node.children.length >= 2) {
		const mx = maskChild.x, my = maskChild.y;
		const mw = maskChild.width, mh = maskChild.height;
		if (mw && mh) {
			const maskR = mx + mw, maskB = my + mh;
			for (const child of node.children) {
				if (child.mask) continue;
				const cr = child.x + child.width, cb = child.y + child.height;
				if (!(child.x < mx - 1 || cr > maskR + 1 || child.y < my - 1 || cb > maskB + 1)) continue;
				const ix = Math.max(child.x, mx);
				const iy = Math.max(child.y, my);
				const iw = Math.min(cr, maskR) - ix;
				const ih = Math.min(cb, maskB) - iy;
				if (iw > 0 && ih > 0) {
					child.x = ix;
					child.y = iy;
					child.width = iw;
					child.height = ih;
				}
			}
		}
	}
	for (const child of node.children) clipRawMaskBounds(child);
}
function patchGradientFills(fills, gradient) {
	if (!fills || !gradient || !gradient.gradientcolor) return fills;
	return fills.map((fill) => {
		if (!((fill.type === "GRADIENT_LINEAR" || fill.type === "GRADIENT_RADIAL") && (!fill.gradientStops || fill.gradientStops.length === 0))) return fill;
		const colors = gradient.gradientcolor;
		const positions = gradient.gradientposition || [];
		const gradientStops = colors.map((hex, i) => {
			return {
				position: positions[i] ? parseFloat(positions[i]) / 100 : i / (colors.length - 1 || 1),
				color: {
					r: parseInt(hex.slice(1, 3), 16) / 255,
					g: parseInt(hex.slice(3, 5), 16) / 255,
					b: parseInt(hex.slice(5, 7), 16) / 255,
					a: hex.length >= 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1
				}
			};
		});
		return {
			...fill,
			gradientStops
		};
	});
}
function roundNum(val) {
	if (typeof val === "number" && !isNaN(val)) return Math.round(val);
}
var SYMBOL_FONT_FAMILIES = new Set([
	"HM Symbol",
	"HarmonyOS Sans Symbols",
	"HarmonyOS Symbol",
	"Material Icons",
	"Material Icons Outlined",
	"Material Icons Round",
	"Material Icons Sharp",
	"Material Symbols Outlined",
	"Material Symbols Rounded",
	"Material Symbols Sharp",
	"Font Awesome",
	"Font Awesome 5 Free",
	"Font Awesome 5 Pro",
	"Font Awesome 5 Brands",
	"Font Awesome 6 Free",
	"Font Awesome 6 Pro",
	"Font Awesome 6 Brands",
	"FontAwesome",
	"iconfont",
	"anticon"
]);
function isAllWhitespaceOrPuaCodepoint(cp) {
	if (cp === 9 || cp === 10 || cp === 13 || cp === 32) return {
		pua: false,
		whitespace: true
	};
	return {
		pua: cp >= 57344 && cp <= 63743 || cp >= 983040 && cp <= 1048573 || cp >= 1048576 && cp <= 1114109,
		whitespace: false
	};
}
function isSymbolFontText(node) {
	if (node?.type !== "TEXT") return false;
	const chars = typeof node.characters === "string" ? node.characters : "";
	if (!chars) return false;
	let hasPua = false;
	for (const ch of chars) {
		const { pua, whitespace } = isAllWhitespaceOrPuaCodepoint(ch.codePointAt(0));
		if (whitespace) continue;
		if (!pua) return false;
		hasPua = true;
	}
	if (!hasPua) return false;
	const family = node?.fontName?.family;
	if (typeof family === "string" && SYMBOL_FONT_FAMILIES.has(family)) return true;
	return true;
}
function getTextBaselineSize(node) {
	if (node?.type !== "TEXT") return void 0;
	const baselines = node?.textData?.baselines;
	if (!Array.isArray(baselines) || baselines.length === 0) return void 0;
	if (baselines.length > 1) return void 0;
	const width = baselines[0]?.width;
	if (typeof width !== "number" || isNaN(width) || width <= 0) return void 0;
	const offsetX = baselines[0]?.position?.x;
	return {
		width: Math.round(width),
		offsetX: typeof offsetX === "number" && !isNaN(offsetX) ? Math.round(offsetX) : 0
	};
}
function normalize(cleanedData, _options = {}) {
	const nodeMap = /* @__PURE__ */ new Map();
	if (!cleanedData) return {
		root: null,
		nodeMap
	};
	return {
		root: normalizeNode(cleanedData, nodeMap, 0, { value: countNodes$1(cleanedData) - 1 }),
		nodeMap
	};
}
function countNodes$1(node) {
	if (!node) return 0;
	let count = 1;
	if (node.children && Array.isArray(node.children)) for (const child of node.children) count += countNodes$1(child);
	return count;
}
function normalizeNode(node, nodeMap, depth, counter) {
	const id = node.id || `node-auto-${counter.value}-d${depth}`;
	const { children: _ignore, ...originalProps } = node;
	nodeMap.set(id, originalProps);
	const isIconText = isSymbolFontText(node);
	const baselineSize = isIconText ? void 0 : getTextBaselineSize(node);
	const rawX = roundNum(node.x) ?? 0;
	const width = baselineSize?.width ?? roundNum(node.width) ?? 0;
	const height = roundNum(node.height);
	const x = baselineSize ? rawX + baselineSize.offsetX : rawX;
	const layoutNode = {
		id,
		isPageRoot: node.isPageRoot,
		type: isIconText ? "ICON" : node.type,
		x,
		y: roundNum(node.y) ?? 0,
		name: node.name,
		width,
		visible: node.visible,
		height: height ?? 0,
		fontName: node.fontName,
		fontSize: roundNum(node.fontSize),
		lineHeight: roundNum(node.lineHeight),
		characters: node.characters,
		dashPattern: node.dashPattern,
		itemSpacing: roundNum(node.itemSpacing),
		rotation: node.rotation,
		effects: node.effects,
		pluginData: node.pluginData,
		fills: patchGradientFills(node.fills, node.gradient),
		strokes: node.strokes,
		cornerRadius: roundNum(node.cornerRadius),
		borderRadius: roundNum(node.borderRadius),
		strokeWeight: roundNum(node.strokeWeight),
		strokeTopWeight: roundNum(node.strokeTopWeight),
		strokeBottomWeight: roundNum(node.strokeBottomWeight),
		strokeLeftWeight: roundNum(node.strokeLeftWeight),
		strokeRightWeight: roundNum(node.strokeRightWeight),
		primaryAxisAlignItems: node.primaryAxisAlignItems,
		counterAxisAlignItems: node.counterAxisAlignItems,
		componentName: node.componentName,
		nodeType: node.nodeType,
		originalLayoutMode: node.originalLayoutMode,
		style: node.style,
		componentInfo: node.componentInfo,
		area: (width || 0) * (height || 0),
		mask: node.mask,
		frameMaskDisabled: node.frameMaskDisabled,
		textData: node.textData || {},
		blendMode: node.blendMode,
		className: node.className,
		transform: node.transform,
		transformOrigin: node.transformOrigin,
		staticInfo: node.staticInfo,
		blobPath: node.blobPath,
		imgUrl: node.imgUrl,
		opacity: node.opacity,
		classSelf: node.classSelf,
		classPrefix: node.classPrefix,
		bgSourceNodeId: node.bgSourceNodeId,
		styleData: node.styleData,
		depth,
		zIndex: 0,
		renderOrder: counter.value--,
		children: []
	};
	if (isIconText) layoutNode.shouldBeImage = true;
	else if (node.shouldBeImage === true) layoutNode.shouldBeImage = true;
	if (node.imageRole === "background" || node.imageRole === "content") layoutNode.imageRole = node.imageRole;
	if (node.imageSource === "vector" || node.imageSource === "composite") layoutNode.imageSource = node.imageSource;
	if (node.backgroundLayer && typeof node.backgroundLayer === "object") layoutNode.backgroundLayer = node.backgroundLayer;
	if (node.children && Array.isArray(node.children)) {
		const childCount = node.children.length;
		layoutNode.children = node.children.map((child, index) => {
			const childNode = normalizeNode(child, nodeMap, depth + 1, counter);
			childNode.zIndex = childCount - 1 - index;
			return childNode;
		});
	}
	return layoutNode;
}
function applyRules(nodes, rules) {
	for (const rule of rules) rule.apply(nodes);
}
const sortChildrenRule = {
	name: "sortChildren",
	apply(nodes) {
		sortChildrenSpatial(nodes);
	}
};
function isSameRow(a, b) {
	const minHeight = Math.min(a.height, b.height);
	const tolerance = Math.max(minHeight * .3, 2);
	if (Math.abs(a.y - b.y) >= tolerance) return false;
	return minHeight / Math.max(a.height, b.height) > .5;
}
function sortChildrenSpatial(nodes) {
	nodes.forEach((node) => {
		if (node.children && node.children.length > 0) {
			node.children.sort((a, b) => {
				if (isSameRow(a, b)) {
					if (a.x !== b.x) return a.x - b.x;
					const zDiff = (a.zIndex ?? 0) - (b.zIndex ?? 0);
					if (zDiff !== 0) return zDiff;
					return a.id.localeCompare(b.id);
				}
				return a.y - b.y;
			});
			sortChildrenSpatial(node.children);
		}
	});
}
function isSameGeometry$2(a, b) {
	const e = 1;
	return Math.abs(a.x - b.x) < e && Math.abs(a.y - b.y) < e && Math.abs(a.width - b.width) < e && Math.abs(a.height - b.height) < e;
}
function isContainedBy(child, parent) {
	const e = 1;
	if (child.x >= parent.x - e && child.y >= parent.y - e && child.x + child.width <= parent.x + parent.width + e && child.y + child.height <= parent.y + parent.height + e) {
		if (child.area / (parent.area || 1) > .95) {
			const containerTypes = [
				"FRAME",
				"GROUP",
				"COMPONENT",
				"INSTANCE",
				"SECTION"
			];
			const isParentContainer = containerTypes.includes(parent.type);
			const isChildContainer = containerTypes.includes(child.type);
			if (!isParentContainer && isChildContainer) return false;
			if (parent.depth >= child.depth) return false;
			if (parent.zIndex >= child.zIndex) return false;
		}
		return true;
	}
	const childCx = child.x + child.width / 2;
	const childCy = child.y + child.height / 2;
	if (childCx >= parent.x && childCx <= parent.x + parent.width && childCy >= parent.y && childCy <= parent.y + parent.height) {
		if (child.area / (parent.area || 1) < .7) return true;
	}
	return false;
}
var OWN_BACKGROUND_OPACITY_THRESHOLD = .01;
function hasOwnBackground(node) {
	if (node.styles?.background) return true;
	const nodeOpacity = typeof node.opacity === "number" ? node.opacity : 1;
	if (Array.isArray(node.fills) && node.fills.some((fill) => {
		if (!fill || typeof fill !== "object") return false;
		if (fill.visible === false) return false;
		return (fill.opacity ?? 1) * nodeOpacity > OWN_BACKGROUND_OPACITY_THRESHOLD;
	})) return true;
	const rawStyle = node.style;
	if (!rawStyle || typeof rawStyle !== "object") return false;
	const rawBackground = rawStyle["background-color"] ?? rawStyle.backgroundColor ?? rawStyle.background;
	return typeof rawBackground === "string" && rawBackground.trim().length > 0;
}
function foldNodeOpacityIntoFills(node) {
	if (!Array.isArray(node.fills)) return node.fills;
	const nodeOpacity = typeof node.opacity === "number" ? node.opacity : 1;
	if (nodeOpacity >= 1) return node.fills;
	return node.fills.map((fill) => {
		if (!fill || typeof fill !== "object") return fill;
		const fillOpacity = typeof fill.opacity === "number" ? fill.opacity : 1;
		return {
			...fill,
			opacity: fillOpacity * nodeOpacity
		};
	});
}
function normalizeRgbChannels(r, g, b, aHint) {
	const rs = Number.isFinite(r) ? r : 0;
	const gs = Number.isFinite(g) ? g : 0;
	const bs = Number.isFinite(b) ? b : 0;
	const scale = rs > 1 || gs > 1 || bs > 1 || Number.isFinite(aHint) && aHint > 1 && Number.isInteger(rs) && Number.isInteger(gs) && Number.isInteger(bs) && rs <= 1 && gs <= 1 && bs <= 1 ? 1 : 255;
	const clamp = (n) => Math.max(0, Math.min(255, Math.round(n * scale)));
	return [
		clamp(rs),
		clamp(gs),
		clamp(bs)
	];
}
function normalizeAlpha(a, fallback = 1) {
	if (!Number.isFinite(a)) return fallback;
	const v = a;
	const out = v > 1 ? v / 255 : v;
	return Math.max(0, Math.min(1, out));
}
function figmaColorToRgba(color, opacity = 1) {
	const [r, g, b] = normalizeRgbChannels(color?.r, color?.g, color?.b, color?.a);
	const a = normalizeAlpha(opacity, 1);
	if (a >= 1) return `rgb(${r}, ${g}, ${b})`;
	return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}
function parseColorString(colorStr) {
	if (!colorStr) return "";
	if (colorStr.startsWith("rgb") || colorStr.startsWith("hsl")) return colorStr;
	if (colorStr.startsWith("#") && colorStr.length === 9) {
		const r = parseInt(colorStr.slice(1, 3), 16);
		const g = parseInt(colorStr.slice(3, 5), 16);
		const b = parseInt(colorStr.slice(5, 7), 16);
		const a = parseInt(colorStr.slice(7, 9), 16) / 255;
		if (a === 1) return `rgb(${r}, ${g}, ${b})`;
		return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
	}
	return colorStr;
}
var OPAQUE_THRESHOLD = .95;
var GEOMETRY_TOLERANCE = 1;
function coveringSiblingHidesMask(mask, candidate) {
	if (candidate === mask) return false;
	if (candidate.visible === false) return false;
	if (candidate.mask === true) return false;
	if ((candidate.zIndex ?? 0) <= (mask.zIndex ?? 0)) return false;
	return findOpaqueCoveringShape(candidate, mask, 1) !== null;
}
function isClippingMaskHiddenBySiblings(mask, siblings) {
	if (!Array.isArray(siblings) || siblings.length < 2) return false;
	for (const sibling of siblings) if (coveringSiblingHidesMask(mask, sibling)) return true;
	return false;
}
function findOpaqueCoveringShape(node, mask, effectiveOpacity) {
	const combined = effectiveOpacity * normalizeAlpha(node.opacity, 1);
	if (combined < OPAQUE_THRESHOLD) return null;
	if (node.visible !== false && node.mask !== true && hasOpaqueCoveringFill(node, mask, combined)) return node;
	if (Array.isArray(node.children)) for (const child of node.children) {
		if (child.visible === false) continue;
		if (child.mask === true) continue;
		const found = findOpaqueCoveringShape(child, mask, combined);
		if (found) return found;
	}
	return null;
}
function hasOpaqueCoveringFill(node, mask, effectiveOpacity) {
	const fills = node.fills;
	if (!Array.isArray(fills) || fills.length === 0) return false;
	if (!fills.some((f) => {
		if (!f || f.visible === false) return false;
		const type = String(f.type ?? "");
		if (type !== "SOLID" && type !== "IMAGE" && !type.startsWith("GRADIENT")) return false;
		if (effectiveOpacity * normalizeAlpha(f.opacity, 1) < OPAQUE_THRESHOLD) return false;
		if (type === "SOLID" && f.color && typeof f.color.a === "number") {
			if (normalizeAlpha(f.color.a, 1) < OPAQUE_THRESHOLD) return false;
		}
		return true;
	})) return false;
	return geometricallyCovers(node, mask);
}
function demoteMaskIfCarriesVisuals(node) {
	if (!node || node.mask !== true) return;
	const bg = node.styles?.background;
	if (typeof bg === "string" && bg.includes("url(")) {
		node.mask = false;
		return;
	}
	if (node.shouldBeImage === true) {
		node.mask = false;
		return;
	}
	if (node.imageRole === "content" || node.imageRole === "background") {
		node.mask = false;
		return;
	}
	const fills = node.fills;
	if (Array.isArray(fills)) {
		if (fills.some((f) => {
			if (!f || f.visible === false) return false;
			return String(f.type ?? "") === "IMAGE";
		})) node.mask = false;
	}
}
function geometricallyCovers(cover, target) {
	const cx = cover.x ?? 0;
	const cy = cover.y ?? 0;
	const cx2 = cx + (cover.width ?? 0);
	const cy2 = cy + (cover.height ?? 0);
	const tx = target.x ?? 0;
	const ty = target.y ?? 0;
	const tx2 = tx + (target.width ?? 0);
	const ty2 = ty + (target.height ?? 0);
	const t = GEOMETRY_TOLERANCE;
	return cx <= tx + t && cy <= ty + t && cx2 >= tx2 - t && cy2 >= ty2 - t;
}
function isContainer(node) {
	return [
		"FRAME",
		"GROUP",
		"COMPONENT",
		"INSTANCE",
		"SECTION"
	].includes(node.type);
}
var IMAGE_PLACEHOLDER_SVG = `url("${IMG_PLACEHOLDER}")`;
function convertSingleFill(fill, nodeId, imagePlaceholder) {
	if (fill.visible === false) return null;
	const opacity = fill.opacity ?? 1;
	if (opacity < .01) return null;
	switch (fill.type) {
		case "SOLID":
			if (!fill.color) return null;
			return figmaColorToRgba(fill.color, opacity);
		case "GRADIENT_LINEAR": return convertLinearGradient(fill, opacity);
		case "GRADIENT_RADIAL": return convertRadialGradient(fill, opacity);
		case "IMAGE": {
			const ref = fill.imageRef;
			const hasRealRef = !imagePlaceholder && ref && !ref.startsWith("$") && !ref.startsWith("data:");
			const bgUrl = hasRealRef ? `url("${ref}")` : imagePlaceholder || !nodeId ? IMAGE_PLACEHOLDER_SVG : `url(assets/${nodeId.replace(/:/g, "_")}.svg)`;
			const bg = hasRealRef ? `${bgUrl} no-repeat center/cover, ${IMAGE_PLACEHOLDER_SVG} no-repeat center/cover` : `${bgUrl} no-repeat center/cover`;
			if (opacity < 1) return `linear-gradient(rgba(255,255,255,${1 - opacity}), rgba(255,255,255,${1 - opacity})), ${bg}`;
			return bg;
		}
		default: return null;
	}
}
function convertLinearGradient(fill, opacity) {
	if (!fill.gradientStops || fill.gradientStops.length === 0) {
		if (fill.color) return figmaColorToRgba(fill.color, opacity);
		return "linear-gradient(180deg, #f1f5f9, #e2e8f0)";
	}
	return `linear-gradient(${fill.gradientTransform ? calculateGradientAngle(fill.gradientTransform) : 180}deg, ${fill.gradientStops.map((stop) => {
		return `${figmaColorToRgba(stop.color, opacity)} ${Math.round(stop.position * 100)}%`;
	}).join(", ")})`;
}
function convertRadialGradient(fill, opacity) {
	if (!fill.gradientStops || fill.gradientStops.length === 0) {
		if (fill.color) return figmaColorToRgba(fill.color, opacity);
		return "radial-gradient(circle, #f1f5f9, #e2e8f0)";
	}
	return `radial-gradient(ellipse at center, ${fill.gradientStops.map((stop) => {
		return `${figmaColorToRgba(stop.color, opacity)} ${Math.round(stop.position * 100)}%`;
	}).join(", ")})`;
}
function calculateGradientAngle(transform) {
	if (!transform || transform.length < 2) return 180;
	const a = transform[0]?.[0] ?? 1;
	const b = transform[1]?.[0] ?? 0;
	const angleDeg = Math.atan2(b, a) * 180 / Math.PI;
	return Math.round(90 - angleDeg);
}
function convertFills(fills, nodeId, imagePlaceholder) {
	if (!fills || fills.length === 0) return void 0;
	const visibleFills = fills.filter((f) => f.visible !== false);
	if (visibleFills.length === 0) return void 0;
	if (visibleFills.length === 1) return convertSingleFill(visibleFills[0], nodeId, imagePlaceholder) ?? void 0;
	const backgrounds = visibleFills.map((f) => {
		const bg = convertSingleFill(f, nodeId, imagePlaceholder);
		if (!bg) return null;
		if (bg.startsWith("rgb") && !bg.includes("gradient")) return `linear-gradient(${bg}, ${bg})`;
		return bg;
	}).filter((bg) => bg !== null);
	if (backgrounds.length === 0) return void 0;
	return backgrounds.join(", ");
}
function convertCornerRadius(info) {
	if (typeof info.cornerRadius === "number" && info.cornerRadius > 0) return `${Math.round(info.cornerRadius)}px`;
	const tl = Math.round(info.topLeftRadius ?? info.borderRadius?.topLeft ?? 0);
	const tr = Math.round(info.topRightRadius ?? info.borderRadius?.topRight ?? 0);
	const br = Math.round(info.bottomRightRadius ?? info.borderRadius?.bottomRight ?? 0);
	const bl = Math.round(info.bottomLeftRadius ?? info.borderRadius?.bottomLeft ?? 0);
	if (tl === 0 && tr === 0 && br === 0 && bl === 0) return;
	if (tl === tr && tr === br && br === bl) return `${tl}px`;
	return `${tl}px ${tr}px ${br}px ${bl}px`;
}
function convertShadowColor$1(color) {
	if (!color) return "rgba(0, 0, 0, 0.25)";
	return figmaColorToRgba(color, normalizeAlpha(color.a, 1));
}
function convertSingleEffect(effect) {
	if (effect.visible === false) return null;
	switch (effect.type) {
		case "DROP_SHADOW": return {
			type: "shadow",
			value: `${Math.round(effect.offset?.x ?? 0)}px ${Math.round(effect.offset?.y ?? 0)}px ${Math.round(effect.radius ?? 0)}px ${Math.round(effect.spread ?? 0)}px ${convertShadowColor$1(effect.color)}`
		};
		case "INNER_SHADOW": return {
			type: "shadow",
			value: `inset ${Math.round(effect.offset?.x ?? 0)}px ${Math.round(effect.offset?.y ?? 0)}px ${Math.round(effect.radius ?? 0)}px ${Math.round(effect.spread ?? 0)}px ${convertShadowColor$1(effect.color)}`
		};
		case "LAYER_BLUR": return {
			type: "filter",
			value: `blur(${Math.round(effect.radius ?? 0)}px)`
		};
		case "BACKGROUND_BLUR": return {
			type: "filter",
			value: `backdrop-blur(${Math.round(effect.radius ?? 0)}px)`
		};
		default: return null;
	}
}
function convertEffects(effects) {
	if (!effects || effects.length === 0) return void 0;
	const shadows = [];
	const filters = [];
	const backdropFilters = [];
	for (const effect of effects) {
		const result = convertSingleEffect(effect);
		if (!result) continue;
		if (result.type === "shadow") shadows.push(result.value);
		else if (result.value.startsWith("backdrop-blur")) backdropFilters.push(result.value.replace("backdrop-", ""));
		else filters.push(result.value);
	}
	const output = {};
	if (shadows.length > 0) output.boxShadow = shadows.join(", ");
	if (filters.length > 0) output.filter = filters.join(" ");
	if (backdropFilters.length > 0) output.backdropFilter = backdropFilters.join(" ");
	return Object.keys(output).length > 0 ? output : void 0;
}
function convertStrokes(strokes, strokeInfo) {
	if (!strokes || strokes.length === 0) return void 0;
	const stroke = strokes.find((s) => s.visible !== false);
	if (!stroke) return void 0;
	const weight = Math.round(strokeInfo.weight ?? 1);
	if (weight <= 0) return void 0;
	let color = "currentColor";
	if (stroke.type === "SOLID" && stroke.color) {
		const opacity = stroke.opacity ?? 1;
		color = figmaColorToRgba(stroke.color, opacity);
	}
	return `${weight}px solid ${color}`;
}
function hasIndependentBorders(strokeInfo) {
	const { topWeight, bottomWeight, leftWeight, rightWeight } = strokeInfo;
	if (topWeight === void 0 && bottomWeight === void 0 && leftWeight === void 0 && rightWeight === void 0) return false;
	const weights = [
		topWeight,
		bottomWeight,
		leftWeight,
		rightWeight
	].filter((w) => w !== void 0);
	if (weights.length === 0) return false;
	const firstWeight = weights[0];
	return !weights.every((w) => w === firstWeight);
}
function convertIndependentBorders(strokes, strokeInfo) {
	if (!strokes || strokes.length === 0) return void 0;
	const stroke = strokes.find((s) => s.visible !== false);
	if (!stroke) return void 0;
	let color = "currentColor";
	if (stroke.type === "SOLID" && stroke.color) {
		const opacity = stroke.opacity ?? 1;
		color = figmaColorToRgba(stroke.color, opacity);
	}
	const result = {};
	const { topWeight, bottomWeight, leftWeight, rightWeight } = strokeInfo;
	if (topWeight && topWeight > 0) result.borderTop = `${Math.round(topWeight)}px solid ${color}`;
	if (bottomWeight && bottomWeight > 0) result.borderBottom = `${Math.round(bottomWeight)}px solid ${color}`;
	if (leftWeight && leftWeight > 0) result.borderLeft = `${Math.round(leftWeight)}px solid ${color}`;
	if (rightWeight && rightWeight > 0) result.borderRight = `${Math.round(rightWeight)}px solid ${color}`;
	return Object.keys(result).length > 0 ? result : void 0;
}
const mergeSiblingsRule = {
	name: "mergeSiblings",
	apply(nodes) {
		mergeOverlappingSiblings(nodes);
	}
};
function mergeOverlappingSiblings(nodes) {
	if (!nodes || nodes.length === 0) return;
	nodes.forEach((node) => {
		if (node.children && node.children.length > 0) mergeOverlappingSiblings(node.children);
	});
	if (nodes.length < 2) return;
	const toRemove = /* @__PURE__ */ new Set();
	for (let i = 0; i < nodes.length; i++) {
		if (toRemove.has(nodes[i].id)) continue;
		for (let j = 0; j < nodes.length; j++) {
			if (i === j) continue;
			if (toRemove.has(nodes[j].id)) continue;
			const nodeA = nodes[i];
			const nodeB = nodes[j];
			if (isSameGeometry$2(nodeA, nodeB)) {
				const containerA = isContainer(nodeA);
				const containerB = isContainer(nodeB);
				let container = null;
				let background = null;
				if (containerA && !containerB) {
					container = nodeA;
					background = nodeB;
				} else if (!containerA && containerB) {
					container = nodeB;
					background = nodeA;
				} else if (containerA && containerB) {
					const hasChildrenA = nodeA.children && nodeA.children.length > 0;
					const hasChildrenB = nodeB.children && nodeB.children.length > 0;
					if (hasChildrenA && !hasChildrenB) {
						container = nodeA;
						background = nodeB;
					} else if (!hasChildrenA && hasChildrenB) {
						container = nodeB;
						background = nodeA;
					} else if (hasChildrenA && hasChildrenB) {
						const isPureBgA = nodeA.type === "GROUP" && isPureBackgroundGroup$1(nodeA);
						const isPureBgB = nodeB.type === "GROUP" && isPureBackgroundGroup$1(nodeB);
						if (isPureBgB && !isPureBgA) {
							container = nodeA;
							background = nodeB;
						} else if (isPureBgA && !isPureBgB) {
							container = nodeB;
							background = nodeA;
						}
					}
				}
				if (container && background) {
					if (!isMergeableBackground(background)) continue;
					mergeBackgroundStyles$1(container, background);
					container.mergedLayerId = background.id;
					container.mergedLayerType = background.type;
					demoteMaskIfCarriesVisuals(container);
					toRemove.add(background.id);
				}
			}
		}
	}
	if (toRemove.size > 0) {
		const remaining = nodes.filter((n) => !toRemove.has(n.id));
		nodes.length = 0;
		nodes.push(...remaining);
	}
	wrapContainedBackgrounds(nodes);
}
function wrapContainedBackgrounds(nodes) {
	if (!nodes || nodes.length < 2) return;
	const toRemove = /* @__PURE__ */ new Set();
	for (const background of nodes) {
		if (toRemove.has(background.id)) continue;
		if (!isMergeableBackground(background)) continue;
		if (background.mask === true) continue;
		if (background.children && background.children.length > 0) continue;
		if (!hasVisualBackground(background)) continue;
		if (hasImageFill$3(background)) continue;
		const contained = nodes.filter((node) => node.id !== background.id && !toRemove.has(node.id) && isContainedBy(node, background));
		if (contained.length === 0) continue;
		const hasAbove = contained.some((node) => (node.zIndex ?? 0) > (background.zIndex ?? 0));
		const hasContainerChild = contained.some((node) => isContainer(node));
		if (!hasAbove) continue;
		if (!hasContainerChild && contained.length < 2) continue;
		background.type = "GROUP";
		background.children = contained;
		background.imageRole = void 0;
		background.area = (background.width || 0) * (background.height || 0);
		resetChildrenDepthAndZIndex(background, contained);
		for (const node of contained) toRemove.add(node.id);
	}
	if (toRemove.size > 0) {
		const remaining = nodes.filter((n) => !toRemove.has(n.id));
		nodes.length = 0;
		nodes.push(...remaining);
	}
}
function resetChildrenDepthAndZIndex(parent, children) {
	const nextDepth = (parent.depth ?? 0) + 1;
	const count = children.length;
	children.forEach((child, index) => {
		child.zIndex = count - 1 - index;
		updateDepthRecursively(child, nextDepth);
	});
}
function updateDepthRecursively(node, depth) {
	node.depth = depth;
	if (node.children && node.children.length > 0) for (const child of node.children) updateDepthRecursively(child, depth + 1);
}
function hasImageFill$3(node) {
	if (!Array.isArray(node.fills)) return false;
	return node.fills.some((fill) => fill && fill.type === "IMAGE" && fill.visible !== false);
}
function hasVisualBackground(node) {
	if (node.styles?.background || node.styles?.border || node.styles?.boxShadow) return true;
	if (node.fills && node.fills.some((fill) => fill.visible !== false)) return true;
	if (node.strokes && node.strokes.some((stroke) => stroke.visible !== false)) return true;
	if (node.effects && node.effects.length > 0) return true;
	if (node.cornerRadius !== void 0) return true;
	if (node.borderRadius) return true;
	return false;
}
var SHAPE_TYPES = new Set([
	"RECTANGLE",
	"ELLIPSE",
	"LINE",
	"VECTOR",
	"STAR",
	"POLYGON"
]);
function isMergeableBackground(node) {
	if (SHAPE_TYPES.has(node.type)) return true;
	if (node.type === "GROUP") return isPureBackgroundGroup$1(node);
	return false;
}
function isPureBackgroundGroup$1(node) {
	if (!node.children || node.children.length === 0) return false;
	const CONTENT_TYPES = new Set([
		"TEXT",
		"INSTANCE",
		"COMPONENT",
		"COMPONENT_SET",
		"FRAME"
	]);
	for (const child of node.children) {
		if (CONTENT_TYPES.has(child.type)) return false;
		if (child.type === "GROUP") {
			if (!isPureBackgroundGroup$1(child)) return false;
		}
	}
	return true;
}
function mergeBackgroundStyles$1(container, background) {
	if (background.type === "GROUP") {
		mergeGroupBackgroundStyles(container, background);
		return;
	}
	mergeShapeBackgroundStyles(container, background);
}
function mergeShapeBackgroundStyles(container, background) {
	const isClippingPlaceholder = background.mask === true && coveringSiblingHidesMask(background, container);
	const containerHadOwnBackground = hasOwnBackground(container);
	const effectiveFills = foldNodeOpacityIntoFills(background);
	if (!isClippingPlaceholder) {
		if (effectiveFills && !container.fills) container.fills = effectiveFills;
		if (background.strokes && !container.strokes) container.strokes = background.strokes;
		if (background.effects && !container.effects) container.effects = background.effects;
		if (background.strokeWeight !== void 0 && container.strokeWeight === void 0) container.strokeWeight = background.strokeWeight;
	}
	if (background.cornerRadius !== void 0 && container.cornerRadius === void 0) container.cornerRadius = background.cornerRadius;
	if (background.borderRadius && !container.borderRadius) container.borderRadius = background.borderRadius;
	const extractedStyles = {};
	if (!isClippingPlaceholder && !containerHadOwnBackground) {
		const bgColor = convertFills(effectiveFills);
		if (bgColor) extractedStyles.background = bgColor;
	}
	const radius = convertCornerRadius({
		cornerRadius: background.cornerRadius,
		borderRadius: background.borderRadius
	});
	if (radius) extractedStyles.borderRadius = radius;
	if (!isClippingPlaceholder) {
		const effects = convertEffects(background.effects);
		if (effects?.boxShadow) extractedStyles.boxShadow = effects.boxShadow;
	}
	if (!isClippingPlaceholder) {
		const border = convertStrokes(background.strokes, { weight: background.strokeWeight });
		if (border) extractedStyles.border = border;
	}
	if (Object.keys(extractedStyles).length > 0) container.styles = {
		...extractedStyles,
		...container.styles
	};
}
function mergeGroupBackgroundStyles(container, group) {
	if (!group.children || group.children.length === 0) return;
	const containerHadOwnBackground = hasOwnBackground(container);
	let maskElement = null;
	const contentElements = [];
	for (const child of group.children) {
		if (!SHAPE_TYPES.has(child.type)) continue;
		if (child.mask === true) maskElement = child;
		else contentElements.push(child);
	}
	if (maskElement) {
		if (maskElement.cornerRadius !== void 0 && container.cornerRadius === void 0) container.cornerRadius = maskElement.cornerRadius;
		if (maskElement.borderRadius && !container.borderRadius) container.borderRadius = maskElement.borderRadius;
		const radius = convertCornerRadius({
			cornerRadius: maskElement.cornerRadius,
			borderRadius: maskElement.borderRadius
		});
		if (radius) container.styles = {
			...container.styles,
			borderRadius: radius
		};
	}
	if (contentElements.length > 0 && !containerHadOwnBackground && !container.styles?.background) {
		const IMAGE_PLACEHOLDER = "linear-gradient(135deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%)";
		container.styles = {
			...container.styles,
			background: IMAGE_PLACEHOLDER
		};
		const firstContent = contentElements[0];
		const effectiveFills = foldNodeOpacityIntoFills(firstContent);
		if (effectiveFills && !container.fills) container.fills = effectiveFills;
	}
	for (const child of [...contentElements, maskElement].filter(Boolean)) if (child.effects && !container.effects) {
		container.effects = child.effects;
		const effects = convertEffects(child.effects);
		if (effects?.boxShadow && !container.styles?.boxShadow) container.styles = {
			...container.styles,
			boxShadow: effects.boxShadow
		};
		break;
	}
}
const extractBackgroundRule = {
	name: "extractBackground",
	apply(nodes) {
		extractBackgroundFromContainers(nodes);
	}
};
var BACKGROUND_SHAPE_TYPES$2 = new Set([
	"VECTOR",
	"RECTANGLE",
	"ELLIPSE",
	"LINE",
	"POLYGON",
	"STAR"
]);
var BACKGROUND_CONTAINER_TYPES = new Set(["GROUP"]);
var NON_BACKGROUND_CONTENT_TYPES = new Set([
	"TEXT",
	"INSTANCE",
	"COMPONENT",
	"COMPONENT_SET",
	"FRAME"
]);
function childHasVisibleImageFill(node) {
	const fills = node.fills;
	if (!Array.isArray(fills)) return false;
	return fills.some((f) => f && f.type === "IMAGE" && f.visible !== false && (f.opacity ?? 1) > .05);
}
function hasVisualPaint(node) {
	const fills = node.fills;
	if (Array.isArray(fills) && fills.some((f) => {
		if (!f || f.visible === false) return false;
		if (!f.type) return false;
		return (f.opacity ?? 1) > .05;
	})) return true;
	const effects = node.effects;
	if (Array.isArray(effects) && effects.some((e) => e && e.visible !== false && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW" || e.type === "BACKGROUND_BLUR"))) return true;
	return false;
}
function isPureBackgroundGroup(node) {
	if (!node.children || node.children.length === 0) return false;
	for (const child of node.children) {
		if (NON_BACKGROUND_CONTENT_TYPES.has(child.type)) return false;
		if (child.type === "GROUP") {
			if (!isPureBackgroundGroup(child)) return false;
		}
	}
	return true;
}
function hasSameGeometry(a, b) {
	const t = 2;
	return Math.abs(a.width - b.width) <= t && Math.abs(a.height - b.height) <= t && Math.abs(a.x - b.x) <= t && Math.abs(a.y - b.y) <= t;
}
function findVisualBackgroundShape(node, parent) {
	if (!node.children || node.children.length === 0) return null;
	for (const child of node.children) {
		if (BACKGROUND_SHAPE_TYPES$2.has(child.type) && hasSameGeometry(child, parent) && hasVisualPaint(child)) if (child.mask === true && isClippingMaskHiddenBySiblings(child, node.children)) {} else return child;
		const nested = findVisualBackgroundShape(child, parent);
		if (nested) return nested;
	}
	return null;
}
function extractBackgroundFromContainers(nodes, relaxed = false, imagePlaceholder = false) {
	if (!nodes || nodes.length === 0) return;
	for (const node of nodes) {
		if (node.children && node.children.length > 0) extractBackgroundFromContainers(node.children, relaxed, imagePlaceholder);
		extractBackgroundFromNode(node, relaxed, imagePlaceholder);
	}
}
function extractBackgroundFromNode(node, relaxed = false, imagePlaceholder = false) {
	if (!node.children || node.children.length < 2) return;
	const toRemove = [];
	for (const child of node.children) if (isFullSizeBackground(child, node, relaxed)) {
		const styleSource = pickBackgroundStyleSource(child, node);
		if (mergeBackgroundStyles(node, styleSource, imagePlaceholder)) {
			node.extractedBackgroundId = child.id;
			node.extractedBackgroundType = child.type;
			toRemove.push(child.id);
			demoteMaskIfCarriesVisuals(node);
			if (childHasVisibleImageFill(styleSource) && typeof child.id === "string") node.id = child.id;
			console.log(`[extractBackground] 提取背景: "${child.name}" (${child.id}) → "${node.name}" (${node.id})`, node.styles);
		} else console.log(`[extractBackground] 跳过提取（样式未转移）: "${child.name}" (${child.id}) → "${node.name}" (${node.id})`);
		break;
	}
	if (toRemove.length > 0) node.children = node.children.filter((c) => !toRemove.includes(c.id));
}
function pickBackgroundStyleSource(background, parent) {
	if (BACKGROUND_SHAPE_TYPES$2.has(background.type)) return background;
	const visualPaintShape = findVisualBackgroundShape(background, parent);
	if (visualPaintShape) return visualPaintShape;
	const nestedMatchParent = findFullSizeShapeDescendant(background, parent);
	if (nestedMatchParent) return nestedMatchParent;
	return findFullSizeShapeDescendant(background, background) || background;
}
function findFullSizeShapeDescendant(node, parent) {
	if (!node.children || node.children.length === 0) return null;
	for (const child of node.children) {
		if (BACKGROUND_SHAPE_TYPES$2.has(child.type) && isFullSizeBackground(child, parent)) return child;
		const nested = findFullSizeShapeDescendant(child, parent);
		if (nested) return nested;
	}
	return null;
}
function isFullSizeBackground(child, parent, relaxed = false) {
	if (child.mask === true) {
		if (!hasVisualPaint(child)) return false;
		if (isClippingMaskHiddenBySiblings(child, parent.children)) return false;
	}
	if (child.imageRole === "background") {
		if (calcCoverageRatio$2(child, parent) > .8) return true;
	}
	if (relaxed && BACKGROUND_SHAPE_TYPES$2.has(child.type)) {
		const sameWidth$1 = Math.abs(child.width - parent.width) <= 2;
		const coverage = calcCoverageRatio$2(child, parent);
		if (sameWidth$1 && coverage > .8) return true;
	}
	if (BACKGROUND_CONTAINER_TYPES.has(child.type) && hasSameGeometry(child, parent) && isPureBackgroundGroup(child) && findVisualBackgroundShape(child, parent)) return true;
	if (!BACKGROUND_SHAPE_TYPES$2.has(child.type)) return false;
	const tolerance = 2;
	const sameWidth = Math.abs(child.width - parent.width) <= tolerance;
	const sameHeight = Math.abs(child.height - parent.height) <= tolerance;
	const sameX = Math.abs(child.x - parent.x) <= tolerance;
	const sameY = Math.abs(child.y - parent.y) <= tolerance;
	return sameWidth && sameHeight && sameX && sameY;
}
function calcCoverageRatio$2(child, parent) {
	if (!parent.width || !parent.height) return 0;
	const childArea = (child.width || 0) * (child.height || 0);
	const parentArea = parent.width * parent.height;
	return parentArea > 0 ? childArea / parentArea : 0;
}
function mergeBackgroundStyles(parent, background, imagePlaceholder = false) {
	const parentHadOwnBackground = hasOwnBackground(parent);
	const effectiveFills = foldNodeOpacityIntoFills(background);
	const isExtractedOpaque = Array.isArray(effectiveFills) && effectiveFills.some((f) => f.visible !== false && (f.opacity ?? 1) > .95);
	let transferred = false;
	if (effectiveFills && effectiveFills.length > 0) {
		if (!(Array.isArray(parent.fills) && parent.fills.length > 0) || isExtractedOpaque) {
			parent.fills = effectiveFills;
			transferred = true;
		}
	}
	if (Array.isArray(background.strokes) && background.strokes.length > 0 && (!Array.isArray(parent.strokes) || parent.strokes.length === 0)) parent.strokes = background.strokes;
	if (Array.isArray(background.effects) && background.effects.length > 0 && (!Array.isArray(parent.effects) || parent.effects.length === 0)) parent.effects = background.effects;
	if (background.cornerRadius !== void 0 && parent.cornerRadius === void 0) parent.cornerRadius = background.cornerRadius;
	if (background.borderRadius && !parent.borderRadius) parent.borderRadius = background.borderRadius;
	if (background.strokeWeight !== void 0 && parent.strokeWeight === void 0) parent.strokeWeight = background.strokeWeight;
	const extractedStyles = {};
	if (!parentHadOwnBackground || isExtractedOpaque) {
		const bgColor = convertFills(effectiveFills, parent.id, imagePlaceholder);
		if (bgColor) {
			extractedStyles.background = bgColor;
			transferred = true;
		}
		if (!bgColor) {
			const bgStyleStr = background.style?.background ?? background.styles?.background;
			if (bgStyleStr && String(bgStyleStr).includes("url(")) {
				extractedStyles.background = bgStyleStr;
				if (background.imgUrl && !parent.imgUrl) parent.imgUrl = background.imgUrl;
				parent.shouldBeImage = true;
				transferred = true;
			}
		}
	}
	const radius = convertCornerRadius({
		cornerRadius: background.cornerRadius,
		borderRadius: background.borderRadius
	});
	if (radius) extractedStyles.borderRadius = radius;
	const effects = convertEffects(background.effects);
	if (effects?.boxShadow) extractedStyles.boxShadow = effects.boxShadow;
	const border = convertStrokes(background.strokes, { weight: background.strokeWeight });
	if (border) extractedStyles.border = border;
	if (Object.keys(extractedStyles).length > 0) if (isExtractedOpaque && extractedStyles.background) {
		const { background: _old, ...restParent } = parent.styles || {};
		parent.styles = {
			...extractedStyles,
			...restParent
		};
	} else parent.styles = {
		...extractedStyles,
		...parent.styles
	};
	return transferred;
}
function calculateMeaningfulness(node) {
	let score = 0;
	if (node.componentInfo) score += 30;
	if (node.fills && Array.isArray(node.fills)) {
		if (node.fills.some((f) => f.visible !== false)) score += 20;
	}
	if (node.strokes && Array.isArray(node.strokes)) {
		if (node.strokes.some((s) => s.visible !== false)) score += 15;
	}
	if (node.effects && Array.isArray(node.effects)) {
		if (node.effects.some((e) => e.visible !== false)) score += 15;
	}
	if (node.cornerRadius && node.cornerRadius > 0) score += 10;
	if (node.borderRadius && Array.isArray(node.borderRadius)) {
		if (node.borderRadius.some((r) => r > 0)) score += 10;
	}
	if (node.type === "GROUP") score -= 10;
	if (node.type === "TEXT") score += 25;
	if (node.type === "INSTANCE") score += 20;
	return score;
}
const collapseSingleChildRule = {
	name: "collapseSingleChild",
	apply(nodes) {
		collapseSingleChildContainers(nodes);
	}
};
function isSameGeometry$1(a, b) {
	const e = 1;
	return Math.abs((a.x ?? 0) - (b.x ?? 0)) < e && Math.abs((a.y ?? 0) - (b.y ?? 0)) < e && Math.abs((a.width ?? 0) - (b.width ?? 0)) < e && Math.abs((a.height ?? 0) - (b.height ?? 0)) < e;
}
function hasOverflow(parent, child) {
	const parentWidth = parent.width ?? 0;
	const parentHeight = parent.height ?? 0;
	const childWidth = child.width ?? 0;
	const childHeight = child.height ?? 0;
	return childWidth > parentWidth + 1 || childHeight > parentHeight + 1;
}
function getCollapseType(node) {
	if (!node.children || node.children.length !== 1) return null;
	const child = node.children[0];
	if (isSameGeometry$1(node, child)) return "same";
	if (hasOverflow(node, child)) return "overflow";
	return null;
}
function mergeStyles(baseStyles, priorityStyles) {
	if (!baseStyles && !priorityStyles) return void 0;
	if (!baseStyles) return priorityStyles;
	if (!priorityStyles) return baseStyles;
	return {
		...baseStyles,
		...priorityStyles
	};
}
function isEmpty(arr) {
	return !arr || arr.length === 0;
}
function hasNoVisibleFill(fills) {
	if (!fills || fills.length === 0) return true;
	return fills.every((f) => f.visible === false);
}
function inheritVisualProps(source, target) {
	if (hasNoVisibleFill(target.fills) && !hasNoVisibleFill(source.fills)) target.fills = source.fills;
	if (isEmpty(target.strokes) && !isEmpty(source.strokes)) {
		target.strokes = source.strokes;
		target.strokeWeight = source.strokeWeight;
		target.strokeTopWeight = source.strokeTopWeight;
		target.strokeBottomWeight = source.strokeBottomWeight;
		target.strokeLeftWeight = source.strokeLeftWeight;
		target.strokeRightWeight = source.strokeRightWeight;
	}
	if (isEmpty(target.effects) && !isEmpty(source.effects)) target.effects = source.effects;
	if (target.cornerRadius === void 0 && source.cornerRadius) target.cornerRadius = source.cornerRadius;
	if (!target.borderRadius && source.borderRadius) target.borderRadius = source.borderRadius;
	if (source.opacity !== void 0 && source.opacity < 1) {
		const targetOpacity = target.opacity ?? 1;
		target.opacity = source.opacity * targetOpacity;
	}
	if (!target.componentInfo && source.componentInfo) target.componentInfo = source.componentInfo;
	if (source.shouldBeImage === true && target.shouldBeImage !== true) target.shouldBeImage = true;
}
function keepParent(node, child, hasOverflowCase) {
	if (hasOverflowCase) {
		if (Math.abs((node.x ?? 0) - (child.x ?? 0)) <= 2 && Math.abs((node.y ?? 0) - (child.y ?? 0)) <= 2) {
			node.width = child.width;
			node.height = child.height;
		}
	}
	inheritVisualProps(child, node);
	node.styles = mergeStyles(child.styles, node.styles);
	node.children = child.children || [];
	node.collapsedChildId = child.id;
	node.collapsedChildType = child.type;
	node.collapsedChildName = child.name;
	demoteMaskIfCarriesVisuals(node);
}
function keepChild(node, child, nodes, index) {
	inheritVisualProps(node, child);
	child.styles = mergeStyles(node.styles, child.styles);
	child.collapsedParentId = node.id;
	child.collapsedParentType = node.type;
	child.collapsedParentName = node.name;
	demoteMaskIfCarriesVisuals(child);
	nodes[index] = child;
}
function collapseSingleChildContainers(nodes) {
	if (!nodes || nodes.length === 0) return;
	nodes.forEach((node) => {
		if (node.children && node.children.length > 0) collapseSingleChildContainers(node.children);
	});
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const collapseType = getCollapseType(node);
		if (!collapseType) continue;
		const child = node.children[0];
		if (child.type === "TEXT" && child.characters) continue;
		if (calculateMeaningfulness(node) >= calculateMeaningfulness(child)) keepParent(node, child, collapseType === "overflow");
		else keepChild(node, child, nodes, i);
	}
	mergeSameGeometrySiblings(nodes);
}
function mergeSameGeometrySiblings(nodes) {
	if (!nodes || nodes.length < 2) return;
	const toRemove = /* @__PURE__ */ new Set();
	for (let i = 0; i < nodes.length; i++) {
		if (toRemove.has(nodes[i].id)) continue;
		for (let j = i + 1; j < nodes.length; j++) {
			if (toRemove.has(nodes[j].id)) continue;
			const nodeA = nodes[i];
			const nodeB = nodes[j];
			if (!isSameGeometry$1(nodeA, nodeB)) continue;
			const keepNode = calculateMeaningfulness(nodeA) >= calculateMeaningfulness(nodeB) ? nodeA : nodeB;
			const removeNode = keepNode === nodeA ? nodeB : nodeA;
			inheritVisualProps(removeNode, keepNode);
			keepNode.styles = mergeStyles(removeNode.styles, keepNode.styles);
			keepNode.collapsedSiblingId = removeNode.id;
			keepNode.collapsedSiblingType = removeNode.type;
			demoteMaskIfCarriesVisuals(keepNode);
			toRemove.add(removeNode.id);
		}
	}
	if (toRemove.size > 0) {
		const remaining = nodes.filter((n) => !toRemove.has(n.id));
		nodes.length = 0;
		nodes.push(...remaining);
	}
}
var IconDetector = class {
	detect(node) {
		if (!node.children || node.children.length === 0) return false;
		const nameLower = node.name.toLowerCase();
		const isNamedIcon = nameLower.includes("icon") || nameLower.includes("ic_") || nameLower.includes("svg");
		const isSmall = node.width <= 64 && node.height <= 64;
		const isTiny = node.width < 24 && node.height < 24;
		if (isSmall && node.children.length === 1) {
			const child = node.children[0];
			if (child.type === "ICON" && child.shouldBeImage) return true;
			if (child.type === "TEXT") {
				const chars = child.characters;
				if (chars && chars.length <= 2) {
					if ((chars.codePointAt(0) || 0) >= 57344) return true;
				}
			}
		}
		const vectorTypes = [
			"VECTOR",
			"ELLIPSE",
			"RECTANGLE",
			"LINE",
			"STAR",
			"POLYGON",
			"BOOLEAN_OPERATION"
		];
		let vectorCount = 0;
		let nonVectorCount = 0;
		let hasText = false;
		for (const child of node.children) if (vectorTypes.includes(child.type)) vectorCount++;
		else if (child.type === "TEXT") {
			hasText = true;
			nonVectorCount++;
		} else if (child.type === "GROUP" || child.type === "FRAME" || child.type === "ICON") if (child.type === "ICON") vectorCount++;
		else nonVectorCount++;
		else nonVectorCount++;
		const isPureVector$1 = nonVectorCount === 0 && vectorCount > 0;
		if (isNamedIcon && isSmall) return true;
		if (isPureVector$1 && isSmall) return true;
		if (isTiny && vectorCount > 0 && !hasText) return true;
		return false;
	}
	process(node) {
		node.type = "ICON";
		node.shouldBeImage = true;
		node.children = [];
	}
};
const collapseIconsRule = {
	name: "collapseIcons",
	apply(nodes) {
		detectAndCollapseIcons(nodes);
	}
};
function detectAndCollapseIcons(nodes) {
	if (!nodes || nodes.length === 0) return;
	nodes.forEach((node) => {
		if (node.children && node.children.length > 0) detectAndCollapseIcons(node.children);
	});
	const detector = new IconDetector();
	for (const node of nodes) if (detector.detect(node)) detector.process(node);
}
var VECTOR_TYPES = new Set([
	"VECTOR",
	"LINE",
	"RECTANGLE",
	"ELLIPSE",
	"POLYGON",
	"STAR",
	"BOOLEAN_OPERATION"
]);
var COMPLEX_TYPES = new Set([
	"FRAME",
	"TEXT",
	"INSTANCE",
	"COMPONENT",
	"COMPONENT_SET"
]);
function isPureVector(node) {
	if (VECTOR_TYPES.has(node.type)) {
		const fills = node.fills;
		if (Array.isArray(fills) && fills.some((f) => f.type === "IMAGE" && f.visible !== false)) return false;
		return true;
	}
	if (COMPLEX_TYPES.has(node.type)) return false;
	if (node.type === "GROUP") {
		if (!node.children || node.children.length === 0) return false;
		return node.children.every((child) => isPureVector(child));
	}
	return false;
}
function countDescendants(node) {
	if (!node.children || node.children.length === 0) return 0;
	let count = node.children.length;
	for (const child of node.children) count += countDescendants(child);
	return count;
}
function processNode(node) {
	if (!node.children || node.children.length === 0) return;
	if (node.type === "GROUP" && isPureVector(node)) {
		const descendantCount = countDescendants(node);
		node.children = [];
		console.log(`[CollapseVectorGroups] Collapsed GROUP "${node.name}" (id: ${node.id}), removed ${descendantCount} descendant nodes`);
		return;
	}
	for (const child of node.children) processNode(child);
}
const collapseVectorGroupsRule = {
	name: "collapseVectorGroups",
	apply(nodes) {
		for (const node of nodes) processNode(node);
	}
};
function hasImageFill$2(node) {
	if (!node.fills || !Array.isArray(node.fills)) return false;
	return node.fills.some((fill) => fill.type === "IMAGE" && fill.visible !== false);
}
function calcCoverageRatio$1(node, parent) {
	const parentArea = parent.width * parent.height;
	if (parentArea === 0) return 0;
	return node.width * node.height / parentArea;
}
function isBottomLayer(node, siblings) {
	if (siblings.length === 0) return true;
	const minZIndex = Math.min(...siblings.map((s) => s.zIndex ?? 0));
	return (node.zIndex ?? 0) <= minZIndex + 1;
}
function hasGeometryOverlap(a, b) {
	const aLeft = a.x ?? 0;
	const aRight = aLeft + (a.width ?? 0);
	const aTop = a.y ?? 0;
	const aBottom = aTop + (a.height ?? 0);
	const bLeft = b.x ?? 0;
	const bRight = bLeft + (b.width ?? 0);
	const bTop = b.y ?? 0;
	const bBottom = bTop + (b.height ?? 0);
	return !(aRight <= bLeft || bRight <= aLeft || aBottom <= bTop || bBottom <= aTop);
}
function hasSiblingsAbove(node, siblings) {
	const nodeZIndex = node.zIndex ?? 0;
	return siblings.some((sibling) => sibling.id !== node.id && (sibling.zIndex ?? 0) > nodeZIndex && hasGeometryOverlap(node, sibling));
}
function hasTextDescendant(node) {
	if (node.type === "TEXT") return true;
	if (!node.children || node.children.length === 0) return false;
	for (const child of node.children) if (hasTextDescendant(child)) return true;
	return false;
}
function detectImageRole(node, parent) {
	if (!parent || !parent.children) return null;
	if (node.mask === true) return null;
	if (hasTextDescendant(node)) return null;
	const coverage = calcCoverageRatio$1(node, parent);
	const isBottom = isBottomLayer(node, parent.children);
	const hasAbove = hasSiblingsAbove(node, parent.children);
	const hasVisibleStroke = Array.isArray(node.strokes) && node.strokes.some((s) => s.visible !== false && (s.opacity ?? 1) > .05);
	if (coverage > .8 && isBottom && hasAbove && !hasVisibleStroke) return "background";
	if (hasImageFill$2(node)) return "content";
	return null;
}
function traverseAndDetect(node, parent) {
	const role = detectImageRole(node, parent);
	if (role) node.imageRole = role;
	if (node.children && node.children.length > 0) for (const child of node.children) traverseAndDetect(child, node);
}
const detectImageRoleRule = {
	name: "detectImageRole",
	apply(nodes) {
		for (const root of nodes) traverseAndDetect(root, null);
	}
};
function isClusterCandidate(node) {
	if (node.visible === false) return false;
	if (node.imageRole === "background") return false;
	if (!node.width || !node.height) return false;
	return true;
}
function filterCandidates(children) {
	return children.filter(isClusterCandidate);
}
var UnionFind = class {
	parent;
	constructor(ids) {
		this.parent = new Map(ids.map((id) => [id, id]));
	}
	find(id) {
		const parent = this.parent.get(id) ?? id;
		if (parent === id) return id;
		const root = this.find(parent);
		this.parent.set(id, root);
		return root;
	}
	union(a, b) {
		const rootA = this.find(a);
		const rootB = this.find(b);
		if (rootA !== rootB) this.parent.set(rootA, rootB);
	}
	toClusters() {
		const buckets = /* @__PURE__ */ new Map();
		Array.from(this.parent.keys()).forEach((id) => {
			const root = this.find(id);
			if (!buckets.has(root)) buckets.set(root, []);
			buckets.get(root).push(id);
		});
		return Array.from(buckets.values());
	}
};
function rectGap(a, b) {
	const ax1 = a.x;
	const ay1 = a.y;
	const ax2 = a.x + a.width;
	const ay2 = a.y + a.height;
	const bx1 = b.x;
	const by1 = b.y;
	const bx2 = b.x + b.width;
	const by2 = b.y + b.height;
	const dx = ax1 > bx2 ? ax1 - bx2 : bx1 > ax2 ? bx1 - ax2 : 0;
	const dy = ay1 > by2 ? ay1 - by2 : by1 > ay2 ? by1 - ay2 : 0;
	return Math.max(dx, dy);
}
function overlapRatioX$1(a, b) {
	return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) / (Math.min(a.width, b.width) || 1);
}
function overlapRatioY$1(a, b) {
	return Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)) / (Math.min(a.height, b.height) || 1);
}
function calcBounds$5(nodes) {
	const xs = nodes.map((node) => node.x);
	const ys = nodes.map((node) => node.y);
	const xe = nodes.map((node) => node.x + node.width);
	const ye = nodes.map((node) => node.y + node.height);
	const x = Math.min(...xs);
	const y = Math.min(...ys);
	return {
		x,
		y,
		width: Math.max(...xe) - x,
		height: Math.max(...ye) - y
	};
}
function shouldLinkHorizontal(a, b) {
	if (isStrongOverlap(a, b)) return false;
	if (!(overlapRatioY$1(a, b) >= .6)) return false;
	if (isLargeMediaWithText(a, b)) return false;
	return true;
}
function shouldLinkVertical(a, b) {
	if (isStrongOverlap(a, b)) return false;
	if (!(overlapRatioX$1(a, b) >= .6)) return false;
	if (a.type !== "TEXT" || b.type !== "TEXT") return false;
	return rectGap(a, b) <= 12;
}
function isLargeMediaWithText(a, b) {
	const check = (media, text) => {
		if (text.type !== "TEXT") return false;
		if (media.type !== "IMAGE" && media.type !== "ICON") return false;
		return Math.max(media.width ?? 0, media.height ?? 0) > 32;
	};
	return check(a, b) || check(b, a);
}
function isStrongOverlap(a, b) {
	const overlapArea = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
	const minArea = Math.min(a.width * a.height, b.width * b.height);
	if (minArea === 0) return false;
	return overlapArea / minArea > .6;
}
function isRowGroup(nodes) {
	const base = nodes[0];
	return nodes.every((node) => overlapRatioY$1(base, node) >= .6);
}
function isColumnGroup(nodes) {
	const base = nodes[0];
	return nodes.every((node) => overlapRatioX$1(base, node) >= .6);
}
function isContiguous(nodes, indexMap) {
	const indices = nodes.map((node) => indexMap.get(node.id) ?? 0).sort((a, b) => a - b);
	return indices[indices.length - 1] - indices[0] + 1 === indices.length;
}
function buildInitialClusters(_parent, _children, candidates) {
	if (candidates.length < 2) return [];
	const horizontalGroups = buildClusters(candidates, shouldLinkHorizontal);
	const verticalGroups = buildClusters(candidates, shouldLinkVertical);
	return [...horizontalGroups, ...verticalGroups];
}
function buildClusters(candidates, linkFn) {
	const uf = new UnionFind(candidates.map((node) => node.id));
	for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) if (linkFn(candidates[i], candidates[j])) uf.union(candidates[i].id, candidates[j].id);
	return uf.toClusters().map((ids) => ids.map((id) => candidates.find((node) => node.id === id)).filter(Boolean)).filter((group) => group.length >= 2);
}
function validateClusters(children, clusters) {
	if (children.length < 2 || clusters.length === 0) return [];
	const indexMap = /* @__PURE__ */ new Map();
	children.forEach((child, index) => indexMap.set(child.id, index));
	return clusters.map((group) => group.slice().sort((a, b) => indexMap.get(a.id) - indexMap.get(b.id))).filter((group) => isContiguous(group, indexMap)).filter((group) => isRowGroup(group) || isColumnGroup(group));
}
function buildVirtualGroups(parent, children, groups) {
	if (children.length < 2 || groups.length === 0) return null;
	const usedNodes = /* @__PURE__ */ new Set();
	const adoptedGroups = [];
	for (const group of groups) if (group.every((node) => !usedNodes.has(node.id))) {
		adoptedGroups.push(group);
		group.forEach((node) => usedNodes.add(node.id));
	}
	if (adoptedGroups.length === 0) return null;
	const nodeToGroup = /* @__PURE__ */ new Map();
	for (const group of adoptedGroups) for (const node of group) nodeToGroup.set(node.id, group);
	const processedGroups = /* @__PURE__ */ new Set();
	const nextChildren = [];
	for (const child of children) {
		const group = nodeToGroup.get(child.id);
		if (!group) {
			nextChildren.push(child);
			continue;
		}
		const groupKey = group.map((node) => node.id).join("|");
		if (processedGroups.has(groupKey)) continue;
		processedGroups.add(groupKey);
		const virtualGroup = buildVirtualGroup(group, parent);
		nextChildren.push(virtualGroup);
	}
	return nextChildren;
}
function buildVirtualGroup(nodes, parent) {
	const bounds = calcBounds$5(nodes);
	const depth = (parent.depth ?? 0) + 1;
	const virtualGroup = {
		id: `vg-${parent.id}-${nodes[0].id}`,
		name: "虚拟分组",
		type: "VIRTUAL_GROUP",
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		area: bounds.width * bounds.height,
		depth,
		zIndex: Math.max(...nodes.map((node) => node.zIndex ?? 0)),
		renderOrder: Math.max(...nodes.map((node) => node.renderOrder ?? 0)),
		children: nodes.slice()
	};
	nodes.forEach((node) => updateDepth(node, depth + 1));
	return virtualGroup;
}
function updateDepth(node, depth) {
	node.depth = depth;
	if (node.children && node.children.length > 0) node.children.forEach((child) => updateDepth(child, depth + 1));
}
function clusterGroups(root) {
	traverseAndCluster(root);
}
function traverseAndCluster(node) {
	if (!node.children || node.children.length === 0) return;
	if (node.type === "INSTANCE") return;
	node.children.forEach((child) => traverseAndCluster(child));
	runClusterSteps(node);
}
function runClusterSteps(parent) {
	const MAX_ROUNDS = 10;
	let round = 0;
	while (round < MAX_ROUNDS) {
		round++;
		const children = parent.children ?? [];
		if (children.length < 2) return;
		const validGroups = validateClusters(children, buildInitialClusters(parent, children, filterCandidates(children)));
		if (validGroups.some((group) => group.length === children.length)) return;
		const nextChildren = buildVirtualGroups(parent, children, validGroups);
		if (!nextChildren || nextChildren.length === children.length) return;
		parent.children = nextChildren;
	}
}
const clusterGroupsRule = {
	name: "clusterGroups",
	apply(nodes) {
		nodes.forEach((root) => clusterGroups(root));
	}
};
var CONTAINER_TYPES$5 = new Set([
	"FRAME",
	"GROUP",
	"SECTION",
	"INSTANCE",
	"COMPONENT"
]);
function getChildrenBBox(children) {
	if (!children || children.length === 0) return null;
	let minY = Infinity;
	let maxY = -Infinity;
	for (const child of children) {
		const childTop = child.y ?? 0;
		const childBottom = childTop + (child.height ?? 0);
		minY = Math.min(minY, childTop);
		maxY = Math.max(maxY, childBottom);
	}
	if (minY === Infinity || maxY === -Infinity) return null;
	return {
		minY,
		maxY
	};
}
function shouldAdjustHeight(parent, bbox, options) {
	const { ratioThreshold = 3, minExcessPadding = 100 } = options;
	const parentTop = parent.y ?? 0;
	const parentBottom = parentTop + (parent.height ?? 0);
	const topPadding = bbox.minY - parentTop;
	const bottomPadding = parentBottom - bbox.maxY;
	if (topPadding < 0) return false;
	return bottomPadding > topPadding * ratioThreshold && bottomPadding > minExcessPadding;
}
function doAdjustHeight(parent, bbox) {
	const parentTop = parent.y ?? 0;
	const topPadding = bbox.minY - parentTop;
	const contentHeight = bbox.maxY - bbox.minY;
	const reasonableBottomPadding = topPadding;
	const newHeight = topPadding + contentHeight + reasonableBottomPadding;
	if (parent.height !== newHeight) {
		parent._originalHeight = parent.height;
		parent._heightAdjusted = true;
	}
	parent.height = newHeight;
	parent.area = (parent.width ?? 0) * newHeight;
}
function adjustContainerHeight(node, options = {}, isRoot = false) {
	const { adjustRoot = false } = options;
	if (node.children && node.children.length > 0) for (const child of node.children) adjustContainerHeight(child, options, false);
	if (!CONTAINER_TYPES$5.has(node.type)) return;
	if (!node.children || node.children.length === 0) return;
	if (isRoot && !adjustRoot) return;
	const bbox = getChildrenBBox(node.children);
	if (!bbox) return;
	if (shouldAdjustHeight(node, bbox, options)) doAdjustHeight(node, bbox);
}
const adjustContainerHeightRule = {
	name: "adjustContainerHeight",
	apply(nodes) {
		for (const root of nodes) adjustContainerHeight(root, {
			ratioThreshold: 3,
			minExcessPadding: 100,
			adjustRoot: false
		}, true);
	}
};
function postprocess(root, options = {}) {
	const { autoSort = true, enableGrouping = false, skipDetectImageRole = false, skipExtractBackground = false } = options;
	applyRules([root], (autoSort ? [
		sortChildrenRule,
		adjustContainerHeightRule,
		detectImageRoleRule,
		mergeSiblingsRule,
		extractBackgroundRule,
		collapseSingleChildRule,
		collapseIconsRule,
		collapseVectorGroupsRule,
		...enableGrouping ? [clusterGroupsRule] : []
	] : [
		adjustContainerHeightRule,
		detectImageRoleRule,
		mergeSiblingsRule,
		extractBackgroundRule,
		collapseSingleChildRule,
		collapseIconsRule,
		collapseVectorGroupsRule,
		...enableGrouping ? [clusterGroupsRule] : []
	]).filter((r) => {
		if (skipDetectImageRole && r === detectImageRoleRule) return false;
		if (skipExtractBackground && r === extractBackgroundRule) return false;
		return true;
	}));
}
function processPipeline(json, options = {}) {
	const isCompressedDsl = json && json._fromCompressedDsl === true;
	const { removeHidden, removeTransparent, removeZeroSize, removeOverflow, removeOccluded = !isCompressedDsl, autoSort, enableGrouping, skipDetectImageRole, skipExtractBackground } = options;
	clipRawMaskBounds(json);
	const { data: cleanedData, stats } = preprocess(json, {
		removeHidden,
		removeTransparent,
		removeZeroSize,
		removeOverflow,
		removeOccluded
	});
	console.log("[Pipeline] 预处理完成:", stats);
	const { root, nodeMap } = normalize(cleanedData);
	if (!root) return {
		tree: null,
		nodeMap,
		stats
	};
	postprocess(root, {
		autoSort,
		enableGrouping,
		skipDetectImageRole,
		skipExtractBackground
	});
	return {
		tree: root,
		nodeMap,
		stats
	};
}
const LEAF_TYPES$2 = new Set([
	"TEXT",
	"IMAGE",
	"VECTOR",
	"RECTANGLE",
	"ELLIPSE",
	"LINE",
	"POLYGON",
	"STAR",
	"BOOLEAN_OPERATION",
	"ICON"
]);
const CONTAINER_TYPES$4 = new Set([
	"FRAME",
	"GROUP",
	"SECTION",
	"VIRTUAL_GROUP"
]);
const PRESERVE_TYPES = new Set([
	"INSTANCE",
	"COMPONENT",
	"COMPONENT_SET"
]);
function flattenToLeaves(node, verbose = false) {
	const leaves = [];
	function collect(n) {
		if (n.mask === true) {
			if (verbose) console.log(`[Flatten] 跳过 mask 节点: ${n.type} "${n.name}" (${n.id})`);
			if (n.children && n.children.length > 0) n.children.forEach((child) => collect(child));
			return;
		}
		if (LEAF_TYPES$2.has(n.type)) {
			leaves.push(n);
			return;
		}
		if (n.children && n.children.length > 0) {
			n.children.forEach((child) => collect(child));
			return;
		}
		if (CONTAINER_TYPES$4.has(n.type)) {
			const wasCollapsed = !!n.collapsedChildId;
			const hasVisual = Array.isArray(n.fills) && n.fills.some((f) => f.visible !== false) || Array.isArray(n.strokes) && n.strokes.some((s) => s.visible !== false) || n.styles && Object.keys(n.styles).length > 0;
			if (wasCollapsed || hasVisual) {
				leaves.push(n);
				return;
			}
			if (verbose) console.log(`[Flatten] 丢弃空容器: ${n.type} "${n.name}" (${n.id})`);
			return;
		}
		leaves.push(n);
	}
	collect(node);
	return leaves;
}
function smartFlatten(node) {
	function process(n) {
		if (LEAF_TYPES$2.has(n.type)) return n;
		if (PRESERVE_TYPES.has(n.type)) {
			if (n.children && n.children.length > 0) {
				const processedChildren = [];
				n.children.forEach((child) => {
					const result$1 = process(child);
					if (Array.isArray(result$1)) processedChildren.push(...result$1);
					else processedChildren.push(result$1);
				});
				return {
					...n,
					children: processedChildren
				};
			}
			return n;
		}
		if (CONTAINER_TYPES$4.has(n.type)) {
			if (!n.children || n.children.length === 0) return [];
			const processedChildren = [];
			n.children.forEach((child) => {
				const result$1 = process(child);
				if (Array.isArray(result$1)) processedChildren.push(...result$1);
				else processedChildren.push(result$1);
			});
			if (processedChildren.length > 1) return {
				...n,
				children: processedChildren
			};
			else if (processedChildren.length === 1) {
				const child = processedChildren[0];
				if (child.type === "TEXT" && child.characters) return {
					...n,
					children: processedChildren
				};
				if (calculateMeaningfulness(n) >= calculateMeaningfulness(child)) return {
					...n,
					children: child.children || []
				};
				else return child;
			} else return [];
		}
		if (n.children && n.children.length > 0) {
			const processedChildren = [];
			n.children.forEach((child) => {
				const result$1 = process(child);
				if (Array.isArray(result$1)) processedChildren.push(...result$1);
				else processedChildren.push(result$1);
			});
			return {
				...n,
				children: processedChildren
			};
		}
		return n;
	}
	const result = process(node);
	if (Array.isArray(result)) return {
		id: "smart-flatten-root",
		name: "Root",
		type: "FRAME",
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		area: 0,
		depth: 0,
		zIndex: 0,
		renderOrder: 0,
		children: result
	};
	return result;
}
function preserveGroupsFlatten(node) {
	function process(n) {
		if (!n.children || n.children.length === 0) return n;
		const processedChildren = n.children.map((child) => process(child));
		return {
			...n,
			children: processedChildren
		};
	}
	return process(node);
}
var COLLECTABLE_TYPES = new Set([
	"FRAME",
	"GROUP",
	"SECTION",
	"INSTANCE",
	"COMPONENT",
	"COMPONENT_SET"
]);
function checkVisualStyles(node) {
	const hasFills = Array.isArray(node.fills) && node.fills.some((f) => f.visible !== false);
	const hasStrokes = Array.isArray(node.strokes) && node.strokes.some((s) => s.visible !== false);
	const hasCorner = !!(node.cornerRadius && node.cornerRadius > 0) || !!node.borderRadius;
	const hasExtractedBg = !!node.extractedBackgroundId;
	const hasStylesBackground = !!node.styles?.background;
	const hasRawUrlBackground = typeof node.style?.background === "string" && node.style.background.includes("url(");
	const hasImgUrl = !!node.imgUrl;
	return hasFills || hasStrokes || hasCorner || hasExtractedBg || hasStylesBackground || hasRawUrlBackground || hasImgUrl;
}
function collectContainers(tree) {
	const containerMap = /* @__PURE__ */ new Map();
	const containerStack = [];
	function traverse(node, isRoot) {
		if (LEAF_TYPES$2.has(node.type)) return new Set([node.id]);
		if (!node.children || node.children.length === 0) {
			if (CONTAINER_TYPES$4.has(node.type)) return /* @__PURE__ */ new Set();
			return new Set([node.id]);
		}
		const isCollectable = !isRoot && COLLECTABLE_TYPES.has(node.type);
		const parentContainerId = isCollectable ? containerStack.length > 0 ? containerStack[containerStack.length - 1] : null : null;
		if (isCollectable) containerStack.push(node.id);
		const descendantLeafIds = /* @__PURE__ */ new Set();
		for (const child of node.children) for (const id of traverse(child, false)) descendantLeafIds.add(id);
		if (isCollectable) {
			containerStack.pop();
			const { children: _discard, ...rest } = node;
			containerMap.set(node.id, {
				node: rest,
				originalDepth: node.depth,
				area: node.area || node.width * node.height,
				hasVisualStyles: checkVisualStyles(node),
				originalChildIds: node.children.map((c) => c.id),
				parentContainerId,
				descendantLeafIds
			});
		}
		return descendantLeafIds;
	}
	traverse(tree, true);
	if (containerMap.size === 0) return [];
	const childrenOf = /* @__PURE__ */ new Map();
	for (const c of containerMap.values()) {
		const key = c.parentContainerId && containerMap.has(c.parentContainerId) ? c.parentContainerId : null;
		if (!childrenOf.has(key)) childrenOf.set(key, []);
		childrenOf.get(key).push(c);
	}
	const layers = [];
	let current = childrenOf.get(null) || [];
	while (current.length > 0) {
		current.sort((a, b) => b.area - a.area || a.originalDepth - b.originalDepth);
		layers.push(current);
		const next = [];
		for (const c of current) next.push(...childrenOf.get(c.node.id) || []);
		current = next;
	}
	return layers;
}
function shortHash(s) {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h ^ s.charCodeAt(i)) >>> 0;
	return h.toString(36).padStart(6, "0").slice(0, 6);
}
function buildVgId(children, bounds, type) {
	return `vg-${shortHash([
		children[0]?.id ?? "empty",
		type,
		children.length,
		Math.round(bounds.x),
		Math.round(bounds.y),
		Math.round(bounds.width),
		Math.round(bounds.height)
	].join("|"))}`;
}
var DEFAULT_OPTIONS$1 = {
	eps: "auto",
	minPts: 2,
	distanceType: "gap",
	autoEpsRatio: .5
};
function autoCalculateEps(nodes, distanceType, k = 3, ratio = .5) {
	const n = nodes.length;
	if (n <= 1) return 50;
	if (n <= k) return 50;
	const kDistances = [];
	for (let i = 0; i < n; i++) {
		const distances = [];
		for (let j = 0; j < n; j++) if (i !== j) distances.push(calcDistance(nodes[i], nodes[j], distanceType));
		distances.sort((a, b) => a - b);
		if (distances.length >= k) kDistances.push(distances[k - 1]);
	}
	if (kDistances.length === 0) return 50;
	kDistances.sort((a, b) => a - b);
	const percentileIndex = Math.floor(kDistances.length * ratio);
	const eps = kDistances[Math.min(percentileIndex, kDistances.length - 1)];
	const finalEps = Math.max(5, Math.min(200, eps));
	console.log(`[DBSCAN] 自动计算 eps: ${finalEps.toFixed(1)} (k=${k}, ratio=${ratio}, 样本数=${n})`);
	return finalEps;
}
function calcDistance(a, b, type) {
	if (type === "center") {
		const ax = a.x + a.width / 2;
		const ay = a.y + a.height / 2;
		const bx = b.x + b.width / 2;
		const by = b.y + b.height / 2;
		return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
	}
	if (type === "edge") {
		const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
		const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
		return Math.sqrt(dx * dx + dy * dy);
	}
	const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width));
	const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.height, b.y + b.height));
	const overlapX = !(a.x + a.width < b.x || b.x + b.width < a.x);
	const overlapY = !(a.y + a.height < b.y || b.y + b.height < a.y);
	if (overlapX && overlapY) return 0;
	if (overlapX) return gapY;
	if (overlapY) return gapX;
	return Math.sqrt(gapX * gapX + gapY * gapY);
}
function dbscan(nodes, options = {}) {
	const opts = {
		...DEFAULT_OPTIONS$1,
		...options
	};
	const n = nodes.length;
	const eps = opts.eps === "auto" ? autoCalculateEps(nodes, opts.distanceType, opts.minPts, opts.autoEpsRatio) : opts.eps;
	if (n === 0) return [];
	if (n === 1) return [[nodes[0]]];
	const distances = [];
	for (let i = 0; i < n; i++) {
		distances[i] = [];
		for (let j = 0; j < n; j++) distances[i][j] = i === j ? 0 : calcDistance(nodes[i], nodes[j], opts.distanceType);
	}
	function getNeighbors(idx) {
		const neighbors = [];
		for (let i = 0; i < n; i++) if (distances[idx][i] <= eps) neighbors.push(i);
		return neighbors;
	}
	const labels = new Array(n).fill(-1);
	const NOISE = -2;
	let clusterId = 0;
	for (let i = 0; i < n; i++) {
		if (labels[i] !== -1) continue;
		const neighbors = getNeighbors(i);
		if (neighbors.length < opts.minPts) {
			labels[i] = NOISE;
			continue;
		}
		labels[i] = clusterId;
		const seedSet = neighbors.filter((idx) => idx !== i);
		for (let j = 0; j < seedSet.length; j++) {
			const q = seedSet[j];
			if (labels[q] === NOISE) labels[q] = clusterId;
			if (labels[q] !== -1) continue;
			labels[q] = clusterId;
			const qNeighbors = getNeighbors(q);
			if (qNeighbors.length >= opts.minPts) {
				for (const neighbor of qNeighbors) if (!seedSet.includes(neighbor)) seedSet.push(neighbor);
			}
		}
		clusterId++;
	}
	const clusters = [];
	const noiseCluster = [];
	for (let i = 0; i < n; i++) if (labels[i] === NOISE) noiseCluster.push(nodes[i]);
	else {
		if (!clusters[labels[i]]) clusters[labels[i]] = [];
		clusters[labels[i]].push(nodes[i]);
	}
	const result = clusters.filter((c) => c && c.length > 0);
	noiseCluster.forEach((node) => result.push([node]));
	console.log(`[DBSCAN] 聚类完成: ${result.length} 个聚类 (eps=${eps}, minPts=${opts.minPts})`);
	return result;
}
function clusterWithDBSCAN(leaves, options = {}) {
	if (leaves.length === 0) return createRootNode$1([]);
	return createRootNode$1(dbscan(leaves, options).map((cluster) => {
		if (cluster.length === 1) return cluster[0];
		return createGroup$1(cluster);
	}));
}
function createGroup$1(children) {
	const bounds = calcBounds$4(children);
	const isRow = isHorizontalLayout(children);
	return {
		id: buildVgId(children, bounds, isRow ? "row" : "column"),
		name: isRow ? "Row Group" : "Column Group",
		type: "VIRTUAL_GROUP",
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		area: bounds.width * bounds.height,
		depth: 0,
		zIndex: 0,
		renderOrder: 0,
		children: children.map((c, i) => ({
			...c,
			depth: 1,
			renderOrder: i
		})),
		layout: {
			display: "flex",
			flexDirection: isRow ? "row" : "column"
		}
	};
}
function isHorizontalLayout(nodes) {
	if (nodes.length <= 1) return true;
	let minX = Infinity, maxX = -Infinity;
	let minY = Infinity, maxY = -Infinity;
	nodes.forEach((n) => {
		minX = Math.min(minX, n.x);
		maxX = Math.max(maxX, n.x + n.width);
		minY = Math.min(minY, n.y);
		maxY = Math.max(maxY, n.y + n.height);
	});
	return maxX - minX >= maxY - minY;
}
function createRootNode$1(children) {
	const bounds = children.length > 0 ? calcBounds$4(children) : {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	return {
		id: "dbscan-root",
		name: "Root",
		type: "FRAME",
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		area: bounds.width * bounds.height,
		depth: 0,
		zIndex: 0,
		renderOrder: 0,
		children: children.map((c, i) => ({
			...c,
			renderOrder: i
		}))
	};
}
function calcBounds$4(nodes) {
	if (nodes.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	nodes.forEach((n) => {
		minX = Math.min(minX, n.x);
		minY = Math.min(minY, n.y);
		maxX = Math.max(maxX, n.x + n.width);
		maxY = Math.max(maxY, n.y + n.height);
	});
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
var DEFAULT_OPTIONS = {
	gapThresholdX: 50,
	gapThresholdY: 30,
	minClusterSize: 2,
	requireAlignment: true
};
function clusterLeaves(leaves, options = {}) {
	const opts = {
		...DEFAULT_OPTIONS,
		...options
	};
	if (leaves.length === 0) return createRootNode([]);
	if (leaves.length === 1) return createRootNode(leaves);
	console.log(`[ClusterNew] 开始聚类 ${leaves.length} 个叶子节点`);
	const rows = findRows(leaves, opts.gapThresholdY);
	console.log(`[ClusterNew] 找到 ${rows.length} 行`);
	const rootChildren = rows.map((row) => clusterRow(row, opts)).flat();
	console.log(`[ClusterNew] 聚类完成: ${rootChildren.length} 个顶层节点`);
	return createRootNode(rootChildren);
}
function findRows(nodes, gapThreshold) {
	if (nodes.length === 0) return [];
	const sorted = [...nodes].sort((a, b) => a.y - b.y);
	const rows = [];
	let currentRow = [sorted[0]];
	let rowBottom = sorted[0].y + sorted[0].height;
	for (let i = 1; i < sorted.length; i++) {
		const node = sorted[i];
		if (node.y < rowBottom + gapThreshold) {
			currentRow.push(node);
			rowBottom = Math.max(rowBottom, node.y + node.height);
		} else {
			rows.push(currentRow);
			currentRow = [node];
			rowBottom = node.y + node.height;
		}
	}
	if (currentRow.length > 0) rows.push(currentRow);
	return rows;
}
function clusterRow(row, opts) {
	if (row.length <= 1) return row;
	const sorted = [...row].sort((a, b) => a.x - b.x);
	const clusters = [];
	let currentCluster = [sorted[0]];
	for (let i = 1; i < sorted.length; i++) {
		const node = sorted[i];
		const prevNode = currentCluster[currentCluster.length - 1];
		if (node.x - (prevNode.x + prevNode.width) <= opts.gapThresholdX) currentCluster.push(node);
		else {
			clusters.push(currentCluster);
			currentCluster = [node];
		}
	}
	if (currentCluster.length > 0) clusters.push(currentCluster);
	return clusters.map((cluster) => {
		if (cluster.length === 1) return cluster[0];
		if (cluster.length < opts.minClusterSize) return cluster.length === 1 ? cluster[0] : createGroup(cluster, "row");
		return createGroup(cluster, "row");
	});
}
function createGroup(children, type) {
	const bounds = calcBounds$3(children);
	return {
		id: buildVgId(children, bounds, type),
		name: type === "row" ? "Row Group" : "Column Group",
		type: "VIRTUAL_GROUP",
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		area: bounds.width * bounds.height,
		depth: 0,
		zIndex: 0,
		renderOrder: 0,
		children: children.map((c, i) => ({
			...c,
			depth: 1,
			renderOrder: i
		})),
		layout: {
			display: "flex",
			flexDirection: type
		}
	};
}
function createRootNode(children) {
	const bounds = children.length > 0 ? calcBounds$3(children) : {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	return {
		id: "cluster-root",
		name: "Root",
		type: "FRAME",
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		area: bounds.width * bounds.height,
		depth: 0,
		zIndex: 0,
		renderOrder: 0,
		children: children.map((c, i) => ({
			...c,
			renderOrder: i
		}))
	};
}
function calcBounds$3(nodes) {
	if (nodes.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	nodes.forEach((n) => {
		minX = Math.min(minX, n.x);
		minY = Math.min(minY, n.y);
		maxX = Math.max(maxX, n.x + n.width);
		maxY = Math.max(maxY, n.y + n.height);
	});
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
function clusterWithinContainers(node, options = {}) {
	const { algorithm = "dbscan", dbscanEps = "auto", ...clusterOpts } = options;
	function process(n) {
		if (!n.children || n.children.length === 0) return n;
		if (PRESERVE_TYPES.has(n.type)) return {
			...n,
			children: n.children.map((child) => process(child))
		};
		const leafChildren = [];
		const containerChildren = [];
		n.children.forEach((child) => {
			if (LEAF_TYPES$2.has(child.type)) leafChildren.push(child);
			else if (!child.children || child.children.length === 0) leafChildren.push(child);
			else containerChildren.push(process(child));
		});
		let clusteredLeaves = [];
		if (leafChildren.length > 1) {
			let clustered;
			if (algorithm === "dbscan") clustered = clusterWithDBSCAN(leafChildren, {
				eps: dbscanEps,
				minPts: 2,
				distanceType: "gap"
			});
			else clustered = clusterLeaves(leafChildren, clusterOpts);
			clusteredLeaves = clustered.children || [];
			if (clusteredLeaves.length === 1 && clusteredLeaves[0].type === "VIRTUAL_GROUP" && clusteredLeaves[0].children?.length === leafChildren.length) clusteredLeaves = clusteredLeaves[0].children || [];
		} else clusteredLeaves = leafChildren;
		return {
			...n,
			children: [...clusteredLeaves, ...containerChildren]
		};
	}
	return process(node);
}
function placeContainerById(root, template, originalChildIds) {
	if (!root.children || root.children.length === 0) return false;
	const childIdSet = new Set(originalChildIds);
	const victims = [];
	const remaining = [];
	for (const child of root.children) (childIdSet.has(child.id) ? victims : remaining).push(child);
	if (victims.length === 0) return false;
	const container = {
		...template,
		children: victims
	};
	root.children = [...remaining, container];
	return true;
}
function calcBounds$2(nodes) {
	if (nodes.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const n of nodes) {
		minX = Math.min(minX, n.x);
		minY = Math.min(minY, n.y);
		maxX = Math.max(maxX, n.x + n.width);
		maxY = Math.max(maxY, n.y + n.height);
	}
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
function placeVirtualGroupById(root, template, originalChildIds) {
	if (!root.children || root.children.length === 0) return false;
	const childIdSet = new Set(originalChildIds);
	const victims = [];
	const remaining = [];
	for (const child of root.children) if (childIdSet.has(child.id)) victims.push(child);
	else if (child.type === "VIRTUAL_GROUP" && child.children?.some((gc) => childIdSet.has(gc.id))) victims.push(child);
	else remaining.push(child);
	if (victims.length < 2 || victims.length < originalChildIds.length / 2) return false;
	const bounds = calcBounds$2(victims);
	const virtualGroup = {
		id: `rel-${template.id}`,
		name: `RelGroup ${template.name || template.id}`,
		type: "VIRTUAL_GROUP",
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		area: bounds.width * bounds.height,
		depth: template.depth ?? 0,
		zIndex: 0,
		renderOrder: 0,
		children: victims,
		originalLayoutMode: template.originalLayoutMode
	};
	root.children = [...remaining, virtualGroup];
	return true;
}
function filterAndPropagate(layers, shouldKeep) {
	const containerMap = /* @__PURE__ */ new Map();
	for (const layer of layers) for (const c of layer) containerMap.set(c.node.id, c);
	const all = layers.flat().sort((a, b) => b.originalDepth - a.originalDepth);
	const filteredIds = /* @__PURE__ */ new Set();
	const removedList = [];
	for (const c of all) {
		if (shouldKeep(c)) continue;
		filteredIds.add(c.node.id);
		removedList.push(c);
		if (c.parentContainerId && containerMap.has(c.parentContainerId)) {
			const parent = containerMap.get(c.parentContainerId);
			const idx = parent.originalChildIds.indexOf(c.node.id);
			if (idx >= 0) parent.originalChildIds.splice(idx, 1, ...c.originalChildIds);
		}
	}
	if (filteredIds.size === 0) return {
		kept: layers,
		removed: []
	};
	const result = [];
	for (const layer of layers) {
		const kept = layer.filter((c) => !filteredIds.has(c.node.id));
		if (kept.length > 0) result.push(kept);
	}
	return {
		kept: result,
		removed: removedList
	};
}
function placeRelGroupsRecursive(root, removedContainers) {
	for (const { node: template, originalChildIds } of removedContainers) tryPlaceVirtualGroupDeep(root, template, originalChildIds);
}
function tryPlaceVirtualGroupDeep(node, template, originalChildIds) {
	if (!node.children || node.children.length === 0) return false;
	if (placeVirtualGroupById(node, template, originalChildIds)) return true;
	for (const child of node.children) if (child.children && child.children.length > 0) {
		if (tryPlaceVirtualGroupDeep(child, template, originalChildIds)) return true;
	}
	return false;
}
function clusterUncoveredNodes(root, options) {
	const { clusterAlgorithm = "dbscan", dbscanEps = "auto", gapThresholdX = 50, gapThresholdY = 30, minClusterSize = 2 } = options;
	function processNode$1(node) {
		if (!node.children || node.children.length < 2) return;
		for (const child of node.children) if (child.children && child.children.length > 0) processNode$1(child);
		const loose = [];
		const kept = [];
		for (const child of node.children) (child.children && child.children.length > 0 ? kept : loose).push(child);
		if (loose.length < minClusterSize) return;
		const clustered = clusterAlgorithm === "dbscan" ? clusterWithDBSCAN(loose, {
			eps: dbscanEps,
			minPts: 2,
			distanceType: "gap"
		}) : clusterLeaves(loose, {
			gapThresholdX,
			gapThresholdY,
			minClusterSize
		});
		node.children = [...kept, ...clustered.children || loose];
		node.children.sort((a, b) => a.y - b.y || a.x - b.x);
	}
	processNode$1(root);
}
function sortChildrenByPosition(node) {
	if (!node.children || node.children.length === 0) return;
	for (const child of node.children) sortChildrenByPosition(child);
	if (node.children.length >= 2) node.children.sort((a, b) => a.y - b.y || a.x - b.x);
}
function recoverContainersLayered(root, layers, options) {
	const result = JSON.parse(JSON.stringify(root));
	const { containerRecoveryMode = "styled-only" } = options;
	if (containerRecoveryMode === "none") {
		for (let i = layers.length - 1; i >= 0; i--) for (const { node: template, originalChildIds } of layers[i]) placeVirtualGroupById(result, template, originalChildIds);
		sortChildrenByPosition(result);
		clusterUncoveredNodes(result, options);
		return result;
	}
	let layersToRecover = layers;
	let removedContainers = [];
	if (containerRecoveryMode === "styled-only") {
		const filterResult = filterAndPropagate(layers.map((layer) => layer.map((c) => ({
			...c,
			node: { ...c.node },
			originalChildIds: [...c.originalChildIds],
			descendantLeafIds: new Set(c.descendantLeafIds)
		}))), (c) => c.hasVisualStyles);
		layersToRecover = filterResult.kept;
		removedContainers = filterResult.removed;
	}
	for (let i = layersToRecover.length - 1; i >= 0; i--) for (const { node: template, originalChildIds } of layersToRecover[i]) placeContainerById(result, template, originalChildIds);
	if (removedContainers.length > 0) placeRelGroupsRecursive(result, removedContainers);
	sortChildrenByPosition(result);
	clusterUncoveredNodes(result, options);
	return result;
}
var MIN_GAP_THRESHOLD$1 = 2;
function detectDirection(children) {
	if (children.length < 2) return "row";
	if (findGapsOnAxis$1(children, "y").length > 0) return "column";
	if (findGapsOnAxis$1(children, "x").length > 0) return "row";
	return detectDirectionFallback(children);
}
function findGapsOnAxis$1(elements, axis) {
	const intervals = elements.map((el) => {
		if (axis === "y") return {
			start: el.y,
			end: el.y + el.height
		};
		else return {
			start: el.x,
			end: el.x + el.width
		};
	});
	intervals.sort((a, b) => a.start - b.start);
	const merged = [];
	for (const interval of intervals) if (merged.length === 0) merged.push({ ...interval });
	else {
		const last = merged[merged.length - 1];
		if (interval.start <= last.end) last.end = Math.max(last.end, interval.end);
		else merged.push({ ...interval });
	}
	const gaps = [];
	for (let i = 1; i < merged.length; i++) {
		const prevEnd = merged[i - 1].end;
		const currStart = merged[i].start;
		if (currStart - prevEnd >= MIN_GAP_THRESHOLD$1) gaps.push({
			start: prevEnd,
			end: currStart
		});
	}
	return gaps;
}
function detectDirectionFallback(children) {
	if (isAllInSameRow(children)) return "row";
	let minX = Infinity, maxX = -Infinity;
	let minY = Infinity, maxY = -Infinity;
	for (const child of children) {
		minX = Math.min(minX, child.x);
		maxX = Math.max(maxX, child.x + child.width);
		minY = Math.min(minY, child.y);
		maxY = Math.max(maxY, child.y + child.height);
	}
	const xRange = maxX - minX;
	if (maxY - minY > xRange * 1.5) return "column";
	return isAllInSameColumn(children) ? "column" : "row";
}
function isAllInSameRow(children) {
	const base = children[0];
	for (let i = 1; i < children.length; i++) if (overlapRatioY(base, children[i]) < .6) return false;
	return true;
}
function isAllInSameColumn(children) {
	const base = children[0];
	for (let i = 1; i < children.length; i++) if (overlapRatioX(base, children[i]) < .6) return false;
	return true;
}
function overlapRatioX(a, b) {
	const aLeft = a.x;
	const aRight = a.x + a.width;
	const bLeft = b.x;
	const bRight = b.x + b.width;
	const overlapStart = Math.max(aLeft, bLeft);
	const overlapEnd = Math.min(aRight, bRight);
	const overlap = Math.max(0, overlapEnd - overlapStart);
	const minWidth = Math.min(a.width, b.width);
	if (minWidth === 0) return 0;
	return overlap / minWidth;
}
function overlapRatioY(a, b) {
	const aTop = a.y;
	const aBottom = a.y + a.height;
	const bTop = b.y;
	const bBottom = b.y + b.height;
	const overlapStart = Math.max(aTop, bTop);
	const overlapEnd = Math.min(aBottom, bBottom);
	const overlap = Math.max(0, overlapEnd - overlapStart);
	const minHeight = Math.min(a.height, b.height);
	if (minHeight === 0) return 0;
	return overlap / minHeight;
}
var TOLERANCE = 2;
function detectAlignment(children, direction, containerHeight, containerWidth) {
	if (children.length < 2) return "flex-start";
	if (direction === "row") return detectAlignmentForRow(children, containerHeight);
	else return detectAlignmentForColumn(children, containerWidth);
}
function detectAlignmentForRow(children, containerHeight) {
	const items = children.map((child) => ({
		top: child.y,
		center: child.y + child.height / 2,
		bottom: child.y + child.height,
		height: child.height
	}));
	const firstTop = items[0].top;
	if (items.every((item) => Math.abs(item.top - firstTop) <= TOLERANCE)) return "flex-start";
	const firstCenter = items[0].center;
	if (items.every((item) => Math.abs(item.center - firstCenter) <= TOLERANCE)) return "center";
	const firstBottom = items[0].bottom;
	if (items.every((item) => Math.abs(item.bottom - firstBottom) <= TOLERANCE)) return "flex-end";
	if (containerHeight && items.every((item) => Math.abs(item.height - containerHeight) <= TOLERANCE)) return "stretch";
	return "flex-start";
}
function detectAlignmentForColumn(children, containerWidth) {
	const items = children.map((child) => ({
		left: child.x,
		center: child.x + child.width / 2,
		right: child.x + child.width,
		width: child.width
	}));
	const firstLeft = items[0].left;
	if (items.every((item) => Math.abs(item.left - firstLeft) <= TOLERANCE)) return "flex-start";
	const firstCenter = items[0].center;
	if (items.every((item) => Math.abs(item.center - firstCenter) <= TOLERANCE)) return "center";
	const firstRight = items[0].right;
	if (items.every((item) => Math.abs(item.right - firstRight) <= TOLERANCE)) return "flex-end";
	if (containerWidth && items.every((item) => Math.abs(item.width - containerWidth) <= TOLERANCE)) return "stretch";
	return "flex-start";
}
var CONTAINER_TYPES$3 = new Set([
	"FRAME",
	"GROUP",
	"INSTANCE",
	"COMPONENT",
	"SECTION"
]);
var BACKGROUND_SHAPE_TYPES$1 = new Set([
	"VECTOR",
	"RECTANGLE",
	"ELLIPSE"
]);
function calcBounds$1(elements) {
	if (elements.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	let minX = Infinity, minY = Infinity;
	let maxX = -Infinity, maxY = -Infinity;
	for (const el of elements) {
		minX = Math.min(minX, el.x);
		minY = Math.min(minY, el.y);
		maxX = Math.max(maxX, el.x + el.width);
		maxY = Math.max(maxY, el.y + el.height);
	}
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
function calcCoverageRatio(element, bounds) {
	const boundsArea = bounds.width * bounds.height;
	if (boundsArea === 0) return 0;
	return Math.max(0, Math.min(element.x + element.width, bounds.x + bounds.width) - Math.max(element.x, bounds.x)) * Math.max(0, Math.min(element.y + element.height, bounds.y + bounds.height) - Math.max(element.y, bounds.y)) / boundsArea;
}
function isFullCoverElement(element, bounds, allElements) {
	if (calcCoverageRatio(element, bounds) < .95) return false;
	const isContainer$1 = CONTAINER_TYPES$3.has(element.type);
	const isBackgroundShape = BACKGROUND_SHAPE_TYPES$1.has(element.type) && (!element.children || element.children.length === 0);
	if (!isContainer$1 && !isBackgroundShape) return false;
	return allElements.some((el) => el.id !== element.id && (el.zIndex ?? 0) > (element.zIndex ?? 0));
}
function isolateFullCoverElements(elements) {
	if (elements.length <= 1) return {
		normal: elements,
		isolated: [],
		hasIsolated: false
	};
	const bounds = calcBounds$1(elements);
	const isolated = [];
	const normal = [];
	for (const element of elements) if (isFullCoverElement(element, bounds, elements)) isolated.push(element);
	else normal.push(element);
	if (normal.length === 0) return {
		normal: elements,
		isolated: [],
		hasIsolated: false
	};
	isolated.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
	return {
		normal,
		isolated,
		hasIsolated: isolated.length > 0
	};
}
function deduplicateSameNameOverlaps(elements) {
	if (elements.length <= 1) return {
		deduplicated: elements,
		removed: [],
		hasRemoved: false
	};
	const removed = [];
	const remainingIds = new Set(elements.map((el) => el.id));
	const nameGroups = /* @__PURE__ */ new Map();
	for (const el of elements) {
		const name = el.name || "";
		if (!nameGroups.has(name)) nameGroups.set(name, []);
		nameGroups.get(name).push(el);
	}
	for (const [name, group] of nameGroups) {
		if (name === "" || group.length <= 1) continue;
		for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
			const a = group[i];
			const b = group[j];
			if (!remainingIds.has(a.id) || !remainingIds.has(b.id)) continue;
			const overlapArea = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
			const smallerArea = Math.min(a.width * a.height, b.width * b.height);
			if ((smallerArea > 0 ? overlapArea / smallerArea : 0) > .5) {
				const toRemove = a.width * a.height > b.width * b.height ? a : b;
				removed.push(toRemove);
				remainingIds.delete(toRemove.id);
			}
		}
	}
	return {
		deduplicated: elements.filter((el) => remainingIds.has(el.id)),
		removed,
		hasRemoved: removed.length > 0
	};
}
function prefilterOverlappingLayers(elements) {
	const dedupeResult = deduplicateSameNameOverlaps(elements);
	const isolateResult = isolateFullCoverElements(dedupeResult.deduplicated);
	return {
		normal: isolateResult.normal,
		removed: dedupeResult.removed,
		isolated: isolateResult.isolated,
		hasChanges: dedupeResult.hasRemoved || isolateResult.hasIsolated
	};
}
function calcBounds(nodes) {
	if (nodes.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	let minX = Infinity, minY = Infinity;
	let maxX = -Infinity, maxY = -Infinity;
	for (const n of nodes) {
		minX = Math.min(minX, n.x);
		minY = Math.min(minY, n.y);
		maxX = Math.max(maxX, n.x + n.width);
		maxY = Math.max(maxY, n.y + n.height);
	}
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
function isSameGeometry(a, b, tolerance = 2) {
	return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance && Math.abs(a.width - b.width) <= tolerance && Math.abs(a.height - b.height) <= tolerance;
}
function absorbFullCoverLayersAsBackground(parent, isolated, normalNodes) {
	if (isolated.length === 0) return isolated;
	if (normalNodes.length === 0) return isolated;
	const parentArea = Math.max(0, (parent.width || 0) * (parent.height || 0));
	if (parentArea === 0) return isolated;
	const normalBounds = calcBounds(normalNodes);
	if (Math.max(0, normalBounds.width * normalBounds.height) / parentArea < .35) return isolated;
	const kept = [];
	for (const layer of isolated) {
		if (!isSameGeometry(layer, parent, 2)) {
			kept.push(layer);
			continue;
		}
		const bgStyles = layer.styles;
		if (!!!(bgStyles?.background || bgStyles?.borderRadius || bgStyles?.border || bgStyles?.boxShadow || typeof bgStyles?.opacity === "number")) {
			if (layer.children && layer.children.length > 0) {
				kept.push(...layer.children);
				console.log(`[splitWithinContainers] 展开无样式全覆盖壳: ${layer.name}(${layer.id}), 提升 ${layer.children.length} 个子节点`);
			}
			continue;
		}
		parent.styles = {
			...bgStyles,
			...parent.styles
		};
		if (!parent.fills && layer.fills) parent.fills = layer.fills;
		if (!parent.strokes && layer.strokes) {
			parent.strokes = layer.strokes;
			parent.strokeWeight = layer.strokeWeight;
			parent.strokeTopWeight = layer.strokeTopWeight;
			parent.strokeLeftWeight = layer.strokeLeftWeight;
			parent.strokeRightWeight = layer.strokeRightWeight;
			parent.strokeBottomWeight = layer.strokeBottomWeight;
		}
		if (!parent.effects && layer.effects) parent.effects = layer.effects;
		if (parent.cornerRadius === void 0 && layer.cornerRadius !== void 0) parent.cornerRadius = layer.cornerRadius;
		if (!parent.borderRadius && layer.borderRadius) parent.borderRadius = layer.borderRadius;
		console.log(`[splitWithinContainers] 吸收全覆盖背景壳: ${layer.name}(${layer.id}) → ${parent.name}(${parent.id})`);
	}
	return kept;
}
var LEAF_TYPES$1 = new Set([
	"TEXT",
	"IMAGE",
	"VECTOR",
	"RECTANGLE",
	"ELLIPSE",
	"LINE",
	"POLYGON",
	"STAR",
	"BOOLEAN_OPERATION",
	"ICON"
]);
function spatiallyContains(outer, inner, tolerance = 2) {
	return inner.x >= outer.x - tolerance && inner.y >= outer.y - tolerance && inner.x + inner.width <= outer.x + outer.width + tolerance && inner.y + inner.height <= outer.y + outer.height + tolerance;
}
function isFullCover(node, parent, threshold = .9) {
	const nodeArea = node.width * node.height;
	const parentArea = parent.width * parent.height;
	if (parentArea === 0) return false;
	return nodeArea / parentArea >= threshold;
}
function canBeContainer(node) {
	if (LEAF_TYPES$1.has(node.type)) return false;
	if (node.children && node.children.length > 0) return true;
	if (node.width < 50 || node.height < 50) return false;
	return true;
}
function regroupByContainment(children, parent) {
	if (children.length <= 1) return children;
	const sorted = [...children].sort((a, b) => {
		const areaA = a.width * a.height;
		return b.width * b.height - areaA;
	});
	const absorbed = /* @__PURE__ */ new Set();
	const containerChildren = /* @__PURE__ */ new Map();
	for (let i = 0; i < sorted.length; i++) {
		const candidate = sorted[i];
		if (absorbed.has(candidate.id)) continue;
		if (!canBeContainer(candidate)) continue;
		if (isFullCover(candidate, parent) && (!candidate.children || candidate.children.length === 0)) continue;
		for (let j = 0; j < sorted.length; j++) {
			if (i === j) continue;
			const inner = sorted[j];
			if (absorbed.has(inner.id)) continue;
			if (spatiallyContains(candidate, inner)) {
				if (!containerChildren.has(candidate.id)) containerChildren.set(candidate.id, []);
				containerChildren.get(candidate.id).push(inner);
				absorbed.add(inner.id);
			}
		}
	}
	if (absorbed.size === 0) return children;
	const result = [];
	const changedIds = /* @__PURE__ */ new Set();
	for (const child of children) {
		if (absorbed.has(child.id)) continue;
		const newKids = containerChildren.get(child.id);
		if (newKids && newKids.length > 0) {
			const existingChildren = child.children || [];
			const merged = {
				...child,
				children: [...existingChildren, ...newKids]
			};
			console.log(`[containmentRegroup] ${child.name}(${child.id}) 吸收了 ${newKids.length} 个节点:`, newKids.map((n) => `${n.name}(${n.id})`).join(", "));
			const innerRegrouped = regroupByContainment(merged.children, merged);
			result.push({
				...merged,
				children: innerRegrouped
			});
			changedIds.add(child.id);
		} else result.push(child);
	}
	return result;
}
var BACKGROUND_SHAPE_TYPES = new Set([
	"VECTOR",
	"RECTANGLE",
	"ELLIPSE",
	"LINE",
	"POLYGON",
	"STAR",
	"BOOLEAN_OPERATION"
]);
function isSameBounds(child, parent, tolerance = 2) {
	return Math.abs(child.x - parent.x) <= tolerance && Math.abs(child.y - parent.y) <= tolerance && Math.abs(child.width - parent.width) <= tolerance && Math.abs(child.height - parent.height) <= tolerance;
}
function getFillTypes(node) {
	return Array.isArray(node.fills) ? node.fills.map((fill) => fill && typeof fill === "object" ? fill.type : void 0).filter((type) => typeof type === "string") : [];
}
function isSyntheticBackgroundCandidate(child, parent) {
	return child.mask !== true && BACKGROUND_SHAPE_TYPES.has(child.type) && isSameBounds(child, parent);
}
function absorbSyntheticBackground(node) {
	const children = node.children?.map(absorbSyntheticBackground) || [];
	if (children.length < 2) return children === node.children ? node : {
		...node,
		children
	};
	const backgroundIndex = children.findIndex((child) => isSyntheticBackgroundCandidate(child, node) && child.imageRole !== "content" && !getFillTypes(child).includes("IMAGE") && !(Array.isArray(child.strokes) && child.strokes.some((s) => s.visible !== false)));
	if (backgroundIndex === -1) return children === node.children ? node : {
		...node,
		children
	};
	const background = children[backgroundIndex];
	const remainingChildren = children.filter((_, index) => index !== backgroundIndex);
	const effectiveFills = foldNodeOpacityIntoFills(background);
	return {
		...node,
		children: remainingChildren,
		fills: (!Array.isArray(node.fills) || node.fills.length === 0) && effectiveFills ? effectiveFills : node.fills,
		strokes: (!Array.isArray(node.strokes) || node.strokes.length === 0) && Array.isArray(background.strokes) && background.strokes.length > 0 ? background.strokes : node.strokes,
		effects: (!Array.isArray(node.effects) || node.effects.length === 0) && Array.isArray(background.effects) && background.effects.length > 0 ? background.effects : node.effects,
		cornerRadius: node.cornerRadius ?? background.cornerRadius,
		borderRadius: node.borderRadius ?? background.borderRadius,
		strokeWeight: node.strokeWeight ?? background.strokeWeight,
		strokeTopWeight: node.strokeTopWeight ?? background.strokeTopWeight,
		strokeRightWeight: node.strokeRightWeight ?? background.strokeRightWeight,
		strokeBottomWeight: node.strokeBottomWeight ?? background.strokeBottomWeight,
		strokeLeftWeight: node.strokeLeftWeight ?? background.strokeLeftWeight
	};
}
function cleanupSplitChildren(children, parent) {
	if (children.length === 0) return children;
	return regroupByContainment(children.map(absorbSyntheticBackground), parent);
}
function detectRegularGrid(parent, children, options = {}) {
	const { minChildren = 3, sizeRelativeTol = .03, sizeAbsoluteTol = 2, gapTol = 2, rowGroupTol = .3 } = options;
	if (!children || children.length < minChildren) return null;
	if (children.some((c) => !(c.width > 0 && c.height > 0))) return null;
	const w0 = children[0].width;
	const h0 = children[0].height;
	const wTol = Math.max(sizeAbsoluteTol, w0 * sizeRelativeTol);
	const hTol = Math.max(sizeAbsoluteTol, h0 * sizeRelativeTol);
	if (children.some((c) => Math.abs(c.width - w0) > wTol || Math.abs(c.height - h0) > hTol)) return null;
	const rowTol = Math.max(2, h0 * rowGroupTol);
	const rowsRaw = [];
	for (const c of [...children].sort((a, b) => a.y - b.y)) {
		const row = rowsRaw.find((r) => Math.abs(r[0].y - c.y) <= rowTol);
		if (row) row.push(c);
		else rowsRaw.push([c]);
	}
	const rows = rowsRaw.map((r) => [...r].sort((a, b) => a.x - b.x));
	if (rows.length < 2) return null;
	const cols = rows[0].length;
	if (cols < 2) return null;
	for (let i = 1; i < rows.length - 1; i++) if (rows[i].length !== cols) return null;
	const lastLen = rows[rows.length - 1].length;
	if (lastLen < 1 || lastLen > cols) return null;
	let colGap = null;
	for (const row of rows) {
		if (row.length < 2) continue;
		for (let i = 1; i < row.length; i++) {
			const gap = row[i].x - (row[i - 1].x + row[i - 1].width);
			if (gap < -gapTol) return null;
			const g = Math.max(0, gap);
			if (colGap === null) colGap = g;
			else if (Math.abs(g - colGap) > gapTol) return null;
		}
	}
	colGap = colGap ?? 0;
	let rowGap = null;
	for (let i = 1; i < rows.length; i++) {
		const gap = rows[i][0].y - (rows[i - 1][0].y + h0);
		if (gap < -gapTol) return null;
		const g = Math.max(0, gap);
		if (rowGap === null) rowGap = g;
		else if (Math.abs(g - rowGap) > gapTol) return null;
	}
	rowGap = rowGap ?? 0;
	for (let c = 0; c < cols; c++) {
		let x0 = null;
		for (const row of rows) {
			if (c >= row.length) continue;
			if (x0 === null) x0 = row[c].x;
			else if (Math.abs(row[c].x - x0) > gapTol) return null;
		}
	}
	if (parent.width > 0) {
		const rowWidth = cols * w0 + (cols - 1) * colGap;
		if (parent.width + gapTol < rowWidth) return null;
	}
	return {
		rows: rows.length,
		cols,
		colGap: Math.round(colGap),
		rowGap: Math.round(rowGap),
		childW: w0,
		childH: h0,
		grid: rows
	};
}
var DEFAULT_MIN_LARGE_GAP = 64;
var MIN_DOMINANCE_RATIO = 2;
var MIN_DOMINANCE_DELTA = 24;
function collectInnerGaps(children, axis) {
	const gaps = [];
	for (let i = 1; i < children.length; i++) {
		const prev = children[i - 1];
		const curr = children[i];
		if (axis === "x") gaps.push(curr.x - (prev.x + prev.width));
		else gaps.push(curr.y - (prev.y + prev.height));
	}
	return gaps;
}
function detectLargeGap(children, axis, options = {}) {
	const { minLargeGap = DEFAULT_MIN_LARGE_GAP } = options;
	if (!children || children.length < 2) return null;
	const gaps = collectInnerGaps(children, axis);
	if (gaps.length === 0) return null;
	const candidates = gaps.map((space, index) => ({
		index,
		space
	})).filter((g) => g.space >= minLargeGap);
	if (candidates.length === 0) return null;
	const sorted = [...candidates].sort((a, b) => b.space - a.space);
	const first = sorted[0];
	const second = sorted[1];
	const twoGapsViable = !!second && second.space * MIN_DOMINANCE_RATIO >= first.space && first.space - second.space <= 100;
	const others = gaps.filter((_, i) => i !== first.index && (!second || i !== second.index));
	const medianOther = others.length > 0 ? median(others) : 0;
	if (!(first.space >= minLargeGap && first.space - medianOther >= MIN_DOMINANCE_DELTA && (medianOther <= 0 || first.space >= medianOther * MIN_DOMINANCE_RATIO))) return null;
	if (twoGapsViable) {
		if (second.space - medianOther >= MIN_DOMINANCE_DELTA && (medianOther <= 0 || second.space >= medianOther * MIN_DOMINANCE_RATIO)) {
			const leftIdx = Math.min(first.index, second.index);
			const rightIdx = Math.max(first.index, second.index);
			return {
				kind: "lmr",
				gapIndices: [leftIdx, rightIdx],
				gapSizes: [gaps[leftIdx], gaps[rightIdx]]
			};
		}
	}
	return {
		kind: "lr",
		gapIndices: [first.index],
		gapSizes: [first.space]
	};
}
function applyLargeGapSemantics(node, sortedChildren, direction, options = {}) {
	if (direction !== "row" && !options.includeColumn) return null;
	if (!node.layout) return null;
	if (!sortedChildren || sortedChildren.length < 2) return null;
	const result = detectLargeGap(sortedChildren, direction === "row" ? "x" : "y", options);
	if (!result) return null;
	node.layout.layoutType = result.kind;
	node.layout.justifyContent = "space-between";
	if (node.layout.gap !== void 0) delete node.layout.gap;
	return result;
}
function median(arr) {
	if (arr.length === 0) return 0;
	const sorted = [...arr].sort((a, b) => a - b);
	const mid = sorted.length >> 1;
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function detectLayoutFallback(parent, sorted, direction, options = {}) {
	const { minOverlapRatio = .3, strongOverlapRatio = .5, minOverlapPairs = 2, crossAxisScatterRatio = .45, duplicateStartEpsilon = 1, minDuplicateStartPairs = 3 } = options;
	if (!sorted || sorted.length < 2) return {
		shouldFallback: false,
		reason: ""
	};
	const axis = direction === "row" ? "x" : "y";
	const sizeKey = direction === "row" ? "width" : "height";
	const crossAxis = direction === "row" ? "y" : "x";
	const crossSizeKey = direction === "row" ? "height" : "width";
	const reasons = [];
	let overlapHits = 0;
	let strongOverlapHits = 0;
	for (let i = 0; i < sorted.length - 1; i++) {
		const a = sorted[i];
		const b = sorted[i + 1];
		const aStart = a[axis];
		const aEnd = aStart + a[sizeKey];
		const bStart = b[axis];
		const bEnd = bStart + b[sizeKey];
		const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
		if (overlap <= 0) continue;
		const minSize = Math.min(a[sizeKey], b[sizeKey]);
		if (minSize <= 0) continue;
		const ratio = overlap / minSize;
		if (ratio >= strongOverlapRatio) {
			strongOverlapHits++;
			overlapHits++;
		} else if (ratio >= minOverlapRatio) overlapHits++;
	}
	if (strongOverlapHits > 0) reasons.push(`overlap-mainAxis(${overlapHits})`);
	else if (overlapHits >= minOverlapPairs) reasons.push(`overlap-mainAxis(${overlapHits})`);
	let dupPairs = 0;
	for (let i = 0; i < sorted.length - 1; i++) for (let j = i + 1; j < sorted.length; j++) if (Math.abs(sorted[i][axis] - sorted[j][axis]) <= duplicateStartEpsilon) dupPairs++;
	if (dupPairs >= minDuplicateStartPairs) reasons.push(`duplicate-start(${dupPairs})`);
	const parentCross = parent[crossSizeKey];
	if (parentCross > 0) {
		const centers = sorted.map((c) => c[crossAxis] + c[crossSizeKey] / 2);
		const mean = centers.reduce((s, v) => s + v, 0) / centers.length;
		const variance = centers.reduce((s, v) => s + (v - mean) ** 2, 0) / centers.length;
		const std = Math.sqrt(variance);
		if (std / parentCross >= crossAxisScatterRatio) {
			if (!sorted.every((c) => c[crossSizeKey] >= parentCross * .8)) reasons.push(`scatter-crossAxis(${(std / parentCross).toFixed(2)})`);
		}
	}
	return {
		shouldFallback: reasons.length > 0,
		reason: reasons.join(",")
	};
}
function applyLayoutFallback(node, sorted, direction, options = {}) {
	const result = detectLayoutFallback(node, sorted, direction, options);
	if (result.shouldFallback && node.layout) {
		node.layout.positioning = "absolute";
		node.layout.positioningReason = result.reason;
	}
	return result;
}
var CONTAINER_TYPES$2 = new Set([
	"FRAME",
	"GROUP",
	"VIRTUAL_GROUP",
	"INSTANCE",
	"COMPONENT"
]);
var SIZE_TOLERANCE = 2;
var GAP_TOLERANCE = 2;
var FILL_TOLERANCE = 2;
function detectEqualFlex(parent, sortedChildren, direction, options = {}) {
	const { sizeTolerance = SIZE_TOLERANCE, gapTolerance = GAP_TOLERANCE, fillTolerance = FILL_TOLERANCE } = options;
	if (!sortedChildren || sortedChildren.length < 2) return null;
	if (!parent.layout) return null;
	if (parent.layout.flexWrap === "wrap") return null;
	if (parent.layout.layoutType === "lr" || parent.layout.layoutType === "lmr") return null;
	if (parent.layout.positioning === "absolute") return null;
	for (const ch of sortedChildren) if (!CONTAINER_TYPES$2.has(ch.type)) return null;
	const sizes = sortedChildren.map((ch) => direction === "row" ? ch.width : ch.height);
	const minSize = Math.min(...sizes);
	const maxSize = Math.max(...sizes);
	if (maxSize - minSize > sizeTolerance) return null;
	const unitSize = (minSize + maxSize) / 2;
	if (unitSize <= 0) return null;
	const gaps = [];
	for (let i = 1; i < sortedChildren.length; i++) {
		const prev = sortedChildren[i - 1];
		const curr = sortedChildren[i];
		const gap = direction === "row" ? curr.x - (prev.x + prev.width) : curr.y - (prev.y + prev.height);
		gaps.push(gap);
	}
	const minGap = Math.min(...gaps);
	const maxGap = Math.max(...gaps);
	if (maxGap - minGap > gapTolerance) return null;
	const uniformGap = Math.round((minGap + maxGap) / 2);
	if (uniformGap < 0) return null;
	const totalChildSpan = unitSize * sortedChildren.length + uniformGap * (sortedChildren.length - 1);
	const firstChild = sortedChildren[0];
	const lastChild = sortedChildren[sortedChildren.length - 1];
	const actualSpan = direction === "row" ? lastChild.x + lastChild.width - firstChild.x : lastChild.y + lastChild.height - firstChild.y;
	if (Math.abs(totalChildSpan - actualSpan) > fillTolerance) return null;
	const parentSize = direction === "row" ? parent.width : parent.height;
	const paddingStart = direction === "row" ? parent.layout.paddingLeft ?? 0 : parent.layout.paddingTop ?? 0;
	const paddingEnd = direction === "row" ? parent.layout.paddingRight ?? 0 : parent.layout.paddingBottom ?? 0;
	const parentContent = parentSize - paddingStart - paddingEnd;
	if (parentContent <= 0) return null;
	if (parentContent - actualSpan > fillTolerance) return null;
	return {
		unitSize: Math.round(unitSize),
		gap: uniformGap,
		count: sortedChildren.length
	};
}
function applyEqualFlex(parent, sortedChildren, result, direction = "row") {
	if (!parent.layout) return;
	parent.layout.layoutType = "equal-flex";
	if (parent.layout.gap === void 0 && result.gap > 0) parent.layout.gap = result.gap;
	for (const ch of sortedChildren) ch.layout = {
		...ch.layout,
		flexGrow: 1,
		flexGrowAxis: direction
	};
}
var DEFAULT_MIN_ASYMMETRY = 32;
var DEFAULT_MAX_CENTER_DELTA = 4;
var DEFAULT_MIN_SIDE_PAD = 16;
function detectJustifyContent(node, sortedChildren, direction, options = {}) {
	if (!node.layout) return null;
	if (!sortedChildren || sortedChildren.length === 0) return null;
	if (node.layout.justifyContent === "space-between") return null;
	if (node.layout.layoutType === "lr" || node.layout.layoutType === "lmr") return null;
	if (node.layout.flexWrap === "wrap") return null;
	if (node.layout.positioning === "absolute") return null;
	const { minAsymmetry = DEFAULT_MIN_ASYMMETRY, maxCenterDelta = DEFAULT_MAX_CENTER_DELTA, minSidePad = DEFAULT_MIN_SIDE_PAD, includeColumn = false } = options;
	if (direction === "column" && !includeColumn) return null;
	let minStart = Infinity;
	let maxEnd = -Infinity;
	for (const ch of sortedChildren) if (direction === "row") {
		minStart = Math.min(minStart, ch.x);
		maxEnd = Math.max(maxEnd, ch.x + ch.width);
	} else {
		minStart = Math.min(minStart, ch.y);
		maxEnd = Math.max(maxEnd, ch.y + ch.height);
	}
	if (!isFinite(minStart)) return null;
	const parentStart = direction === "row" ? node.x : node.y;
	const parentSize = direction === "row" ? node.width : node.height;
	if (parentSize <= 0) return null;
	const startPad = minStart - parentStart;
	const endPad = parentStart + parentSize - maxEnd;
	if (startPad < 0 || endPad < 0) return null;
	if (parentSize - (maxEnd - minStart) <= 0) return null;
	const delta = startPad - endPad;
	if (delta >= minAsymmetry && endPad <= Math.max(startPad * .25, 8)) return {
		kind: "flex-end",
		reason: `startPad=${Math.round(startPad)}, endPad=${Math.round(endPad)}, delta=${Math.round(delta)}`
	};
	if (Math.abs(delta) <= maxCenterDelta && startPad >= minSidePad && endPad >= minSidePad) return {
		kind: "center",
		reason: `startPad=${Math.round(startPad)}, endPad=${Math.round(endPad)} (symmetric)`
	};
	return null;
}
function applyJustifyContent(node, sortedChildren, direction, options = {}) {
	const result = detectJustifyContent(node, sortedChildren, direction, options);
	if (!result) return null;
	if (!node.layout) return null;
	node.layout.justifyContent = result.kind;
	if (direction === "row") {
		if (node.layout.paddingLeft !== void 0) delete node.layout.paddingLeft;
		if (node.layout.paddingRight !== void 0) delete node.layout.paddingRight;
	} else {
		if (node.layout.paddingTop !== void 0) delete node.layout.paddingTop;
		if (node.layout.paddingBottom !== void 0) delete node.layout.paddingBottom;
	}
	return result;
}
var MIN_GAP_THRESHOLD = 2;
var _insideSpanningFallback = false;
var FULL_WIDTH_THRESHOLD = .8;
var FULL_WIDTH_EDGE_TOLERANCE = 4;
function isFullWidthElement(element, bounds) {
	if (bounds.width <= 0) return false;
	if (element.width / bounds.width < FULL_WIDTH_THRESHOLD) return false;
	const leftAligned = Math.abs(element.x - bounds.x) <= FULL_WIDTH_EDGE_TOLERANCE;
	const rightAligned = Math.abs(element.x + element.width - (bounds.x + bounds.width)) <= FULL_WIDTH_EDGE_TOLERANCE;
	return leftAligned && rightAligned;
}
function projectionSplit(elements) {
	if (elements.length === 0) return { type: "empty" };
	if (elements.length === 1) return {
		type: "leaf",
		element: elements[0]
	};
	const yGaps = findGapsOnAxis(elements, "y");
	const xGaps = findGapsOnAxis(elements, "x");
	const hasY = yGaps.length > 0;
	const hasX = xGaps.length > 0;
	if (hasY && hasX) {
		const bestAxis = chooseBestAxis(elements, yGaps, xGaps);
		return buildSplitResult(elements, bestAxis === "y" ? yGaps : xGaps, bestAxis);
	}
	if (hasY) return buildSplitResult(elements, yGaps, "y");
	if (hasX) return buildSplitResult(elements, xGaps, "x");
	const separateResult = trySeparateFullWidthElements(elements);
	if (separateResult) return separateResult;
	if (!_insideSpanningFallback) {
		_insideSpanningFallback = true;
		try {
			const spanResult = trySplitIgnoringSpanning(elements);
			if (spanResult) return spanResult;
		} finally {
			_insideSpanningFallback = false;
		}
	}
	return {
		type: "overlap",
		elements,
		bounds: calcBoundsGeneric(elements)
	};
}
function buildSplitResult(elements, gaps, axis) {
	const groups = splitByGapsGeneric(elements, gaps, axis);
	return {
		type: axis === "y" ? "column" : "row",
		gaps,
		children: groups.map((group) => projectionSplit(group)),
		bounds: calcBoundsGeneric(elements)
	};
}
function chooseBestAxis(elements, yGaps, xGaps) {
	const yGroups = splitByGapsGeneric(elements, yGaps, "y").length;
	const xGroups = splitByGapsGeneric(elements, xGaps, "x").length;
	const diff = Math.abs(xGroups - yGroups);
	if (diff >= 2) return xGroups < yGroups ? "x" : "y";
	if (diff === 0) {
		const yMaxGap = Math.max(...yGaps.map((g) => g.end - g.start));
		if (Math.max(...xGaps.map((g) => g.end - g.start)) > yMaxGap) return "x";
	}
	return "y";
}
function trySeparateFullWidthElements(elements) {
	if (elements.length < 2) return null;
	const bounds = calcBoundsGeneric(elements);
	if (bounds.width <= 0) return null;
	const fullWidthElements = [];
	const normalElements = [];
	for (const el of elements) if (isFullWidthElement(el, bounds)) fullWidthElements.push(el);
	else normalElements.push(el);
	if (fullWidthElements.length === 0 || normalElements.length === 0) return null;
	const normalResult = projectionSplit(normalElements);
	if (normalResult.type === "overlap") return null;
	const allItems = [];
	for (const el of fullWidthElements) allItems.push({
		element: el,
		y: el.y
	});
	const normalBounds = normalResult.bounds || calcBoundsGeneric(normalElements);
	allItems.push({
		result: normalResult,
		y: normalBounds.y
	});
	allItems.sort((a, b) => a.y - b.y);
	return {
		type: "column",
		children: allItems.map((item) => {
			if (item.element) return {
				type: "leaf",
				element: item.element
			};
			else return item.result;
		}),
		bounds
	};
}
function findGapsOnAxis(elements, axis) {
	const intervals = elements.map((el) => {
		if (axis === "y") return {
			start: el.y,
			end: el.y + el.height
		};
		else return {
			start: el.x,
			end: el.x + el.width
		};
	});
	intervals.sort((a, b) => a.start - b.start);
	const merged = [];
	for (const interval of intervals) if (merged.length === 0) merged.push({ ...interval });
	else {
		const last = merged[merged.length - 1];
		if (interval.start <= last.end) last.end = Math.max(last.end, interval.end);
		else merged.push({ ...interval });
	}
	const gaps = [];
	for (let i = 1; i < merged.length; i++) {
		const prevEnd = merged[i - 1].end;
		const currStart = merged[i].start;
		if (currStart - prevEnd >= MIN_GAP_THRESHOLD) gaps.push({
			start: prevEnd,
			end: currStart,
			mid: (prevEnd + currStart) / 2
		});
	}
	return gaps;
}
function splitByGapsGeneric(elements, gaps, axis) {
	const cutPoints = gaps.map((g) => g.mid);
	const sorted = [...elements].sort((a, b) => axis === "y" ? a.y - b.y : a.x - b.x);
	const groups = [];
	let currentGroup = [];
	let cutIndex = 0;
	for (const el of sorted) {
		const elCenter = axis === "y" ? el.y + el.height / 2 : el.x + el.width / 2;
		while (cutIndex < cutPoints.length && elCenter > cutPoints[cutIndex]) {
			if (currentGroup.length > 0) {
				groups.push(currentGroup);
				currentGroup = [];
			}
			cutIndex++;
		}
		currentGroup.push(el);
	}
	if (currentGroup.length > 0) groups.push(currentGroup);
	return groups;
}
function calcBoundsGeneric(elements) {
	if (elements.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	let minX = Infinity, minY = Infinity;
	let maxX = -Infinity, maxY = -Infinity;
	for (const el of elements) {
		minX = Math.min(minX, el.x);
		minY = Math.min(minY, el.y);
		maxX = Math.max(maxX, el.x + el.width);
		maxY = Math.max(maxY, el.y + el.height);
	}
	return {
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY
	};
}
function splitResultToTree(result, idPrefix = "split", options = {}, isRoot = true) {
	if (result.type === "empty" || result.type === "leaf") return result.element ? [result.element] : [];
	if (result.type === "overlap") return result.elements || [];
	const bounds = result.bounds || {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	const children = [];
	(result.children || []).forEach((child, index) => {
		const subResult = splitResultToTree(child, `${idPrefix}-${index}`, options, false);
		if (Array.isArray(subResult)) if (subResult.length <= 1) children.push(...subResult);
		else {
			const groupBounds = calcBoundsGeneric(subResult);
			children.push({
				id: `${idPrefix}-${index}-group`,
				name: `${result.type === "row" ? "Column" : "Row"} Group`,
				type: "VIRTUAL_GROUP",
				x: groupBounds.x,
				y: groupBounds.y,
				width: groupBounds.width,
				height: groupBounds.height,
				area: groupBounds.width * groupBounds.height,
				depth: 0,
				zIndex: 0,
				renderOrder: 0,
				children: subResult
			});
		}
		else children.push(subResult);
	});
	if (children.length === 1) return children[0];
	if (isRoot && options.flattenRootGroup) return children;
	return {
		id: `${idPrefix}-group`,
		name: `${result.type === "row" ? "Row" : "Column"} Group`,
		type: "VIRTUAL_GROUP",
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		area: bounds.width * bounds.height,
		depth: 0,
		zIndex: 0,
		renderOrder: 0,
		children,
		layout: {
			display: "flex",
			flexDirection: result.type
		}
	};
}
function trySplitIgnoringSpanning(elements) {
	if (elements.length < 15) return null;
	const bounds = calcBoundsGeneric(elements);
	const bw = bounds.width;
	const bh = bounds.height;
	if (bw <= 0 || bh <= 0) return null;
	const xCandidates = elements.filter((el) => el.width <= bw * .85 && el.height >= bh * .02);
	const xGaps = xCandidates.length >= 3 && xCandidates.length < elements.length ? findGapsOnAxis(xCandidates, "x") : [];
	const yCandidates = elements.filter((el) => el.height <= bh * .85 && el.width >= bw * .02);
	const yGaps = yCandidates.length >= 3 && yCandidates.length < elements.length ? findGapsOnAxis(yCandidates, "y") : [];
	if (xGaps.length === 0 && yGaps.length === 0) return null;
	const xGroups = xGaps.length > 0 ? splitByGapsGeneric(elements, xGaps, "x") : [];
	const yGroups = yGaps.length > 0 ? splitByGapsGeneric(elements, yGaps, "y") : [];
	const xValid = xGroups.length >= 2 && xGroups.every((g) => g.length > 0);
	const yValid = yGroups.length >= 2 && yGroups.every((g) => g.length > 0);
	if (!xValid && !yValid) return null;
	const SPANNING_MIN_GAP = 15;
	const xLargeEnough = xValid && xGaps.some((g) => g.end - g.start >= SPANNING_MIN_GAP);
	const yLargeEnough = yValid && yGaps.some((g) => g.end - g.start >= SPANNING_MIN_GAP);
	if (!xLargeEnough && !yLargeEnough) return null;
	const axis = xLargeEnough && yLargeEnough ? chooseBestAxis(elements, yGaps, xGaps) : xLargeEnough ? "x" : "y";
	return buildSplitResult(elements, axis === "x" ? xGaps : yGaps, axis);
}
function separateBackgroundNodes(nodes) {
	const backgroundNodes = [];
	const normalNodes = [];
	for (const node of nodes) if (node.imageRole === "background") backgroundNodes.push(node);
	else normalNodes.push(node);
	return {
		backgroundNodes,
		normalNodes
	};
}
function splitWithinContainers(node) {
	if (!node.children || node.children.length === 0) return node;
	const prefilterResult = prefilterOverlappingLayers(node.children.map((child) => splitWithinContainers(child)));
	if (prefilterResult.hasChanges) {
		if (prefilterResult.removed.length > 0) console.log(`[splitWithinContainers] 节点 ${node.id} 移除重复层:`, prefilterResult.removed.map((n) => `${n.name}(${n.id})`).join(", "));
		if (prefilterResult.isolated.length > 0) console.log(`[splitWithinContainers] 节点 ${node.id} 隔离全覆盖层:`, prefilterResult.isolated.map((n) => `${n.name}(${n.id})`).join(", "));
	}
	const { backgroundNodes, normalNodes } = separateBackgroundNodes(prefilterResult.normal);
	if (backgroundNodes.length > 0) console.log(`[splitWithinContainers] 节点 ${node.id} 隔离背景标记层:`, backgroundNodes.map((n) => `${n.name}(${n.id})`).join(", "));
	const keptIsolated = absorbFullCoverLayersAsBackground(node, prefilterResult.isolated, normalNodes);
	const regrouped = regroupByContainment([...normalNodes, ...keptIsolated], node);
	const keptIsolatedIds = new Set(keptIsolated.map((n) => n.id));
	const regroupedNormal = [];
	const regroupedKept = [];
	for (const n of regrouped) if (keptIsolatedIds.has(n.id)) regroupedKept.push(n);
	else regroupedNormal.push(n);
	const readyForSplit = dissolveBridgingGroups(regroupedNormal);
	const allIsolated = [...regroupedKept, ...backgroundNodes];
	const gridMatch = detectRegularGrid(node, readyForSplit);
	let nextChildren;
	if (gridMatch) nextChildren = [...readyForSplit];
	else {
		const splitTree = splitResultToTree(projectionSplit(readyForSplit), `split-${node.id}`);
		nextChildren = Array.isArray(splitTree) ? splitTree : [splitTree];
		nextChildren = cleanupSplitChildren(nextChildren, node);
	}
	if (allIsolated.length > 0) {
		allIsolated.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
		nextChildren = [...allIsolated, ...nextChildren];
	}
	if (nextChildren.length === 1 && nextChildren[0].type === "VIRTUAL_GROUP") {
		const vg = nextChildren[0];
		if (vg.layout) node.layout = {
			...node.layout,
			...vg.layout
		};
		if (vg.styles && Object.keys(vg.styles).length > 0) node.styles = {
			...vg.styles,
			...node.styles
		};
		if (vg.fills && !node.fills) node.fills = vg.fills;
		if (vg.cornerRadius !== void 0 && node.cornerRadius === void 0) node.cornerRadius = vg.cornerRadius;
		if (vg.borderRadius && !node.borderRadius) node.borderRadius = vg.borderRadius;
		if (vg.strokes && !node.strokes) node.strokes = vg.strokes;
		if (vg.strokeWeight !== void 0 && node.strokeWeight === void 0) node.strokeWeight = vg.strokeWeight;
		if (vg.extractedBackgroundId && !node.extractedBackgroundId) node.extractedBackgroundId = vg.extractedBackgroundId;
		nextChildren = vg.children || [];
	}
	return {
		...node,
		children: nextChildren
	};
}
var CONTAINER_TYPES$1 = new Set([
	"FRAME",
	"GROUP",
	"VIRTUAL_GROUP",
	"INSTANCE",
	"COMPONENT"
]);
var LEAF_TYPES = new Set([
	"TEXT",
	"IMAGE",
	"ICON",
	"VECTOR",
	"PATH",
	"RECTANGLE",
	"ELLIPSE",
	"LINE",
	"POLYGON",
	"STAR",
	"BOOLEAN_OPERATION"
]);
function applyLayout(root, opts = {}) {
	traverseAndApply(root, opts);
}
function traverseAndApply(node, opts = {}) {
	if (node.children && node.children.length > 0) node.children.forEach((child) => traverseAndApply(child, opts));
	if (!shouldProcessNode(node)) return;
	const grid = detectRegularGrid(node, [...node.children].sort((a, b) => a.y - b.y || a.x - b.x));
	if (grid) {
		const alignItems$1 = detectAlignment(node.children, "row", node.height, node.width);
		const gapFields = grid.rowGap === grid.colGap ? { gap: grid.rowGap } : {
			rowGap: grid.rowGap,
			columnGap: grid.colGap
		};
		const paddingFields = {};
		if (node.children.every((c) => typeof c.x === "number" && typeof c.y === "number" && typeof c.width === "number" && typeof c.height === "number")) {
			const minX = Math.min(...node.children.map((c) => c.x));
			const maxR = Math.max(...node.children.map((c) => c.x + c.width));
			const minY = Math.min(...node.children.map((c) => c.y));
			const maxB = Math.max(...node.children.map((c) => c.y + c.height));
			const pl = Math.round(minX - node.x);
			const pr = Math.round(node.x + node.width - maxR);
			const pt = Math.round(minY - node.y);
			const pb = Math.round(node.y + node.height - maxB);
			if (pt > 0) paddingFields.paddingTop = pt;
			if (pr > 0) paddingFields.paddingRight = pr;
			if (pb > 0) paddingFields.paddingBottom = pb;
			if (pl > 0) paddingFields.paddingLeft = pl;
		}
		node.layout = {
			...node.layout,
			display: "flex",
			flexDirection: "row",
			flexWrap: "wrap",
			layoutType: "grid-wrap",
			...alignItems$1 ? { alignItems: alignItems$1 } : {},
			...gapFields,
			...paddingFields
		};
		return;
	}
	const direction = node.originalLayoutMode === "VERTICAL" ? "column" : node.originalLayoutMode === "HORIZONTAL" ? "row" : detectDirection(node.children);
	const isRow = direction === "row";
	const alignItems = detectAlignment(node.children, direction, node.height, node.width);
	const sorted = [...node.children].sort((a, b) => isRow ? a.x - b.x : a.y - b.y);
	const spacing = analyzeChildSpacing(node, sorted, isRow);
	node.layout = {
		display: "flex",
		flexDirection: direction,
		alignItems,
		...spacing.useGap && spacing.gap > 0 ? { gap: spacing.gap } : {},
		...spacing.padding.top > 0 ? { paddingTop: Math.round(spacing.padding.top) } : {},
		...spacing.padding.right > 0 ? { paddingRight: Math.round(spacing.padding.right) } : {},
		...spacing.padding.bottom > 0 ? { paddingBottom: Math.round(spacing.padding.bottom) } : {},
		...spacing.padding.left > 0 ? { paddingLeft: Math.round(spacing.padding.left) } : {}
	};
	let prevChild = null;
	for (const child of sorted) {
		const margins = calcChildMargins(child, node, prevChild, isRow, spacing.useGap, spacing.gap, spacing.padding, alignItems);
		const mt = Math.round(margins.marginTop);
		const ml = Math.round(margins.marginLeft);
		if (mt !== 0 || ml !== 0) child.layout = {
			...child.layout,
			...mt !== 0 ? { marginTop: mt } : {},
			...ml !== 0 ? { marginLeft: ml } : {}
		};
		prevChild = child;
	}
	if (opts.largeGapSemantics) applyLargeGapSemantics(node, sorted, direction);
	if (opts.justifyContent && node.layout?.layoutType !== "lr" && node.layout?.layoutType !== "lmr") applyJustifyContent(node, sorted, direction);
	if (opts.equalFlex) {
		const equal = detectEqualFlex(node, sorted, direction);
		if (equal) applyEqualFlex(node, sorted, equal, direction);
	}
	if (opts.layoutFallback) applyLayoutFallback(node, sorted, direction);
}
function shouldProcessNode(node) {
	if (!node.children || node.children.length === 0) return false;
	if (LEAF_TYPES.has(node.type)) return false;
	if (CONTAINER_TYPES$1.has(node.type)) return true;
	return true;
}
function dissolveBridgingGroups(children) {
	if (children.length < 3) return children;
	if (findGapsOnAxis(children, "x").length > 0 || findGapsOnAxis(children, "y").length > 0) return children;
	let result = [...children];
	for (let i = 0; i < result.length; i++) {
		const child = result[i];
		if (!(child.type === "VIRTUAL_GROUP" && child.id.startsWith("vg-")) || !child.children?.length) continue;
		const minX = Math.min(...result.map((c) => c.x));
		const maxR = Math.max(...result.map((c) => c.x + c.width));
		const minY = Math.min(...result.map((c) => c.y));
		const maxB = Math.max(...result.map((c) => c.y + c.height));
		const spanW = maxR - minX;
		const spanH = maxB - minY;
		if (spanW > 0 && child.width / spanW < .5 && spanH > 0 && child.height / spanH < .5) continue;
		const dissolved = [
			...result.slice(0, i),
			...child.children,
			...result.slice(i + 1)
		];
		if (wouldRevealGaps(dissolved)) {
			console.log(`[dissolveBridging] 拆解桥接组 ${child.name}(${child.id})，子节点 ${child.children.length} 个打散回父级`);
			result = dissolved;
			i = -1;
		}
	}
	return result;
}
function wouldRevealGaps(elements) {
	if (findGapsOnAxis(elements, "x").length > 0 || findGapsOnAxis(elements, "y").length > 0) return true;
	const minX = Math.min(...elements.map((c) => c.x));
	const maxR = Math.max(...elements.map((c) => c.x + c.width));
	const minY = Math.min(...elements.map((c) => c.y));
	const maxB = Math.max(...elements.map((c) => c.y + c.height));
	const bw = maxR - minX;
	const bh = maxB - minY;
	if (bw <= 0 || bh <= 0) return false;
	const xCandidates = elements.filter((el) => el.width <= bw * .85 && el.height >= bh * .02);
	if (xCandidates.length >= 3 && xCandidates.length < elements.length) {
		if (findGapsOnAxis(xCandidates, "x").length > 0) return true;
	}
	const yCandidates = elements.filter((el) => el.height <= bh * .85 && el.width >= bw * .02);
	if (yCandidates.length >= 3 && yCandidates.length < elements.length) {
		if (findGapsOnAxis(yCandidates, "y").length > 0) return true;
	}
	return false;
}
function convertTextStyles(input) {
	const result = {};
	const textInfo = input.textData?.text?.[0];
	const fontSize = textInfo?.fontSize || input.fontSize;
	if (fontSize) result.fontSize = `${Math.round(fontSize)}px`;
	if (textInfo?.fontWeight) result.fontWeight = textInfo.fontWeight;
	else if (input.fontName?.style) result.fontWeight = inferFontWeight(input.fontName.style);
	const lineHeightObj = input.lineHeight;
	const textLineHeight = typeof textInfo?.lineHeight === "string" ? parseFloat(textInfo.lineHeight) : textInfo?.lineHeight;
	const alignVertical = textInfo?.alignVertical;
	if (fontSize) {
		const isMultiLine = input.baselineCount !== void 0 ? input.baselineCount > 1 : false;
		const baselineLineHeightPx = getBaselineLineHeightPx(input);
		if (isMultiLine && typeof baselineLineHeightPx === "number" && baselineLineHeightPx > 0) result.lineHeight = `${Math.round(baselineLineHeightPx)}px`;
		else if (textLineHeight && textLineHeight > 0) if (textLineHeight <= 10) result.lineHeight = textLineHeight.toFixed(1);
		else result.lineHeight = (textLineHeight / fontSize).toFixed(1);
		else if (lineHeightObj?.value && lineHeightObj.value > 0) if (lineHeightObj.units === "RAW" || lineHeightObj.units === "PERCENT") result.lineHeight = (lineHeightObj.units === "PERCENT" ? lineHeightObj.value / 100 : lineHeightObj.value).toFixed(1);
		else if (lineHeightObj.units === "PIXELS") result.lineHeight = (lineHeightObj.value / fontSize).toFixed(1);
		else if (lineHeightObj.value <= 10) result.lineHeight = lineHeightObj.value.toFixed(1);
		else result.lineHeight = (lineHeightObj.value / fontSize).toFixed(1);
	}
	const isSingleLine = input.baselineCount !== void 0 ? input.baselineCount <= 1 : true;
	if (alignVertical === "CENTER" && isSingleLine && typeof input.height === "number" && input.height > 0) result.lineHeight = `${Math.round(input.height)}px`;
	if (textInfo?.letterSpacing) result.letterSpacing = `${Math.round(textInfo.letterSpacing)}px`;
	const textColor = extractTextColor(input, textInfo);
	if (textColor) result.color = textColor;
	const textAlignH = input.textAlignHorizontal?.toUpperCase();
	if (textAlignH === "CENTER") result.textAlign = "center";
	else if (textAlignH === "RIGHT") result.textAlign = "right";
	else if (textAlignH === "JUSTIFIED") result.textAlign = "justify";
	if (textInfo?.textDecorationLine && textInfo.textDecorationLine !== "unset") result.textDecoration = textInfo.textDecorationLine;
	if (textInfo?.textTransform && textInfo.textTransform !== "unset") result.textTransform = textInfo.textTransform;
	return Object.keys(result).length > 0 ? result : void 0;
}
function getBaselineLineHeightPx(input) {
	const baselines = input.textData?.baselines;
	if (!Array.isArray(baselines) || baselines.length === 0) return void 0;
	const values = baselines.map((b) => b?.lineHeight).filter((v) => typeof v === "number" && v > 0);
	if (values.length === 0) return void 0;
	return values.reduce((acc, v) => acc + v, 0) / values.length;
}
function inferFontWeight(style) {
	const lower = style.toLowerCase();
	if (lower.includes("thin") || lower.includes("hairline")) return 100;
	if (lower.includes("extralight") || lower.includes("ultralight")) return 200;
	if (lower.includes("light")) return 300;
	if (lower.includes("regular") || lower.includes("normal")) return 400;
	if (lower.includes("medium")) return 500;
	if (lower.includes("semibold") || lower.includes("demibold")) return 600;
	if (lower.includes("bold") && !lower.includes("extra") && !lower.includes("ultra")) return 700;
	if (lower.includes("extrabold") || lower.includes("ultrabold")) return 800;
	if (lower.includes("black") || lower.includes("heavy")) return 900;
	return 400;
}
function extractTextColor(input, textInfo) {
	if (textInfo?.data?.[0]?.color) return parseColorString(textInfo.data[0].color);
	if (input.fills && input.fills.length > 0) {
		const fill = input.fills.find((f) => f.visible !== false && f.type === "SOLID");
		if (fill?.color) {
			const { r, g, b } = fill.color;
			const opacity = fill.opacity ?? 1;
			const red = Math.round(r * 255);
			const green = Math.round(g * 255);
			const blue = Math.round(b * 255);
			if (opacity === 1) return `rgb(${red}, ${green}, ${blue})`;
			return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
		}
	}
}
function hasVisibleFill(fills) {
	if (!fills || fills.length === 0) return false;
	return fills.some((fill) => fill.visible !== false && (fill.opacity ?? 1) >= .01);
}
function getVisibleStrokeColor(strokes) {
	if (!strokes || strokes.length === 0) return void 0;
	const stroke = strokes.find((s) => s.visible !== false);
	if (!stroke) return void 0;
	if (stroke.type === "SOLID" && stroke.color) {
		const opacity = stroke.opacity ?? 1;
		return figmaColorToRgba(stroke.color, opacity);
	}
	return "currentColor";
}
function extractStyles(node, imagePlaceholder) {
	if (node.mask === true) {
		const fills$1 = node.fills;
		const hasGradientFill = Array.isArray(fills$1) && fills$1.some((fill) => fill.visible !== false && typeof fill.type === "string" && fill.type.startsWith("GRADIENT"));
		if (!(node.imageRole === "background") || hasGradientFill) return;
	}
	const styles = {};
	const fills = node.fills;
	const strokes = node.strokes;
	const hasFill = hasVisibleFill(fills);
	const isLineLike = (node.type === "VECTOR" || node.type === "LINE") && typeof node.width === "number" && typeof node.height === "number" && Math.min(node.width, node.height) <= 4;
	let useStrokeAsFill = false;
	if (node.type !== "TEXT") {
		if (isLineLike && !hasFill) {
			const strokeColor = getVisibleStrokeColor(strokes);
			if (strokeColor) {
				styles.background = strokeColor;
				useStrokeAsFill = true;
			}
		}
		if (!useStrokeAsFill) {
			const background = convertFills(fills, node.id, imagePlaceholder);
			if (background) styles.background = background;
		}
		if (node.type === "ICON") {
			const iconId = node.id?.replace(/[:/]/g, "_") || "icon";
			const iconUrl = imagePlaceholder ? `url("${IMG_PLACEHOLDER}") no-repeat center/cover` : `url("assets/${iconId}.svg") no-repeat center/cover`;
			styles.background = styles.background ? `${iconUrl}, ${styles.background}` : iconUrl;
		}
	}
	if (!useStrokeAsFill) {
		const strokeInfo = {
			weight: node.strokeWeight,
			topWeight: node.strokeTopWeight,
			bottomWeight: node.strokeBottomWeight,
			leftWeight: node.strokeLeftWeight,
			rightWeight: node.strokeRightWeight
		};
		if (hasIndependentBorders(strokeInfo)) {
			const borders = convertIndependentBorders(strokes, strokeInfo);
			if (borders) Object.assign(styles, borders);
		} else {
			const border = convertStrokes(strokes, strokeInfo);
			if (border) styles.border = border;
		}
	}
	const borderRadius = convertCornerRadius({
		cornerRadius: node.cornerRadius,
		borderRadius: node.borderRadius
	});
	if (borderRadius) styles.borderRadius = borderRadius;
	const effects = convertEffects(node.effects);
	if (effects) {
		if (effects.boxShadow) styles.boxShadow = effects.boxShadow;
		if (effects.filter) styles.filter = effects.filter;
		if (effects.backdropFilter) styles.backdropFilter = effects.backdropFilter;
	}
	if (typeof node.opacity === "number" && node.opacity < 1) styles.opacity = node.opacity;
	if (node.type === "TEXT") {
		const textInput = {
			fontName: node.fontName,
			fontSize: node.fontSize,
			height: node.height,
			baselineCount: Array.isArray(node.textData?.baselines) ? node.textData.baselines.length : void 0,
			lineHeight: node.lineHeight,
			textAlignHorizontal: node.textAlignHorizontal,
			characters: node.characters,
			textData: node.textData,
			fills: node.fills
		};
		const textStyles = convertTextStyles(textInput);
		if (textStyles) Object.assign(styles, textStyles);
		const baselineCount = textInput.baselineCount ?? 0;
		const baselineLh = node.textData?.baselines?.[0]?.lineHeight;
		const isSingleLine = baselineCount <= 1 || typeof baselineLh === "number" && baselineLh > 0 && node.height <= baselineLh * 1.5;
		const hasTrailingSpaces = typeof node.characters === "string" && node.characters !== node.characters.trimEnd();
		if (isSingleLine && !hasTrailingSpaces) styles.whiteSpace = "nowrap";
	}
	return Object.keys(styles).length > 0 ? styles : void 0;
}
function applyStylesToTree(root, imagePlaceholder) {
	const processNode$1 = (node) => {
		const extractedStyles = extractStyles(node, imagePlaceholder);
		const newNode = { ...node };
		if (extractedStyles || node.styles) {
			const existing = node.styles || {};
			const bgInvalid = typeof existing.background === "string" && existing.background.includes("assets/");
			const isIconBg = node.type === "ICON" && extractedStyles?.background;
			newNode.styles = {
				...extractedStyles,
				...existing,
				...bgInvalid && extractedStyles?.background ? { background: extractedStyles.background } : {},
				...isIconBg ? { background: extractedStyles.background } : {}
			};
		}
		if (node.children && node.children.length > 0) newNode.children = node.children.map(processNode$1);
		return newNode;
	};
	return processNode$1(root);
}
function parseAlpha(value) {
	if (!value) return null;
	const lower = value.toLowerCase().trim();
	const NUM = "\\s*[\\d.]+\\s*";
	const PCT = "\\s*[\\d.]+%?\\s*";
	const mRgba = lower.match(/* @__PURE__ */ new RegExp(`^rgba\\(${NUM},${NUM},${NUM},\\s*([\\d.]+)\\s*\\)$`));
	if (mRgba) {
		const a = parseFloat(mRgba[1]);
		if (!Number.isNaN(a)) return a;
	}
	if ((/* @__PURE__ */ new RegExp(`^rgb\\(${NUM},${NUM},${NUM}\\)$`)).test(lower)) return 1;
	const mHsla = lower.match(/* @__PURE__ */ new RegExp(`^hsla\\(${PCT},${PCT},${PCT},\\s*([\\d.]+)\\s*\\)$`));
	if (mHsla) {
		const a = parseFloat(mHsla[1]);
		if (!Number.isNaN(a)) return a;
	}
	if ((/* @__PURE__ */ new RegExp(`^hsl\\(${PCT},${PCT},${PCT}\\)$`)).test(lower)) return 1;
	if (/^#([0-9a-f]{2}){4}$/.test(lower)) return parseInt(lower.slice(7, 9), 16) / 255;
	if (/^#[0-9a-f]{3,8}$/.test(lower)) return 1;
	return null;
}
function coversPage(node, root, ratio) {
	if (root.width <= 0 || root.height <= 0) return false;
	const wRatio = node.width / root.width;
	const hRatio = node.height / root.height;
	return wRatio >= ratio && hRatio >= ratio;
}
function isVisualOnly(node) {
	if ((node.children?.length ?? 0) === 0) return true;
	return node.type === "RECTANGLE" || node.type === "IMAGE" || node.type === "ELLIPSE";
}
function hasShadow(node) {
	return !!node.styles?.boxShadow;
}
function hasBackground(node) {
	return !!node.styles?.background;
}
function classifyChild(child, root, options = {}) {
	const { backgroundCoverRatio = .95, overlayMaxWidthRatio = .85, backdropMaxAlpha = .7, drawerMinHeightRatio = .8, edgeEpsilon = 2, footerBarMaxHeightRatio = .25, footerBarMinWidthRatio = .9 } = options;
	if (child.componentRole === "dialog") return {
		region: "overlay",
		reason: "componentRole=dialog"
	};
	if (coversPage(child, root, backgroundCoverRatio)) {
		const alpha = parseAlpha(child.styles?.background);
		if (alpha !== null && alpha > 0 && alpha <= backdropMaxAlpha) return {
			region: "overlay",
			reason: `backdrop(alpha=${alpha.toFixed(2)})`
		};
		if (isVisualOnly(child) || alpha === 1 || alpha === null) return {
			region: "background",
			reason: "fullPage"
		};
	}
	const rw = Math.max(root.width, 1);
	const rh = Math.max(root.height, 1);
	const wRatio = child.width / rw;
	const hRatio = child.height / rh;
	const touchesLeft = Math.abs(child.x - root.x) <= edgeEpsilon;
	const touchesRight = Math.abs(child.x + child.width - (root.x + root.width)) <= edgeEpsilon;
	const touchesTop = Math.abs(child.y - root.y) <= edgeEpsilon;
	const touchesBottom = Math.abs(child.y + child.height - (root.y + root.height)) <= edgeEpsilon;
	if ((touchesLeft || touchesRight) && hRatio >= drawerMinHeightRatio && wRatio < overlayMaxWidthRatio && hasShadow(child) && hasBackground(child)) return {
		region: "drawer",
		reason: `drawer-${touchesLeft ? "left" : "right"}(w=${Math.round(wRatio * 100)}%,h=${Math.round(hRatio * 100)}%)`
	};
	if (touchesBottom && !touchesTop && wRatio >= footerBarMinWidthRatio && hRatio <= footerBarMaxHeightRatio && (hasShadow(child) || hasBackground(child) || (child.children?.length ?? 0) > 0)) return {
		region: "footerBar",
		reason: `footerBar(h=${Math.round(hRatio * 100)}%)`
	};
	if (wRatio < overlayMaxWidthRatio && hasShadow(child) && hasBackground(child)) return {
		region: "overlay",
		reason: `floatPanel(w=${Math.round(wRatio * 100)}%,shadow+bg)`
	};
	return {
		region: "main",
		reason: "default"
	};
}
function classifyPageRegions(root, options = {}) {
	const stats = {
		background: 0,
		main: 0,
		overlay: 0,
		drawer: 0,
		footerBar: 0
	};
	const children = root.children ?? [];
	if (children.length === 0) return stats;
	for (const child of children) {
		if (child.pageRegion) {
			stats[child.pageRegion]++;
			continue;
		}
		const hit = classifyChild(child, root, options);
		child.pageRegion = hit.region;
		child.pageRegionReason = hit.reason;
		stats[hit.region]++;
	}
	return stats;
}
var NUM_ATOM = String.raw`[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
var UNIT_SUFFIX = String.raw`(?:%|‰|[kKmMbBwW]|万|千|亿|元|円|¥|\$|€|£|円|RMB|USD|EUR)?`;
var CURRENCY_PREFIX = String.raw`(?:¥|\$|€|£|HK\$|US\$|RMB|USD|EUR)`;
var CORE_NUMBER = /* @__PURE__ */ new RegExp(`^${NUM_ATOM}\\s*${UNIT_SUFFIX}$`);
var CURRENCY_LED = /* @__PURE__ */ new RegExp(`^${CURRENCY_PREFIX}\\s*${NUM_ATOM}\\s*${UNIT_SUFFIX}$`);
var PERCENT_ONLY = /^[-+]?\d+(?:\.\d+)?\s*[%‰]$/;
var SCIENTIFIC = /^[-+]?\d+(?:\.\d+)?[eE][-+]?\d+$/;
var TEMPERATURE = /* @__PURE__ */ new RegExp(`^${NUM_ATOM}\\s*(?:°[CF]?|℃|℉)$`);
var CLOCK_TIME = /^\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM|am|pm|上午|下午))?$/;
var DATE_LIKE = /^(?:\d{2,4}[-/.]\d{1,2}[-/.]\d{1,4})$/;
var COMPARATOR_PREFIX = /* @__PURE__ */ new RegExp(`^(?:>=|<=|>|<|≥|≤|~|约)\\s*${NUM_ATOM}\\s*${UNIT_SUFFIX}$`);
var PAREN_NEGATIVE = /* @__PURE__ */ new RegExp(`^\\(\\s*-?${NUM_ATOM}\\s*\\)$`);
var DURATION = /^(?:\d+(?:\.\d+)?\s*(?:h|hr|hrs|m|min|s|sec|ms|时|分|秒)\s*)+$/i;
function isRange(text) {
	const m = text.match(/^(.+?)\s*(?:-|~|–|—|to|至)\s*(.+)$/i);
	if (!m) return false;
	const [, a, b] = m;
	return isNumericAtom(a.trim()) && isNumericAtom(b.trim());
}
function isNumericAtom(part) {
	if (!part) return false;
	if (CORE_NUMBER.test(part)) return true;
	if (PERCENT_ONLY.test(part)) return true;
	if (CURRENCY_LED.test(part)) return true;
	if (SCIENTIFIC.test(part)) return true;
	if (TEMPERATURE.test(part)) return true;
	return false;
}
function looksLikeNumber(rawText) {
	if (!rawText) return false;
	const text = String(rawText).trim();
	if (text.length === 0) return false;
	if (text.length > 32) return false;
	if (CORE_NUMBER.test(text)) return true;
	if (PERCENT_ONLY.test(text)) return true;
	if (CURRENCY_LED.test(text)) return true;
	if (SCIENTIFIC.test(text)) return true;
	if (TEMPERATURE.test(text)) return true;
	if (CLOCK_TIME.test(text)) return true;
	if (DATE_LIKE.test(text)) return true;
	if (COMPARATOR_PREFIX.test(text)) return true;
	if (PAREN_NEGATIVE.test(text)) return true;
	if (DURATION.test(text)) return true;
	if (isRange(text)) return true;
	return false;
}
function hasFlexLayout(node) {
	return node.layout?.display === "flex";
}
function isTextLike(node) {
	if (node.type === "TEXT") return true;
	if (typeof node.characters === "string" && node.characters.length > 0) return true;
	return false;
}
function isVectorLike(node) {
	return node.type === "VECTOR" || node.type === "LINE" || node.type === "ELLIPSE" || node.type === "POLYGON" || node.type === "STAR" || node.type === "PATH" || node.type === "BOOLEAN_OPERATION";
}
function looksLikeNumericText(node) {
	return looksLikeNumber(node.characters);
}
function hasVisualCard(node) {
	const s = node.styles || {};
	return !!(s.background || s.border || s.borderRadius || s.boxShadow);
}
function detectDialog(node) {
	if (!hasFlexLayout(node) || !node.children || node.children.length < 2) return null;
	const s = node.styles || {};
	if (!s.boxShadow || !s.borderRadius) return null;
	if (node.layout?.flexDirection !== "column") return null;
	const lastChild = node.children[node.children.length - 1];
	if (!(lastChild.layout?.flexDirection === "row" && (lastChild.children?.length ?? 0) >= 1)) return null;
	return `boxShadow+radius+column+bottomRow`;
}
function detectTable(node, minRows, minCols) {
	if (!hasFlexLayout(node) || node.layout?.flexDirection !== "column") return null;
	const rows = node.children ?? [];
	if (rows.length < minRows) return null;
	const dataRows = rows.filter((r) => r.layout?.flexDirection === "row" && (r.children?.length ?? 0) >= minCols);
	if (dataRows.length < minRows) return null;
	const colCount = dataRows[0].children.length;
	if (!dataRows.every((r) => r.children.length === colCount)) return null;
	const heights = dataRows.map((r) => r.height).sort((a, b) => a - b);
	const mid = heights[Math.floor(heights.length / 2)];
	if (mid <= 0) return null;
	if (!heights.every((h) => Math.abs(h - mid) / mid <= .25)) return null;
	const firstRowXs = dataRows[0].children.map((c) => c.x);
	if (!dataRows.every((r) => r.children.every((c, i) => Math.abs(c.x - firstRowXs[i]) <= 4))) return null;
	return `${dataRows.length}rows×${colCount}cols,h≈${Math.round(mid)}`;
}
function detectChart(node, minLabels) {
	if (!hasFlexLayout(node)) return null;
	if (!node.children || node.children.length < 3) return null;
	if (node.width < 100 || node.height < 80) return null;
	let vectorCount = 0;
	let numericCount = 0;
	const stack = [...node.children];
	let visited = 0;
	while (stack.length > 0 && visited < 500) {
		const n = stack.pop();
		visited++;
		if (isVectorLike(n)) vectorCount++;
		else if (isTextLike(n) && looksLikeNumericText(n)) numericCount++;
		if (n.children) for (const c of n.children) stack.push(c);
	}
	if (vectorCount < 1) return null;
	if (numericCount < minLabels) return null;
	return `vector=${vectorCount},numericLabels=${numericCount}`;
}
function detectForm(node, minRows) {
	if (!hasFlexLayout(node) || node.layout?.flexDirection !== "column") return null;
	const rows = node.children ?? [];
	if (rows.length < minRows) return null;
	let formRowCount = 0;
	let rowDirectionCount = 0;
	for (const row of rows) {
		if (row.layout?.flexDirection !== "row") continue;
		rowDirectionCount++;
		const kids = row.children ?? [];
		if (kids.length < 2) continue;
		const labelKid = kids.find((k) => isTextLike(k));
		if (!labelKid) continue;
		if (kids.some((k) => {
			if (k === labelKid) return false;
			return hasVisualCard(k);
		})) formRowCount++;
	}
	if (formRowCount < minRows) return null;
	if (rowDirectionCount === 0) return null;
	if (formRowCount / rowDirectionCount < .7) return null;
	if (rowDirectionCount / rows.length < .7) return null;
	return `formRows=${formRowCount}/${rows.length}`;
}
function cardsSimilar(a, b) {
	const wRatio = Math.min(a.width, b.width) / Math.max(a.width, b.width || 1);
	const hRatio = Math.min(a.height, b.height) / Math.max(a.height, b.height || 1);
	if (wRatio < .8 || hRatio < .8) return false;
	const ac = a.children?.length ?? 0;
	const bc = b.children?.length ?? 0;
	if (Math.abs(ac - bc) > 1) return false;
	if (a.layout?.flexDirection !== b.layout?.flexDirection) return false;
	return true;
}
function detectCardList(node, minItems) {
	if (!hasFlexLayout(node)) return null;
	const kids = node.children ?? [];
	if (kids.length < minItems) return null;
	const cards = kids.filter((k) => hasVisualCard(k) && k.children && k.children.length > 0);
	if (cards.length < minItems) return null;
	const ref = cards[0];
	const similar = cards.filter((c) => c === ref || cardsSimilar(ref, c));
	if (similar.length < minItems) return null;
	return `cards=${similar.length}/${kids.length}`;
}
function detectComponentRole(node, options = {}) {
	const { minTableRows = 3, minTableCols = 2, minChartLabels = 3, minFormRows = 2, minCardItems = 3, enableTable = true, enableChart = true, enableForm = true, enableDialog = true, enableCardList = true } = options;
	if (enableDialog) {
		const r = detectDialog(node);
		if (r) return {
			kind: "dialog",
			reason: r
		};
	}
	if (enableTable) {
		const r = detectTable(node, minTableRows, minTableCols);
		if (r) return {
			kind: "table",
			reason: r
		};
	}
	if (enableChart) {
		const r = detectChart(node, minChartLabels);
		if (r) return {
			kind: "chart",
			reason: r
		};
	}
	if (enableForm) {
		const r = detectForm(node, minFormRows);
		if (r) return {
			kind: "form",
			reason: r
		};
	}
	if (enableCardList) {
		const r = detectCardList(node, minCardItems);
		if (r) return {
			kind: "cardList",
			reason: r
		};
	}
	return null;
}
function tagComponentBoundaries(root, options = {}) {
	const stats = {
		tagged: 0,
		byKind: {
			table: 0,
			chart: 0,
			form: 0,
			dialog: 0,
			cardList: 0
		}
	};
	const stack = [root];
	while (stack.length > 0) {
		const n = stack.pop();
		if (!n.componentRole) {
			const hit = detectComponentRole(n, options);
			if (hit) {
				n.componentRole = hit.kind;
				n.componentRoleReason = hit.reason;
				stats.tagged++;
				stats.byKind[hit.kind]++;
			}
		}
		if (n.children) for (const c of n.children) stack.push(c);
	}
	return stats;
}
function convertColor(c) {
	return {
		r: c.red / 255,
		g: c.green / 255,
		b: c.blue / 255
	};
}
function isValidColor(c) {
	return c && typeof c === "object" && c.type === "color" && typeof c.red === "number";
}
function isGradient$1(c) {
	return c && typeof c === "object" && [
		"linear",
		"radial",
		"angular",
		"diamond"
	].includes(c.type) && Array.isArray(c.gradient_range);
}
function toCssColor(c) {
	if (c.alpha !== void 0 && c.alpha < 1) return `rgba(${c.red}, ${c.green}, ${c.blue}, ${c.alpha})`;
	const toHex = (n) => Math.round(n).toString(16).padStart(2, "0");
	return `#${toHex(c.red)}${toHex(c.green)}${toHex(c.blue)}`;
}
function toCssGradient(g, rw, rh) {
	const stops = g.gradient_range.map((s) => `${toCssColor(s.color)} ${Math.round(s.ratio * 100)}%`).join(", ");
	if (g.type === "linear") {
		const dx = g.long_axis_point[0] - g.center_point[0];
		const dy = g.long_axis_point[1] - g.center_point[1];
		return `linear-gradient(${Math.round(Math.atan2(dx, -dy) * 180 / Math.PI)}deg, ${stops})`;
	}
	if (g.type === "radial") return `radial-gradient(ellipse at ${rw > 0 ? Math.round(g.center_point[0] / rw * 100) : 50}% ${rh > 0 ? Math.round(g.center_point[1] / rh * 100) : 50}%, ${stops})`;
	if (g.type === "angular") return `conic-gradient(at ${rw > 0 ? Math.round(g.center_point[0] / rw * 100) : 50}% ${rh > 0 ? Math.round(g.center_point[1] / rh * 100) : 50}%, ${stops})`;
	return `linear-gradient(135deg, ${stops})`;
}
var GRADIENT_TYPE_MAP = {
	linear: "GRADIENT_LINEAR",
	radial: "GRADIENT_RADIAL",
	angular: "GRADIENT_ANGULAR",
	diamond: "GRADIENT_DIAMOND"
};
function resolveImageRef(ref, assets) {
	const m = ref.match(/^\$(\d+)$/);
	if (m && assets) {
		const idx = parseInt(m[1], 10);
		if (idx < assets.length) return assets[idx];
	}
	return IMG_PLACEHOLDER;
}
function buildFills(style, isText, assets) {
	const fills = [];
	const src = isText ? style.font_color : style.background_color;
	if (isValidColor(src)) fills.push({
		type: "SOLID",
		blendMode: "NORMAL",
		opacity: src.alpha ?? 1,
		visible: true,
		color: convertColor(src)
	});
	else if (isGradient$1(src)) {
		const rw = style.origin_width || 1;
		const rh = style.origin_height || 1;
		fills.push({
			type: GRADIENT_TYPE_MAP[src.type] || "GRADIENT_LINEAR",
			blendMode: "NORMAL",
			opacity: 1,
			visible: true,
			gradientStops: src.gradient_range.map((s) => ({
				position: s.ratio,
				color: {
					...convertColor(s.color),
					a: s.color.alpha ?? 1
				}
			})),
			gradientHandlePositions: [
				{
					x: src.center_point[0] / rw,
					y: src.center_point[1] / rh
				},
				{
					x: src.long_axis_point[0] / rw,
					y: src.long_axis_point[1] / rh
				},
				{
					x: src.minor_axis_point[0] / rw,
					y: src.minor_axis_point[1] / rh
				}
			]
		});
	}
	if (!isText && style.background_image) {
		const scaleMode = style.background_size === "contain" ? "FIT" : "FILL";
		fills.push({
			type: "IMAGE",
			blendMode: "NORMAL",
			opacity: 1,
			visible: true,
			imageRef: resolveImageRef(style.background_image, assets),
			scaleMode: style.background_repeat === "repeat" ? "TILE" : scaleMode
		});
	}
	return fills;
}
var DEFAULT_COLOR = {
	type: "color",
	red: 0,
	green: 0,
	blue: 0,
	alpha: 1
};
function getBorderSide(b) {
	return b.position || b.type || "";
}
function buildStrokes(style) {
	if (style.border && style.border.length > 0) {
		const first = style.border[0];
		const c = isValidColor(first.color) ? first.color : DEFAULT_COLOR;
		const strokes = [{
			type: "SOLID",
			blendMode: "NORMAL",
			opacity: c.alpha ?? 1,
			visible: true,
			color: convertColor(c)
		}];
		const widths = style.border.map((b) => b.width);
		if (widths.every((w) => w === widths[0])) return {
			strokes,
			strokeWeight: widths[0]
		};
		const perSide = {};
		for (const b of style.border) perSide[getBorderSide(b)] = b.width;
		return {
			strokes,
			strokeWeight: Math.max(...widths),
			strokeTopWeight: perSide.top ?? 0,
			strokeRightWeight: perSide.right ?? 0,
			strokeBottomWeight: perSide.bottom ?? 0,
			strokeLeftWeight: perSide.left ?? 0
		};
	}
	if (isValidColor(style.stroke_color) && style.stroke_width) return {
		strokes: [{
			type: "SOLID",
			blendMode: "NORMAL",
			opacity: style.stroke_color.alpha ?? 1,
			visible: true,
			color: convertColor(style.stroke_color)
		}],
		strokeWeight: style.stroke_width
	};
	return { strokes: [] };
}
function buildCornerRadius$1(rr) {
	if (!rr || rr.length === 0) return { cornerRadius: 0 };
	if (rr.every((r) => r === rr[0])) return { cornerRadius: rr[0] };
	return {
		cornerRadius: rr[0],
		borderRadius: {
			topLeft: rr[0],
			topRight: rr[1],
			bottomRight: rr[2],
			bottomLeft: rr[3]
		}
	};
}
function buildEffects(style) {
	const effects = [];
	if (style.shadow) for (const s of style.shadow) effects.push({
		type: s.type === "inner" ? "INNER_SHADOW" : "DROP_SHADOW",
		visible: true,
		color: {
			...convertColor(s.color),
			a: s.color.alpha ?? 1
		},
		offset: {
			x: s.x,
			y: s.y
		},
		radius: s.blur,
		spread: s.spread ?? 0
	});
	if (style.filter) for (const f of style.filter) {
		const val = typeof f.value === "number" ? f.value : parseFloat(String(f.value)) || 0;
		effects.push({
			type: f.type === "background" ? "BACKGROUND_BLUR" : "LAYER_BLUR",
			visible: true,
			radius: val
		});
	}
	return effects;
}
function toCssBoxShadow(shadows) {
	return shadows.map((s) => {
		const inset = s.type === "inner" ? "inset " : "";
		const spread = s.spread !== void 0 ? ` ${s.spread}px` : " 0px";
		return `${inset}${s.x}px ${s.y}px ${s.blur}px${spread} ${toCssColor(s.color)}`;
	}).join(", ");
}
function buildCssStyles(style, isText) {
	const css = {};
	const colorSrc = isText ? style.font_color : style.background_color;
	if (!isText) {
		if (isValidColor(colorSrc)) css.background = toCssColor(colorSrc);
		else if (isGradient$1(colorSrc)) css.background = toCssGradient(colorSrc, style.origin_width, style.origin_height);
	}
	if (isText) {
		if (isValidColor(style.font_color)) css.color = toCssColor(style.font_color);
		else if (isGradient$1(style.font_color)) {
			css.background = toCssGradient(style.font_color, style.origin_width, style.origin_height);
			css.backgroundClip = "text";
			css.WebkitBackgroundClip = "text";
			css.color = "transparent";
		}
	}
	if (style.font_size !== void 0) css.fontSize = `${style.font_size}px`;
	if (style.font_weight !== void 0) css.fontWeight = style.font_weight;
	if (style.font_family !== void 0) css.fontFamily = style.font_family;
	if (style.line_height !== void 0) css.lineHeight = `${style.line_height}px`;
	if (style.text_align_horizontal !== void 0) css.textAlign = style.text_align_horizontal;
	if (style.text_align_vertical !== void 0) css.verticalAlign = style.text_align_vertical;
	if (style.text_decoration !== void 0) css.textDecoration = style.text_decoration;
	if (style.opacity !== void 0 && style.opacity < 1) css.opacity = style.opacity;
	if (style.round_corner && style.round_corner.length > 0) if (style.round_corner.every((r) => r === style.round_corner[0])) {
		if (style.round_corner[0] > 0) css.borderRadius = `${style.round_corner[0]}px`;
	} else css.borderRadius = style.round_corner.map((r) => `${r}px`).join(" ");
	if (style.border && style.border.length > 0) {
		const first = style.border[0];
		const fc = isValidColor(first.color) ? first.color : DEFAULT_COLOR;
		if (style.border.every((b) => {
			const bc = isValidColor(b.color) ? b.color : DEFAULT_COLOR;
			return b.width === first.width && bc.red === fc.red && bc.green === fc.green && bc.blue === fc.blue;
		})) css.border = `${first.width}px ${first.style} ${toCssColor(fc)}`;
		else for (const b of style.border) {
			const side = getBorderSide(b);
			if (!side) continue;
			const prop = `border${side.charAt(0).toUpperCase() + side.slice(1)}`;
			css[prop] = `${b.width}px ${b.style} ${toCssColor(isValidColor(b.color) ? b.color : DEFAULT_COLOR)}`;
		}
	} else if (isValidColor(style.stroke_color) && style.stroke_width) css.border = `${style.stroke_width}px solid ${toCssColor(style.stroke_color)}`;
	if (style.shadow && style.shadow.length > 0) css.boxShadow = toCssBoxShadow(style.shadow);
	if (style.filter) for (const f of style.filter) {
		const val = typeof f.value === "number" ? `${f.value}px` : f.value;
		if (f.type === "background") css.backdropFilter = `blur(${val})`;
		else css.filter = `blur(${val})`;
	}
	return css;
}
function inferComponentName$1(type) {
	switch (type) {
		case "TEXT": return "span";
		case "VECTOR": return "svg";
		default: return "div";
	}
}
function convertComponentInfo(ci) {
	if (!ci) return void 0;
	return {
		fileKey: ci.file_key,
		fileName: ci.file_name,
		componentKey: ci.component_key,
		componentName: ci.component_name,
		componentDescription: ci.component_description,
		styleKey: ci.symbol_key,
		styleName: ci.symbol_name,
		description: ci.symbol_description,
		instanceName: ci.instance_name,
		instanceProperties: ci.instance_properties?.map((p) => ({
			type: p.type,
			key: p.key,
			value: p.value
		}))
	};
}
function convertLocalStyles(ls) {
	if (!ls || ls.length === 0) return void 0;
	const grouped = {};
	for (const s of ls) {
		const entry = {
			fileKey: s.file_key,
			fileName: s.file_name,
			styleKey: s.style_key,
			type: s.style_type,
			name: s.style_name,
			description: s.style_description || "",
			value: {}
		};
		if (s.style_value?.background_color && isValidColor(s.style_value.background_color)) entry.value = {
			color: convertColor(s.style_value.background_color),
			opacity: s.style_value.background_color.alpha ?? 1
		};
		const group = s.style_type || "other";
		if (!grouped[group]) grouped[group] = [];
		grouped[group].push(entry);
	}
	return grouped;
}
function convertInteraction(i) {
	if (!i) return void 0;
	return {
		trigger: i.interaction_type,
		navigationType: i.navigation_type,
		targetKey: i.target_key,
		targetName: i.target_name,
		targetFrame: i.target_frame
	};
}
function convertExtendData(ex) {
	if (!ex) return void 0;
	const data = {};
	if (ex.icon) data.icon = ex.icon;
	if (ex.chart) data.chart = ex.chart;
	if (ex.mark) data.mark = ex.mark;
	return Object.keys(data).length > 0 ? data : void 0;
}
function convertExportSettings(ex) {
	if (!ex?.export_settings || ex.export_settings.length === 0) return void 0;
	return ex.export_settings.map((e) => ({
		suffix: e.name,
		format: e.type?.toUpperCase() || "PNG",
		constraint: {
			type: e.constraint_type?.toUpperCase() || "SCALE",
			value: e.constraint_value ?? 1
		}
	}));
}
function isCompressedDslFormat(data) {
	if (!data?.meta || typeof data.meta.version !== "string") return false;
	if (!Array.isArray(data.content) || data.content.length === 0) return false;
	const first = data.content[0];
	if (!first || typeof first !== "object") return false;
	return "K" in first || "T" in first || "B" in first || "S" in first || "CH" in first;
}
function expandBox(B) {
	return {
		x: B?.x ?? 0,
		y: B?.y ?? 0,
		width: B?.w ?? B?.width ?? 0,
		height: B?.h ?? B?.height ?? 0
	};
}
function expandStyle(S, B) {
	const s = S || {};
	const style = {
		origin_width: s.rw ?? B?.w ?? B?.width ?? 0,
		origin_height: s.rh ?? B?.h ?? B?.height ?? 0,
		rotation_angle: s.ra ?? 0
	};
	if (s.oc !== void 0) style.opacity = s.oc;
	if (s.rr !== void 0) style.round_corner = s.rr;
	if (s.bd !== void 0) style.border = s.bd;
	if (s.sd !== void 0) style.shadow = s.sd;
	if (s.fl !== void 0) style.filter = s.fl;
	if (s.bc !== void 0) style.background_color = s.bc;
	if (s.bi !== void 0) style.background_image = s.bi;
	if (s.bp !== void 0) style.background_position = s.bp;
	if (s.br !== void 0) style.background_repeat = s.br;
	if (s.bs !== void 0) style.background_size = s.bs;
	if (s.fc !== void 0) style.font_color = s.fc;
	if (s.fs !== void 0) style.font_size = s.fs;
	if (s.fw !== void 0) style.font_weight = s.fw;
	if (s.ff !== void 0) style.font_family = typeof s.ff === "string" ? s.ff : s.ff?.family ?? String(s.ff);
	if (s.lh !== void 0) style.line_height = typeof s.lh === "number" ? s.lh : s.lh?.value ?? s.lh;
	if (s.th !== void 0) style.text_align_horizontal = String(s.th).toLowerCase();
	if (s.tv !== void 0) style.text_align_vertical = String(s.tv).toLowerCase();
	if (s.td !== void 0) style.text_decoration = s.td;
	if (s.sc !== void 0) style.stroke_color = s.sc;
	if (s.sw !== void 0) style.stroke_width = s.sw;
	return style;
}
function expandComponentInfo(CI) {
	if (!CI) return void 0;
	const ci = {
		file_key: CI.fk ?? "",
		symbol_key: CI.sk ?? "",
		symbol_name: CI.sn ?? "",
		instance_name: CI.in ?? ""
	};
	if (CI.fn !== void 0) ci.file_name = CI.fn;
	if (CI.ck !== void 0) ci.component_key = CI.ck;
	if (CI.cn !== void 0) ci.component_name = CI.cn;
	if (CI.cd !== void 0) ci.component_description = CI.cd;
	if (CI.sd !== void 0) ci.symbol_description = CI.sd;
	if (Array.isArray(CI.ip)) ci.instance_properties = CI.ip.map((p) => ({
		type: String(p?.t ?? ""),
		key: String(p?.k ?? ""),
		value: String(p?.v ?? "")
	}));
	return ci;
}
function expandExtend(EX) {
	if (!EX) return void 0;
	const ex = {};
	if (EX.es !== void 0) ex.export_settings = EX.es;
	if (EX.vm !== void 0) ex.vector_merge = EX.vm;
	if (EX.vs !== void 0) ex.vector_shape = EX.vs;
	if (EX.dl !== void 0) ex.design_layout = EX.dl;
	if (EX.uc !== void 0) ex.unbind_component = EX.uc;
	if (EX.ic !== void 0) ex.icon = EX.ic;
	if (EX.ch !== void 0) ex.chart = EX.ch;
	if (EX.mk !== void 0) ex.mark = EX.mk;
	if (EX.mask !== void 0) ex.mask = EX.mask;
	return ex;
}
function expandInteraction(IN) {
	if (!IN) return void 0;
	return {
		interaction_type: IN.it ?? IN.interaction_type ?? "",
		navigation_type: IN.nt ?? IN.navigation_type ?? "",
		target_key: IN.tk ?? IN.target_key ?? "",
		target_name: IN.tn ?? IN.target_name ?? "",
		target_frame: IN.tf ?? IN.target_frame ?? ""
	};
}
function expandNode(n) {
	const node = {
		key: n?.K ?? "",
		type: n?.T ?? "FRAME",
		box: expandBox(n?.B),
		style: expandStyle(n?.S, n?.B)
	};
	if (n?.N !== void 0) node.name = n.N;
	if (n?.C !== void 0) node.content = n.C;
	const interaction = expandInteraction(n?.IN);
	if (interaction) node.interaction = interaction;
	const componentInfo = expandComponentInfo(n?.CI);
	if (componentInfo) node.component_instance = componentInfo;
	if (Array.isArray(n?.LS)) node.library_style = n.LS;
	if (Array.isArray(n?.CH)) node.children = n.CH.map(expandNode);
	const extend = expandExtend(n?.EX);
	if (extend) node.extend = extend;
	return node;
}
function expandCompressedDsl(data) {
	return {
		meta: data.meta,
		content: Array.isArray(data.content) ? data.content.map(expandNode) : [],
		assets: Array.isArray(data.assets) ? data.assets : []
	};
}
function parseDesignLayout$1(raw) {
	if (!raw) return void 0;
	if (typeof raw === "string") try {
		return JSON.parse(raw);
	} catch {
		return;
	}
	return raw;
}
function toLayoutMode(dl) {
	if (!dl?.stackMode) return "NONE";
	return dl.stackMode;
}
var MASK_EXACT_NAMES = new Set([
	"mask",
	"蒙版",
	"hms_mask",
	"clipping mask"
]);
function inferMask(name) {
	if (!name) return false;
	const lower = name.toLowerCase().trim();
	return MASK_EXACT_NAMES.has(lower);
}
function buildTextData(style, content, boxHeight) {
	if (!content) return void 0;
	const fontSize = style.font_size || 14;
	const lineHeight = style.line_height || fontSize * 1.2;
	const lineCount = boxHeight ? Math.max(1, Math.round(boxHeight / lineHeight)) : 1;
	const hasRealWidth = typeof style.origin_width === "number" && style.origin_width > 0;
	const baselines = [];
	for (let i = 0; i < lineCount; i++) {
		const baseline = {
			position: {
				x: 0,
				y: Math.round(lineHeight * .8) + i * lineHeight
			},
			lineY: 0,
			lineHeight,
			lineAscent: Math.round(lineHeight * .8),
			firstCharacter: 0,
			endCharacter: content.length
		};
		if (hasRealWidth) baseline.width = style.origin_width;
		baselines.push(baseline);
	}
	return {
		baselines,
		text: [{
			fontSize,
			fontWeight: style.font_weight || 400,
			fontFamily: style.font_family,
			lineHeight
		}]
	};
}
function convertNode$2(node, isRoot = false, assets, applyTrustMode = true) {
	const { key, name, content, type, box, style, interaction, component_instance, library_style, children, extend } = node;
	const isText = type === "TEXT";
	const effectiveType = component_instance ? "INSTANCE" : type === "FRAME" && name?.includes("_GroupToFrame") ? "GROUP" : type;
	const result = {
		type: effectiveType,
		id: key,
		isPageRoot: isRoot,
		name: name || content || key,
		componentName: inferComponentName$1(effectiveType),
		width: box.width,
		height: box.height,
		x: box.x,
		y: box.y,
		children: [],
		visible: true,
		dashPattern: [],
		layoutMode: "NONE",
		blendMode: "PASS_THROUGH",
		opacity: style.opacity ?? 1
	};
	if (isText && content) result.characters = content;
	if (style.font_size !== void 0) result.fontSize = style.font_size;
	if (style.font_weight !== void 0) result.fontWeight = style.font_weight;
	if (style.font_family !== void 0) result.fontName = { family: style.font_family };
	if (style.text_align_horizontal !== void 0) result.textAlignHorizontal = style.text_align_horizontal.toUpperCase();
	if (style.text_align_vertical !== void 0) result.textAlignVertical = style.text_align_vertical.toUpperCase();
	if (style.line_height !== void 0) result.lineHeight = {
		value: style.line_height,
		units: "PIXELS"
	};
	if (style.text_decoration !== void 0) result.textDecoration = style.text_decoration === "underline" ? "UNDERLINE" : style.text_decoration === "line-through" ? "STRIKETHROUGH" : "NONE";
	if (style.rotation_angle !== void 0 && style.rotation_angle !== 0) result.rotation = style.rotation_angle;
	const dl = parseDesignLayout$1(extend?.design_layout);
	if (dl?.stackMode) {
		result.originalLayoutMode = toLayoutMode(dl);
		result.layoutMode = result.originalLayoutMode;
	}
	if (dl?.stackSpacing !== void 0) result.itemSpacing = dl.stackSpacing;
	if (dl?.stackPaddingLeft !== void 0) result.paddingLeft = dl.stackPaddingLeft;
	if (dl?.stackPaddingRight !== void 0) result.paddingRight = dl.stackPaddingRight;
	if (dl?.stackPaddingTop !== void 0) result.paddingTop = dl.stackPaddingTop;
	if (dl?.stackPaddingBottom !== void 0) result.paddingBottom = dl.stackPaddingBottom;
	if (dl?.stackPrimaryAlignItems) result.primaryAxisAlignItems = dl.stackPrimaryAlignItems;
	if (dl?.stackCounterAlignItems) result.counterAxisAlignItems = dl.stackCounterAlignItems;
	result.fills = buildFills(style, isText, assets);
	const strokeInfo = buildStrokes(style);
	result.strokes = strokeInfo.strokes;
	if (strokeInfo.strokeWeight !== void 0) result.strokeWeight = strokeInfo.strokeWeight;
	if ("strokeTopWeight" in strokeInfo) {
		result.strokeTopWeight = strokeInfo.strokeTopWeight;
		result.strokeRightWeight = strokeInfo.strokeRightWeight;
		result.strokeBottomWeight = strokeInfo.strokeBottomWeight;
		result.strokeLeftWeight = strokeInfo.strokeLeftWeight;
	}
	const radiusInfo = buildCornerRadius$1(style.round_corner);
	result.cornerRadius = radiusInfo.cornerRadius;
	if ("borderRadius" in radiusInfo) result.borderRadius = radiusInfo.borderRadius;
	const effects = buildEffects(style);
	if (effects.length > 0) result.effects = effects;
	if (extend?.vector_merge || extend?.icon || applyTrustMode && (extend?.image_source === "vector" || extend?.image_source === "composite")) {
		result.shouldBeImage = true;
		if (!result.fills.some((f) => f.type === "IMAGE")) result.fills.push({
			type: "IMAGE",
			blendMode: "NORMAL",
			opacity: 1,
			visible: true,
			scaleMode: "FILL"
		});
	}
	if (applyTrustMode) {
		if (extend?.image_role === "background" || extend?.image_role === "content") result.imageRole = extend.image_role;
		if (extend?.image_source === "vector" || extend?.image_source === "composite") result.imageSource = extend.image_source;
		if (extend?.background_layer && typeof extend.background_layer === "object") {
			const bl = extend.background_layer;
			result.backgroundLayer = {
				score: bl.score,
				containedNodeIds: Array.isArray(bl.contained_node_ids) ? [...bl.contained_node_ids] : [],
				reasons: Array.isArray(bl.reasons) ? [...bl.reasons] : []
			};
		}
	}
	result.mask = extend?.mask === true || inferMask(name);
	if (isText && content) result.textData = buildTextData(style, content, box.height);
	const componentInfo = convertComponentInfo(component_instance);
	if (componentInfo) result.componentInfo = componentInfo;
	const styleData = convertLocalStyles(library_style);
	if (styleData) result.styleData = styleData;
	const interactionData = convertInteraction(interaction);
	if (interactionData) result.interaction = interactionData;
	const extendData = convertExtendData(extend);
	if (extendData) result.extendData = extendData;
	const exportSettings = convertExportSettings(extend);
	if (exportSettings) result.exportSettings = exportSettings;
	const cssStyles = buildCssStyles(style, isText);
	if (Object.keys(cssStyles).length > 0) result.styles = cssStyles;
	if (children && children.length > 0) {
		const suppNodes = children.filter((c) => c.type === "SUPPOSITIONAL");
		const normalNodes = children.filter((c) => c.type !== "SUPPOSITIONAL");
		for (const supp of suppNodes) {
			const imgFills = buildFills(supp.style, false, assets).filter((f) => f.type === "IMAGE");
			if (imgFills.length > 0) {
				result.fills = [...result.fills || [], ...imgFills];
				result.imgUrl = imgFills[0].imageRef;
			}
		}
		result.children = normalNodes.map((child) => convertNode$2(child, false, assets, applyTrustMode));
	}
	if (result.type === "GROUP" && result.children && result.children.length > 1) {
		const hasImage = result.children.some((c) => c.fills?.some((f) => f.type === "IMAGE"));
		const hasVector = result.children.some((c) => c.type === "VECTOR" || c.type === "BOOLEAN_OPERATION");
		if (hasImage && hasVector) result.children = result.children.filter((c) => c.type !== "VECTOR" && c.type !== "BOOLEAN_OPERATION");
	}
	if (result.type === "SUPPOSITIONAL") result.type = "RECTANGLE";
	return result;
}
function convertDslToOldFormat(dsl, applyTrustMode = true) {
	const assets = Array.isArray(dsl.assets) ? dsl.assets : void 0;
	const roots = dsl.content.map((node) => convertNode$2(node, true, assets, applyTrustMode));
	if (roots.length === 1) return roots[0];
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const r of roots) {
		minX = Math.min(minX, r.x ?? 0);
		minY = Math.min(minY, r.y ?? 0);
		maxX = Math.max(maxX, (r.x ?? 0) + (r.width ?? 0));
		maxY = Math.max(maxY, (r.y ?? 0) + (r.height ?? 0));
	}
	return {
		type: "FRAME",
		id: "dsl-page-root",
		isPageRoot: true,
		name: "Page",
		x: minX,
		y: minY,
		width: maxX - minX,
		height: maxY - minY,
		children: roots,
		visible: true,
		opacity: 1,
		fills: [],
		strokes: [],
		dashPattern: [],
		layoutMode: "NONE",
		blendMode: "PASS_THROUGH"
	};
}
function isNewDslFormat(data) {
	if (!data?.meta || typeof data.meta.version !== "string" || !Array.isArray(data.content)) return false;
	const first = data.content[0];
	return first && "key" in first && "style" in first;
}
function autoConvertDsl(data, applyTrustMode = true) {
	const normalized = isCompressedDslFormat(data) ? expandCompressedDsl(data) : data;
	if (!isNewDslFormat(normalized)) return data;
	const result = convertDslToOldFormat(normalized, applyTrustMode);
	if (result && typeof result === "object") result._fromCompressedDsl = true;
	return result;
}
function materializeVirtualContainers(tree, vcMap) {
	let materialized = 0;
	let partialSkipped = 0;
	if (vcMap.size === 0) return {
		tree,
		materialized,
		partialSkipped
	};
	const walk = (node) => {
		const spec = vcMap.get(node.id);
		if (spec && Array.isArray(node.children) && node.children.length > 0) {
			const ownIdSet = new Set(node.children.map((c) => c.id));
			if (!spec.wrappedNodeIds.every((id) => ownIdSet.has(id))) partialSkipped++;
			else if (spec.wrappedNodeIds.length > 0) {
				const byId = /* @__PURE__ */ new Map();
				for (const c of node.children) byId.set(c.id, c);
				const wrappedSet = new Set(spec.wrappedNodeIds);
				const wrappedChildren = [];
				for (const c of node.children) if (wrappedSet.has(c.id)) wrappedChildren.push(c);
				const bounds = computeBounds(wrappedChildren);
				const vg = {
					id: `vc-${node.id}-bg`,
					name: "background-container",
					type: "GROUP",
					x: bounds.x,
					y: bounds.y,
					width: bounds.width,
					height: bounds.height,
					area: bounds.width * bounds.height,
					depth: (node.depth ?? 0) + 1,
					zIndex: 0,
					renderOrder: 0,
					children: wrappedChildren,
					visible: true
				};
				const firstWrappedIndex = node.children.findIndex((c) => wrappedSet.has(c.id));
				const remaining = node.children.filter((c) => !wrappedSet.has(c.id));
				if (firstWrappedIndex < 0) node.children = [...remaining, vg];
				else {
					const before = node.children.slice(0, firstWrappedIndex).filter((c) => !wrappedSet.has(c.id));
					const after = node.children.slice(firstWrappedIndex).filter((c) => !wrappedSet.has(c.id));
					node.children = [
						...before,
						vg,
						...after
					];
				}
				materialized++;
			}
		}
		if (Array.isArray(node.children)) for (const c of node.children) walk(c);
	};
	walk(tree);
	return {
		tree,
		materialized,
		partialSkipped
	};
}
function computeBounds(nodes) {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const n of nodes) {
		const x = n.x ?? 0;
		const y = n.y ?? 0;
		const w = n.width ?? 0;
		const h = n.height ?? 0;
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x + w > maxX) maxX = x + w;
		if (y + h > maxY) maxY = y + h;
	}
	return {
		x: minX === Infinity ? 0 : minX,
		y: minY === Infinity ? 0 : minY,
		width: minX === Infinity ? 0 : maxX - minX,
		height: minY === Infinity ? 0 : maxY - minY
	};
}
function extractVirtualContainerMap(dslRoot) {
	const map = /* @__PURE__ */ new Map();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const vc = node.extend?.virtual_container;
		if (vc && typeof vc === "object" && vc.kind === "background-container" && Array.isArray(vc.wrapped_node_ids) && typeof vc.background_node_id === "string" && node.key) map.set(node.key, {
			kind: "background-container",
			backgroundNodeId: vc.background_node_id,
			wrappedNodeIds: vc.wrapped_node_ids,
			reason: vc.reason ?? ""
		});
		if (Array.isArray(node.children)) for (const c of node.children) walk(c);
	};
	if (dslRoot && Array.isArray(dslRoot.content)) for (const root of dslRoot.content) walk(root);
	return map;
}
function colorToCSS(c) {
	if (!c) return void 0;
	const toHex = (n) => Math.round(n).toString(16).padStart(2, "0");
	if (c.alpha >= 1) return `#${toHex(c.red)}${toHex(c.green)}${toHex(c.blue)}`;
	return `rgba(${Math.round(c.red)}, ${Math.round(c.green)}, ${Math.round(c.blue)}, ${c.alpha})`;
}
function isGradient(bg) {
	return !!bg && (bg.type === "linear" || bg.type === "radial" || bg.type === "angular");
}
function resolveAsset(ref, assets) {
	if (!ref) return void 0;
	const m = ref.match(/^\$(\d+)$/);
	if (!m) return void 0;
	return assets[Number(m[1])];
}
function gradientAngle(g) {
	const [cx, cy] = g.center_point;
	const [lx, ly] = g.long_axis_point;
	const dx = lx - cx;
	const dy = ly - cy;
	return ((Math.atan2(dy, dx) * 180 / Math.PI + 90) % 360 + 360) % 360;
}
function gradientToCSS(g) {
	const stops = g.gradient_range.map((s) => `${colorToCSS(s.color)} ${(s.ratio * 100).toFixed(1)}%`).join(", ");
	if (g.type === "linear") return `linear-gradient(${gradientAngle(g).toFixed(1)}deg, ${stops})`;
	if (g.type === "radial") return `radial-gradient(${stops})`;
	return `conic-gradient(${stops})`;
}
function buildBackground(s, assets) {
	const out = {};
	const bg = s.background_color;
	const imgRef = s.background_image;
	const url = resolveAsset(imgRef, assets);
	const imagePart = url ? `url("${url}")` : void 0;
	const gradientPart = bg && isGradient(bg) ? gradientToCSS(bg) : void 0;
	const colorPart = bg && !isGradient(bg) ? colorToCSS(bg) : void 0;
	if (gradientPart && imagePart) out.backgroundImage = `${gradientPart}, ${imagePart}`;
	else if (gradientPart) out.backgroundImage = gradientPart;
	else if (imagePart) {
		out.backgroundImage = imagePart;
		if (colorPart) out.backgroundColor = colorPart;
	} else if (colorPart) out.backgroundColor = colorPart;
	if (imagePart) {
		if (s.background_position) out.backgroundPosition = s.background_position;
		if (s.background_repeat) out.backgroundRepeat = s.background_repeat;
		if (s.background_size) out.backgroundSize = s.background_size;
	}
	return out;
}
function buildBorder(s) {
	if (!s.border || s.border.length === 0) return {};
	const widths = {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	};
	const styles = {
		top: "",
		right: "",
		bottom: "",
		left: ""
	};
	for (const b of s.border) {
		widths[b.position] = b.width;
		styles[b.position] = b.style || "solid";
	}
	const uniform = widths.top === widths.right && widths.right === widths.bottom && widths.bottom === widths.left && styles.top === styles.right && styles.right === styles.bottom && styles.bottom === styles.left;
	const color = "currentColor";
	if (uniform) return { border: `${widths.top}px ${styles.top || "solid"} ${color}` };
	const out = {};
	if (widths.top) out.borderTop = `${widths.top}px ${styles.top || "solid"} ${color}`;
	if (widths.right) out.borderRight = `${widths.right}px ${styles.right || "solid"} ${color}`;
	if (widths.bottom) out.borderBottom = `${widths.bottom}px ${styles.bottom || "solid"} ${color}`;
	if (widths.left) out.borderLeft = `${widths.left}px ${styles.left || "solid"} ${color}`;
	return out;
}
function buildCornerRadius(s) {
	const r = s.round_corner;
	if (!r) return void 0;
	const [tl, tr, br, bl] = r;
	if (tl === 0 && tr === 0 && br === 0 && bl === 0) return void 0;
	if (tl === tr && tr === br && br === bl) return `${tl}px`;
	return `${tl}px ${tr}px ${br}px ${bl}px`;
}
function buildBoxShadow(s) {
	if (!s.shadow || s.shadow.length === 0) return void 0;
	return s.shadow.map((sh) => {
		const inset = sh.type === "inner" ? "inset " : "";
		const color = colorToCSS(sh.color) ?? "rgba(0,0,0,1)";
		return `${inset}${sh.x}px ${sh.y}px ${sh.blur}px ${sh.spread ?? 0}px ${color}`;
	}).join(", ");
}
function buildFilter(s) {
	if (!s.filter || s.filter.length === 0) return {};
	const layer = [];
	const backdrop = [];
	for (const f of s.filter) {
		const part = `blur(${f.value}px)`;
		if (f.type === "background") backdrop.push(part);
		else layer.push(part);
	}
	const out = {};
	if (layer.length) out.filter = layer.join(" ");
	if (backdrop.length) out.backdropFilter = backdrop.join(" ");
	return out;
}
function buildStyle(raw, assets) {
	const s = raw.style;
	if (!s) return void 0;
	const isText = raw.type === "TEXT";
	const style = {};
	if (!isText) Object.assign(style, buildBackground(s, assets));
	if (isText) {
		if (s.font_color) style.color = colorToCSS(s.font_color);
		if (s.font_family !== void 0) style.fontFamily = s.font_family;
		if (s.font_size !== void 0) style.fontSize = `${s.font_size}px`;
		if (s.font_weight !== void 0) style.fontWeight = s.font_weight;
		if (s.line_height !== void 0) style.lineHeight = `${s.line_height}px`;
		if (s.letter_spacing !== void 0) style.letterSpacing = `${s.letter_spacing}px`;
		if (s.text_align_horizontal) style.textAlign = s.text_align_horizontal;
		if (s.text_align_vertical) style.verticalAlign = s.text_align_vertical === "center" ? "middle" : s.text_align_vertical;
	}
	const br = buildCornerRadius(s);
	if (br) style.borderRadius = br;
	Object.assign(style, buildBorder(s));
	const shadow = buildBoxShadow(s);
	if (shadow) style.boxShadow = shadow;
	Object.assign(style, buildFilter(s));
	if (s.opacity !== void 0 && s.opacity !== 1) style.opacity = s.opacity;
	return Object.keys(style).length > 0 ? style : void 0;
}
var VALID_ALIGNS = new Set([
	"MIN",
	"CENTER",
	"MAX",
	"SPACE_BETWEEN",
	"BASELINE"
]);
function normalizeAlign(v) {
	if (!v) return void 0;
	return VALID_ALIGNS.has(v) ? v : void 0;
}
function normalizeSizing(v) {
	if (!v) return void 0;
	if (v === "FIXED") return "FIXED";
	if (v === "RESIZE_TO_FIT" || v === "HUG" || v === "AUTO") return "HUG";
	if (v === "FILL" || v === "STRETCH") return "FILL";
}
function parseDesignLayout(raw) {
	if (!raw) return void 0;
	try {
		return JSON.parse(raw);
	} catch {
		return;
	}
}
function extractHints(raw, componentName) {
	const dl = parseDesignLayout(raw.extend?.design_layout);
	let autoLayout;
	let autoLayoutChild;
	if (dl) {
		if (dl.stackMode === "HORIZONTAL" || dl.stackMode === "VERTICAL") {
			const hasPad = dl.stackPaddingTop || dl.stackPaddingRight || dl.stackPaddingBottom || dl.stackPaddingLeft;
			autoLayout = {
				mode: dl.stackMode,
				primaryAlign: normalizeAlign(dl.stackPrimaryAlignItems),
				counterAlign: normalizeAlign(dl.stackCounterAlignItems),
				gap: dl.stackSpacing,
				padding: hasPad ? {
					top: dl.stackPaddingTop ?? 0,
					right: dl.stackPaddingRight ?? 0,
					bottom: dl.stackPaddingBottom ?? 0,
					left: dl.stackPaddingLeft ?? 0
				} : void 0,
				wrap: dl.stackWrap === "WRAP" ? true : void 0,
				primarySizing: normalizeSizing(dl.stackPrimarySizing),
				counterSizing: normalizeSizing(dl.stackCounterSizing)
			};
		}
		const childPrimary = normalizeSizing(dl.stackChildPrimarySizing);
		const childCounter = normalizeSizing(dl.stackChildCounterSizing);
		if (dl.autoLayoutAbsolutePos || childPrimary || childCounter) autoLayoutChild = {
			absolute: dl.autoLayoutAbsolutePos || void 0,
			primarySizing: childPrimary,
			counterSizing: childCounter
		};
	}
	const hints = { componentName };
	if (autoLayout) hints.autoLayout = autoLayout;
	if (autoLayoutChild) hints.autoLayoutChild = autoLayoutChild;
	return hints;
}
function inferComponentName(type) {
	if (type === "TEXT") return "span";
	if (type === "VECTOR" || type === "BOOLEAN_OPERATION") return "svg";
	return "div";
}
function isImageRole(value) {
	return value === "content" || value === "background";
}
function isImageSource(value) {
	return value === "raster" || value === "vector" || value === "composite" || value === "icon-font";
}
function explicitImageInfo(raw) {
	const role = isImageRole(raw.extend?.image_role) ? raw.extend.image_role : void 0;
	const source = isImageSource(raw.extend?.image_source) ? raw.extend.image_source : void 0;
	return role || source ? {
		role,
		source
	} : void 0;
}
function explicitBackgroundLayer(raw) {
	const layer = raw.extend?.background_layer;
	if (!layer || typeof layer !== "object") return void 0;
	const score = typeof layer.score === "number" ? layer.score : void 0;
	const containedNodeIds = Array.isArray(layer.contained_node_ids) ? layer.contained_node_ids.filter((id) => typeof id === "string") : void 0;
	const reasons = Array.isArray(layer.reasons) ? layer.reasons.filter((reason) => typeof reason === "string") : void 0;
	if (score === void 0 || !containedNodeIds || !reasons) return void 0;
	return {
		score,
		containedNodeIds,
		reasons
	};
}
function explicitVirtualContainer(raw) {
	const container = raw.extend?.virtual_container;
	if (!container || typeof container !== "object") return void 0;
	if (container.kind !== "background-container") return void 0;
	const backgroundNodeId = typeof container.background_node_id === "string" ? container.background_node_id : void 0;
	const wrappedNodeIds = Array.isArray(container.wrapped_node_ids) ? container.wrapped_node_ids.filter((id) => typeof id === "string") : void 0;
	const reason = typeof container.reason === "string" ? container.reason : void 0;
	if (!backgroundNodeId || !wrappedNodeIds || !reason) return void 0;
	return {
		kind: "background-container",
		backgroundNodeId,
		wrappedNodeIds,
		reason
	};
}
function inferImageInfo(raw) {
	const explicit = explicitImageInfo(raw);
	if (explicit) return explicit;
	if (raw.type === "VECTOR" || raw.type === "BOOLEAN_OPERATION") return {
		role: "content",
		source: "vector"
	};
	if (raw.extend?.vector_merge) return {
		role: "content",
		source: "vector"
	};
	if (raw.extend?.icon) return {
		role: "content",
		source: "vector"
	};
	if (raw.extend?.vector_shape) return {
		role: "content",
		source: "vector"
	};
	if (raw.style?.background_image) return {
		role: (raw.children?.filter((c) => c.type !== "SUPPOSITIONAL") ?? []).length > 0 ? "background" : "content",
		source: "raster"
	};
}
function resolveType(raw) {
	if (raw.component_instance) return "INSTANCE";
	return raw.type;
}
function convertNode$1(raw, assets, opts) {
	const resolvedType = resolveType(raw);
	const imageInfo = opts.skipImageDetection ? explicitImageInfo(raw) : inferImageInfo(raw);
	const imageRole = imageInfo?.role;
	const imageSource = imageInfo?.source;
	const backgroundLayer = explicitBackgroundLayer(raw);
	const virtualContainer = explicitVirtualContainer(raw);
	const isImage = imageRole === "content";
	const type = isImage ? "IMAGE" : resolvedType;
	const isText = type === "TEXT";
	return {
		id: raw.key,
		name: raw.name,
		type,
		geometry: {
			x: raw.box.x,
			y: raw.box.y,
			width: raw.box.width,
			height: raw.box.height,
			rotation: raw.style?.rotation_angle
		},
		style: buildStyle(raw, assets),
		characters: isText ? raw.content : void 0,
		hints: extractHints(raw, inferComponentName(type)),
		extend: raw.extend,
		imageRole,
		imageSource,
		imageUrl: resolveAsset(raw.style?.background_image, assets),
		backgroundLayer,
		virtualContainer,
		children: isImage ? void 0 : raw.children?.map((c) => convertNode$1(c, assets, opts)),
		depth: 0,
		zIndex: 0,
		renderOrder: 0
	};
}
function parseNewFormat(raw, opts = {}) {
	if (!raw.content || raw.content.length === 0) throw new Error("parseNewFormat: content 为空");
	const assets = Array.isArray(raw.assets) ? raw.assets : [];
	const root = convertNode$1(raw.content[0], assets, opts);
	root.isPageRoot = true;
	return root;
}
var right = (b) => b.x + b.width;
var bottom = (b) => b.y + b.height;
function intersection(a, b) {
	const x = Math.max(a.x, b.x);
	const y = Math.max(a.y, b.y);
	const r = Math.min(right(a), right(b));
	const btm = Math.min(bottom(a), bottom(b));
	if (r <= x || btm <= y) return null;
	return {
		x,
		y,
		width: r - x,
		height: btm - y
	};
}
function contains(outer, inner, tol = 0) {
	return inner.x >= outer.x - tol && inner.y >= outer.y - tol && right(inner) <= right(outer) + tol && bottom(inner) <= bottom(outer) + tol;
}
var EPS = .5;
function parseRadius$1(s) {
	if (!s) return [
		0,
		0,
		0,
		0
	];
	const [a, b = a, c = a, d = b] = s.split(/\s+/).map((p) => parseFloat(p) || 0);
	return [
		a,
		b,
		c,
		d
	];
}
function isTransparentColor(c) {
	const t = c.trim().toLowerCase();
	if (!t || t === "transparent" || t === "none") return true;
	const m = t.match(/rgba?\(([^)]+)\)/);
	if (m) {
		const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
		if (parts.length === 4 && (isNaN(parts[3]) || parts[3] <= 0)) return true;
	}
	if (/^#[0-9a-f]{8}$/.test(t) && t.slice(-2) === "00") return true;
	return false;
}
function isOpaqueFill(node) {
	const s = node.style;
	if (s?.opacity !== void 0 && s.opacity < 1) return false;
	if (s?.filter) return false;
	const hasSolidColor = !!s?.backgroundColor && !isTransparentColor(s.backgroundColor);
	const hasImage = !!s?.backgroundImage;
	const isImageType = node.type === "IMAGE";
	return hasSolidColor || hasImage || isImageType;
}
function aCoversB(a, b, aEff, bEff) {
	if (a.geometry.rotation || b.geometry.rotation) return false;
	if (!contains(aEff, bEff, EPS)) return false;
	const ar = parseRadius$1(a.style?.borderRadius);
	const br = parseRadius$1(b.style?.borderRadius);
	const mL = b.geometry.x - a.geometry.x;
	const mT = b.geometry.y - a.geometry.y;
	const mR = a.geometry.x + a.geometry.width - (b.geometry.x + b.geometry.width);
	const mB = a.geometry.y + a.geometry.height - (b.geometry.y + b.geometry.height);
	if (ar[0] - Math.min(mL, mT) > br[0] + EPS) return false;
	if (ar[1] - Math.min(mR, mT) > br[1] + EPS) return false;
	if (ar[2] - Math.min(mR, mB) > br[2] + EPS) return false;
	if (ar[3] - Math.min(mL, mB) > br[3] + EPS) return false;
	return true;
}
function buildCtx(root) {
	const ctx = /* @__PURE__ */ new Map();
	const walkDown = (n, anc, parentEff) => {
		const selfBox = {
			x: n.geometry.x,
			y: n.geometry.y,
			width: n.geometry.width,
			height: n.geometry.height
		};
		const eff = n.isPageRoot ? selfBox : parentEff ? intersection(selfBox, parentEff) : selfBox;
		ctx.set(n.id, {
			node: n,
			ancestors: anc,
			descendants: /* @__PURE__ */ new Set(),
			effRect: eff
		});
		const nextAnc = new Set(anc).add(n.id);
		n.children?.forEach((c) => walkDown(c, nextAnc, eff));
	};
	walkDown(root, /* @__PURE__ */ new Set(), null);
	const walkUp = (n) => {
		const own = /* @__PURE__ */ new Set();
		for (const c of n.children ?? []) {
			const childDesc = walkUp(c);
			own.add(c.id);
			childDesc.forEach((id) => own.add(id));
		}
		ctx.get(n.id).descendants = own;
		return own;
	};
	walkUp(root);
	return ctx;
}
function findOccludedIds(root) {
	const ctx = buildCtx(root);
	const all = Array.from(ctx.values());
	const occluded = /* @__PURE__ */ new Set();
	for (const bCtx of all) {
		const B = bCtx.node;
		if (B.isPageRoot) continue;
		if (!bCtx.effRect) {
			occluded.add(B.id);
			continue;
		}
		for (const aCtx of all) {
			const A = aCtx.node;
			if (A.id === B.id) continue;
			if (A.renderOrder <= B.renderOrder) continue;
			if (bCtx.ancestors.has(A.id)) continue;
			if (bCtx.descendants.has(A.id)) continue;
			if (!aCtx.effRect) continue;
			if (!isOpaqueFill(A)) continue;
			if (!aCoversB(A, B, aCtx.effRect, bCtx.effRect)) continue;
			occluded.add(B.id);
			break;
		}
	}
	return occluded;
}
function pruneIds(node, ids) {
	if (!node.children) return;
	node.children = node.children.filter((c) => !ids.has(c.id));
	node.children.forEach((c) => pruneIds(c, ids));
}
function cullOccludedNodes(root) {
	const occluded = findOccludedIds(root);
	if (occluded.size === 0) return 0;
	pruneIds(root, occluded);
	return occluded.size;
}
function fillTreeMetadata(root, order) {
	let counter = 0;
	const walk = (node, depth, zIndex, parentId) => {
		node.depth = depth;
		node.zIndex = zIndex;
		node.renderOrder = counter++;
		node.parentId = parentId;
		const kids = node.children;
		if (!kids || kids.length === 0) return;
		if (order === "figma") for (let i = kids.length - 1; i >= 0; i--) {
			const siblingZ = kids.length - 1 - i;
			walk(kids[i], depth + 1, siblingZ, node.id);
		}
		else for (let i = 0; i < kids.length; i++) walk(kids[i], depth + 1, i, node.id);
	};
	walk(root, 0, 0, void 0);
}
function fillFigmaOrderTreeMetadata(root) {
	fillTreeMetadata(root, "figma");
}
function markAsImage(node, imageSource = "composite") {
	node.imageRole = "content";
	node.imageSource = imageSource;
	node.type = "IMAGE";
	node.children = void 0;
}
var SHAPE_OR_IMAGE_TYPES = new Set([
	"IMAGE",
	"VECTOR",
	"BOOLEAN_OPERATION",
	"ELLIPSE",
	"RECTANGLE",
	"LINE",
	"SUPPOSITIONAL"
]);
var CONTAINER_TYPES = new Set([
	"FRAME",
	"GROUP",
	"INSTANCE",
	"COMPONENT"
]);
var MIN_SHAPE_IMAGE_RATIO_FOR_TEXT_SUBTREE = .8;
function checkSubtree(node) {
	if (node.type === "TEXT") {
		if (isIconFontText(node)) return {
			textCount: 0,
			hasOther: false,
			shapeImageCount: 1,
			contentCount: 1
		};
		return {
			textCount: 1,
			hasOther: false,
			shapeImageCount: 0,
			contentCount: 1
		};
	}
	if (SHAPE_OR_IMAGE_TYPES.has(node.type)) return {
		textCount: 0,
		hasOther: false,
		shapeImageCount: 1,
		contentCount: 1
	};
	if (!CONTAINER_TYPES.has(node.type)) return {
		textCount: 0,
		hasOther: true,
		shapeImageCount: 0,
		contentCount: 0
	};
	let textCount = 0;
	let hasOther = false;
	let shapeImageCount = node.imageRole || node.imageUrl ? 1 : 0;
	let contentCount = node.imageRole || node.imageUrl ? 1 : 0;
	for (const c of node.children ?? []) {
		const r = checkSubtree(c);
		textCount += r.textCount;
		if (r.hasOther) hasOther = true;
		shapeImageCount += r.shapeImageCount;
		contentCount += r.contentCount;
	}
	return {
		textCount,
		hasOther,
		shapeImageCount,
		contentCount
	};
}
function hasHighShapeImageRatio(info) {
	if (info.contentCount === 0) return false;
	return info.shapeImageCount / info.contentCount >= MIN_SHAPE_IMAGE_RATIO_FOR_TEXT_SUBTREE;
}
function findFirstSemanticTextWithParent(node, parent) {
	if (node.type === "TEXT" && !isIconFontText(node)) return {
		text: node,
		parent
	};
	for (const c of node.children ?? []) {
		const found = findFirstSemanticTextWithParent(c, node);
		if (found) return found;
	}
}
function hasInstanceOwnedSemanticText(node) {
	const found = findFirstSemanticTextWithParent(node);
	return found?.parent?.type === "INSTANCE" && bboxOverlap(node.geometry, found.text.geometry);
}
function markShapeOnlySubtrees(node) {
	if (node.imageRole) return;
	if (node.imageUrl) return;
	if (!CONTAINER_TYPES.has(node.type)) {
		node.children?.forEach(markShapeOnlySubtrees);
		return;
	}
	const kids = node.children ?? [];
	const looksLikeGrid = kids.length >= 2 && !hasAnyOverlap(kids);
	const info = checkSubtree(node);
	if (!info.hasOther && !looksLikeGrid) {
		if (info.textCount === 0) {
			markAsImage(node);
			return;
		}
		if (info.textCount === 1) {
			if (!kids.some((k) => k.type === "TEXT") && !hasInstanceOwnedSemanticText(node) && hasHighShapeImageRatio(info)) {
				markAsImage(node);
				return;
			}
		}
	}
	node.children?.forEach(markShapeOnlySubtrees);
}
function bboxOverlap(a, b) {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function area(box) {
	return Math.max(0, box.width) * Math.max(0, box.height);
}
function intersectionArea(a, b) {
	const left = Math.max(a.x, b.x);
	const top = Math.max(a.y, b.y);
	const right$1 = Math.min(a.x + a.width, b.x + b.width);
	const bottom$1 = Math.min(a.y + a.height, b.y + b.height);
	return Math.max(0, right$1 - left) * Math.max(0, bottom$1 - top);
}
function mostlyInside(inner, outer) {
	const innerArea = area(inner);
	if (innerArea === 0) return false;
	return intersectionArea(inner, outer) / innerArea >= .8;
}
function hasAnyOverlap(nodes) {
	for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) if (bboxOverlap(nodes[i].geometry, nodes[j].geometry)) return true;
	return false;
}
function hasBaseSurfaceStyle(node) {
	const s = node.style;
	if (!s) return false;
	return Boolean(s.backgroundColor || s.backgroundImage || s.border || s.borderTop || s.borderRight || s.borderBottom || s.borderLeft || s.borderRadius);
}
function hasShadowStyle(node) {
	return Boolean(node.style?.boxShadow);
}
function isBackgroundLayerCandidate(node) {
	if ((node.children?.length ?? 0) > 0) return false;
	if (!(node.type === "IMAGE" || SHAPE_OR_IMAGE_TYPES.has(node.type))) return false;
	if (!hasBaseSurfaceStyle(node)) return false;
	if (node.geometry.width < 64 || node.geometry.height < 40) return false;
	if (area(node.geometry) < 4096) return false;
	return true;
}
function hasSemanticText(node) {
	if (node.type === "TEXT" && !isIconFontText(node)) return true;
	return node.children?.some(hasSemanticText) ?? false;
}
function isSemanticSibling(node) {
	if (node.type === "TEXT") return !isIconFontText(node);
	if (node.type === "INSTANCE" || node.type === "COMPONENT") return true;
	if (node.type === "FRAME" || node.type === "GROUP") return hasSemanticText(node);
	return false;
}
function backgroundLayerScore(candidate, parent, index, contained) {
	let score = 0;
	const reasons = [];
	if (candidate.imageSource === "vector") {
		score += 1;
		reasons.push("vector-source");
	}
	if (hasBaseSurfaceStyle(candidate)) {
		score += 3;
		reasons.push("surface-style");
	}
	if (hasShadowStyle(candidate)) {
		score += 1;
		reasons.push("shadow-style");
	}
	if (area(candidate.geometry) / Math.max(area(parent.geometry), 1) >= .05) {
		score += 2;
		reasons.push("large-surface");
	}
	const kids = parent.children ?? [];
	if (kids.length > 1) {
		const bottomness = index / (kids.length - 1);
		if (bottomness >= .75) {
			score += 3;
			reasons.push("near-bottom-layer");
		} else if (bottomness >= .35) {
			score += 1;
			reasons.push("lower-layer");
		}
	}
	score += Math.min(5, contained.length);
	reasons.push(`contained-semantic:${contained.length}`);
	return {
		score,
		reasons
	};
}
function isBackgroundLayerMatch(containedCount, score, reasons) {
	if (containedCount >= 2) return score >= 8;
	return containedCount === 1 && score >= 9 && reasons.includes("near-bottom-layer");
}
function detectBackgroundLayers(node) {
	const kids = node.children;
	if (kids && kids.length > 0) {
		for (let i = 0; i < kids.length; i++) {
			const candidate = kids[i];
			if (candidate.backgroundLayer) continue;
			if (isBackgroundLayerCandidate(candidate)) {
				const contained = kids.slice(0, i).filter((sibling) => isSemanticSibling(sibling) && mostlyInside(sibling.geometry, candidate.geometry));
				if (contained.length >= 1) {
					const { score, reasons } = backgroundLayerScore(candidate, node, i, contained);
					if (isBackgroundLayerMatch(contained.length, score, reasons)) {
						candidate.imageRole = "background";
						candidate.backgroundLayer = {
							score,
							containedNodeIds: contained.map((sibling) => sibling.id),
							reasons
						};
					}
				}
			}
		}
		kids.forEach(detectBackgroundLayers);
	}
}
function isMaterializableBackgroundContainer(node) {
	return node.imageRole === "background" && !!node.backgroundLayer && node.virtualContainer?.kind !== "background-container" && (node.children?.length ?? 0) === 0;
}
function backgroundContainerPlan(kids, backgroundIndex) {
	const background = kids[backgroundIndex];
	if (!isMaterializableBackgroundContainer(background)) return void 0;
	const contained = new Set(background.backgroundLayer.containedNodeIds);
	const wrappedNodes = [];
	const wrappedIndices = /* @__PURE__ */ new Set();
	for (let i = 0; i < backgroundIndex; i++) if (contained.has(kids[i].id)) {
		wrappedNodes.push(kids[i]);
		wrappedIndices.add(i);
	}
	if (wrappedNodes.length === 0) return void 0;
	const insertIndex = Math.min(...wrappedIndices);
	const spanIndices = /* @__PURE__ */ new Set();
	for (let i = insertIndex; i <= backgroundIndex; i++) {
		spanIndices.add(i);
		if (i !== backgroundIndex && !wrappedIndices.has(i)) return;
	}
	return {
		backgroundIndex,
		insertIndex,
		score: background.backgroundLayer.score,
		wrappedNodes,
		spanIndices
	};
}
function selectBackgroundContainerPlans(plans) {
	const selected = [];
	const used = /* @__PURE__ */ new Set();
	const byPriority = [...plans].sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		if (b.wrappedNodes.length !== a.wrappedNodes.length) return b.wrappedNodes.length - a.wrappedNodes.length;
		return a.spanIndices.size - b.spanIndices.size;
	});
	for (const plan of byPriority) {
		if ([...plan.spanIndices].some((index) => used.has(index))) continue;
		selected.push(plan);
		for (const index of plan.spanIndices) used.add(index);
	}
	return selected.sort((a, b) => b.backgroundIndex - a.backgroundIndex);
}
function applyBackgroundContainerPlan(kids, plan) {
	const background = kids[plan.backgroundIndex];
	background.type = "FRAME";
	background.children = plan.wrappedNodes;
	background.virtualContainer = {
		kind: "background-container",
		backgroundNodeId: background.id,
		wrappedNodeIds: plan.wrappedNodes.map((node) => node.id),
		reason: "background-layer"
	};
	const next = [];
	for (let i = 0; i < kids.length; i++) {
		if (i === plan.insertIndex) next.push(background);
		if (plan.spanIndices.has(i)) continue;
		next.push(kids[i]);
	}
	return next;
}
function materializeBackgroundContainers(node) {
	let kids = node.children;
	if (kids && kids.length > 0) {
		const plans = selectBackgroundContainerPlans(kids.map((_, index) => backgroundContainerPlan(kids, index)).filter((plan) => !!plan));
		for (const plan of plans) kids = applyBackgroundContainerPlan(kids, plan);
		node.children = kids;
		node.children.forEach(materializeBackgroundContainers);
	}
}
function mergeAllImageChildren(node) {
	node.children?.forEach(mergeAllImageChildren);
	if (node.imageRole) return;
	if (node.imageUrl) return;
	if (node.type === "TEXT" || node.type === "COMPONENT") return;
	const kids = node.children ?? [];
	if (kids.length === 0) return;
	if (!kids.every((k) => k.type === "IMAGE")) return;
	if (!hasAnyOverlap(kids)) return;
	markAsImage(node);
}
var ICON_FONT_FAMILIES = new Set([
	"HM Symbol",
	"Material Icons",
	"Material Symbols",
	"iconfont",
	"icomoon",
	"Font Awesome"
]);
function hasPUACharacter(s) {
	if (!s) return false;
	for (const ch of s) {
		const cp = ch.codePointAt(0);
		if (cp === void 0) continue;
		if (cp >= 57344 && cp <= 63743 || cp >= 983040 && cp <= 1048573 || cp >= 1048576 && cp <= 1114109) return true;
	}
	return false;
}
function isIconFontText(node) {
	if (node.type !== "TEXT") return false;
	const ff = node.style?.fontFamily;
	if (ff && ICON_FONT_FAMILIES.has(ff)) return true;
	if (hasPUACharacter(node.characters)) return true;
	return false;
}
function markIconFontTexts(node) {
	if (isIconFontText(node)) {
		node.type = "IMAGE";
		node.imageRole = "content";
		node.imageSource = "icon-font";
		node.characters = void 0;
	}
	node.children?.forEach(markIconFontTexts);
}
function validateRaw(raw) {
	if (!raw || typeof raw !== "object" || !Array.isArray(raw.content)) throw new Error("parseDesign: 输入不是有效的设计稿数据（期望 { assets, content: [...] }）");
	return raw;
}
function isRedundantWrapper(node) {
	if (node.isPageRoot) return false;
	if (node.type === "TEXT" || node.type === "IMAGE") return false;
	if (node.children?.length !== 1) return false;
	if (node.geometry.rotation) return false;
	if (node.style && Object.keys(node.style).length > 0) return false;
	return true;
}
function flattenRedundantWrappers(node) {
	node.children?.forEach(flattenRedundantWrappers);
	if (!node.children) return;
	node.children = node.children.flatMap((c) => isRedundantWrapper(c) ? c.children ?? [] : [c]);
}
function parseDesign(raw) {
	const root = parseNewFormat(validateRaw(raw));
	fillFigmaOrderTreeMetadata(root);
	flattenRedundantWrappers(root);
	markShapeOnlySubtrees(root);
	markIconFontTexts(root);
	mergeAllImageChildren(root);
	cullOccludedNodes(root);
	detectBackgroundLayers(root);
	fillFigmaOrderTreeMetadata(root);
	return root;
}
function parseDesignStage3(raw) {
	const root = parseDesign(raw);
	materializeBackgroundContainers(root);
	fillFigmaOrderTreeMetadata(root);
	return root;
}
var STAGE3_EXPORT_PIPELINE = [...[
	"flattenRedundantWrappers",
	"markShapeOnlySubtrees",
	"markIconFontTexts",
	"mergeAllImageChildren",
	"cullOccludedNodes",
	"detectBackgroundLayers"
], "materializeBackgroundContainers"];
[...[...[...STAGE3_EXPORT_PIPELINE, "normalizeLayerOrderForHtml"], "sortChildrenByYTopEdge"]];
function buildSourceById(sourceRaw) {
	const map = /* @__PURE__ */ new Map();
	const walk = (n) => {
		if (n && typeof n === "object" && typeof n.key === "string") {
			map.set(n.key, n);
			n.children?.forEach(walk);
		}
	};
	if (sourceRaw && typeof sourceRaw === "object") {
		const content = sourceRaw.content;
		if (Array.isArray(content)) content.forEach(walk);
	}
	return map;
}
function roundColor(n) {
	return Math.max(0, Math.min(255, Math.round(n)));
}
function clampAlpha(n) {
	return Math.max(0, Math.min(1, n));
}
function rawColor(red, green, blue, alpha) {
	return {
		type: "color",
		red: roundColor(red),
		green: roundColor(green),
		blue: roundColor(blue),
		alpha: clampAlpha(alpha)
	};
}
function parseColor(value) {
	if (!value) return void 0;
	const trimmed = value.trim();
	const hex = trimmed.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
	if (hex) {
		const expanded = hex[1].length <= 4 ? hex[1].split("").map((c) => `${c}${c}`).join("") : hex[1];
		const n = Number.parseInt(expanded, 16);
		const hasAlpha = expanded.length === 8;
		return rawColor(n >> (hasAlpha ? 24 : 16) & 255, n >> (hasAlpha ? 16 : 8) & 255, n >> (hasAlpha ? 8 : 0) & 255, hasAlpha ? (n & 255) / 255 : 1);
	}
	const rgba = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
	if (rgba) return rawColor(Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === void 0 ? 1 : Number(rgba[4]));
}
function parsePx(value) {
	if (!value) return void 0;
	const m = value.trim().match(/^(-?[\d.]+)px$/);
	return m ? Number(m[1]) : void 0;
}
function parseRadius(value) {
	if (!value) return void 0;
	const parts = value.trim().split(/\s+/).map(parsePx);
	if (parts.some((p) => p === void 0)) return void 0;
	if (parts.length === 1) return [
		parts[0],
		parts[0],
		parts[0],
		parts[0]
	];
	if (parts.length === 2) return [
		parts[0],
		parts[1],
		parts[0],
		parts[1]
	];
	if (parts.length === 3) return [
		parts[0],
		parts[1],
		parts[2],
		parts[1]
	];
	if (parts.length === 4) return [
		parts[0],
		parts[1],
		parts[2],
		parts[3]
	];
}
function markLossy(ctx, field) {
	ctx.lossyFields?.add(field);
}
function containsCssGradient(value) {
	return /\b(?:repeating-)?(?:linear|radial|conic)-gradient\(/i.test(value ?? "");
}
function extractFirstUrl(value) {
	if (!value) return void 0;
	const m = value.match(/url\((?:"([^"]+)"|'([^']+)'|([^)]*?))\)/);
	return m?.[1] ?? m?.[2] ?? m?.[3]?.trim();
}
function assetRefFor(url, assets) {
	if (!url) return void 0;
	const existing = assets.indexOf(url);
	if (existing >= 0) return `$${existing}`;
	assets.push(url);
	return `$${assets.length - 1}`;
}
function buildRawStyle(node, ctx) {
	const style = {
		origin_width: node.geometry.width,
		origin_height: node.geometry.height
	};
	if (node.geometry.rotation !== void 0) style.rotation_angle = node.geometry.rotation;
	const s = node.style;
	if (!s) return style;
	const bg = parseColor(s.backgroundColor);
	if (bg) style.background_color = bg;
	else if (s.backgroundColor) markLossy(ctx, "unsupported_background_color");
	const fg = parseColor(s.color);
	if (fg) style.font_color = fg;
	else if (s.color) markLossy(ctx, "unsupported_font_color");
	if (s.fontFamily) style.font_family = s.fontFamily;
	const fontSize = parsePx(s.fontSize);
	if (fontSize !== void 0) style.font_size = fontSize;
	if (s.fontWeight !== void 0) style.font_weight = s.fontWeight;
	const lineHeight = parsePx(s.lineHeight);
	if (lineHeight !== void 0) style.line_height = lineHeight;
	const letterSpacing = parsePx(s.letterSpacing);
	if (letterSpacing !== void 0) style.letter_spacing = letterSpacing;
	if (s.textAlign) style.text_align_horizontal = s.textAlign;
	if (s.verticalAlign) style.text_align_vertical = s.verticalAlign === "middle" ? "center" : s.verticalAlign;
	const radius = parseRadius(s.borderRadius);
	if (radius) style.round_corner = radius;
	else if (s.borderRadius) markLossy(ctx, "unsupported_border_radius");
	if (s.opacity !== void 0) style.opacity = s.opacity;
	if (containsCssGradient(s.backgroundImage)) markLossy(ctx, "gradient_background");
	const imageRef = assetRefFor(node.imageUrl ?? extractFirstUrl(s.backgroundImage), ctx.assets);
	if (imageRef) {
		style.background_image = imageRef;
		if (s.backgroundPosition) style.background_position = s.backgroundPosition;
		if (s.backgroundRepeat) style.background_repeat = s.backgroundRepeat;
		if (s.backgroundSize) style.background_size = s.backgroundSize;
	}
	return style;
}
function designNodeToRawNode(node, ctx = { assets: [] }) {
	const source = ctx.sourceById?.get(node.id);
	let extend = source?.extend ? { ...source.extend } : node.extend ? { ...node.extend } : void 0;
	if (node.imageSource === "vector" || node.imageSource === "composite" || node.imageSource === "icon-font") {
		if (!extend?.vector_merge && !extend?.icon && !extend?.vector_shape) markLossy(ctx, "inferred_vector_merge");
		(extend ??= {}).vector_merge = true;
	}
	if (node.imageRole) (extend ??= {}).image_role = node.imageRole;
	if (node.imageSource) (extend ??= {}).image_source = node.imageSource;
	if (node.backgroundLayer) (extend ??= {}).background_layer = {
		score: node.backgroundLayer.score,
		contained_node_ids: [...node.backgroundLayer.containedNodeIds],
		reasons: [...node.backgroundLayer.reasons]
	};
	if (node.virtualContainer) (extend ??= {}).virtual_container = {
		kind: node.virtualContainer.kind,
		background_node_id: node.virtualContainer.backgroundNodeId,
		wrapped_node_ids: [...node.virtualContainer.wrappedNodeIds],
		reason: node.virtualContainer.reason
	};
	const style = source?.style ? { ...source.style } : buildRawStyle(node, ctx);
	const raw = {
		key: node.id,
		name: node.name,
		type: node.type,
		box: {
			x: node.geometry.x,
			y: node.geometry.y,
			width: node.geometry.width,
			height: node.geometry.height
		},
		style
	};
	if (node.type === "TEXT" && node.characters !== void 0) raw.content = node.characters;
	if (extend && Object.keys(extend).length > 0) raw.extend = extend;
	if (source?.library_style !== void 0) raw.library_style = source.library_style;
	if (source?.component_instance !== void 0) raw.component_instance = source.component_instance;
	if (node.children && node.children.length > 0) raw.children = node.children.map((child) => designNodeToRawNode(child, ctx));
	return raw;
}
function metaObject(meta) {
	if (!meta) return {};
	if (typeof meta === "object" && !Array.isArray(meta)) return { ...meta };
	return { source_meta: meta };
}
function sourceAssets(sourceRaw) {
	if (!sourceRaw || typeof sourceRaw !== "object") return [];
	const assets = sourceRaw.assets;
	return Array.isArray(assets) ? assets.filter((a) => typeof a === "string") : [];
}
function sourceMeta(sourceRaw) {
	if (!sourceRaw || typeof sourceRaw !== "object") return void 0;
	return sourceRaw.meta;
}
function stage3ToRawMock(root, sourceRaw, sourcePath, opts = {}) {
	const assets = sourceAssets(sourceRaw);
	const lossyFields = /* @__PURE__ */ new Set();
	return {
		assets,
		content: [designNodeToRawNode(root, {
			assets,
			lossyFields,
			sourceById: buildSourceById(sourceRaw)
		})],
		meta: {
			...metaObject(sourceMeta(sourceRaw)),
			stage3_export: {
				source_mock: sourcePath,
				generated_stage: "stage3",
				lossy: true,
				lossy_fields: [...lossyFields].sort(),
				pipeline: [...STAGE3_EXPORT_PIPELINE],
				generated_at: opts.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString()
			}
		}
	};
}
function exportStage3RawMock(sourceRaw, opts = {}) {
	const { sourcePath = "inline", ...stage3Opts } = opts;
	return stage3ToRawMock(parseDesignStage3(sourceRaw), sourceRaw, sourcePath, stage3Opts);
}
function isStage3Convertible(data) {
	if (!data || typeof data !== "object") return false;
	const d = data;
	if (typeof d.meta?.version !== "string") return false;
	if (!Array.isArray(d.content) || d.content.length === 0) return false;
	if (d.meta?.stage3_export?.generated_stage === "stage3") return false;
	const f = d.content[0];
	if (typeof f?.key !== "string") return false;
	const b = f.box;
	return !!b && typeof b.x === "number" && typeof b.y === "number" && typeof b.width === "number" && typeof b.height === "number";
}
function countDslNodes(data) {
	if (!data || !Array.isArray(data.content)) return 0;
	let n = 0;
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		n++;
		if (Array.isArray(node.children)) for (const c of node.children) walk(c);
	};
	for (const root of data.content) walk(root);
	return n;
}
function tryPreStage3Convert(data, mode) {
	if (mode === "off") return {
		workingJson: data,
		timingMetadata: null,
		attempted: false
	};
	const convertible = isStage3Convertible(data);
	if (mode === "auto" && !convertible) return {
		workingJson: data,
		timingMetadata: null,
		attempted: false
	};
	try {
		const before = countDslNodes(data);
		const out = exportStage3RawMock(data, { sourcePath: "preStage3Convert" });
		const after = countDslNodes(out);
		return {
			workingJson: out,
			timingMetadata: {
				mode,
				before,
				after,
				reductionPct: before > 0 ? Number(((before - after) / before * 100).toFixed(1)) : 0,
				lossyFields: out?.meta?.stage3_export?.lossy_fields ?? []
			},
			attempted: true
		};
	} catch (e) {
		if (mode === "on") throw e;
		return {
			workingJson: data,
			timingMetadata: {
				mode,
				fallback: true,
				error: String(e?.message ?? e)
			},
			attempted: true
		};
	}
}
function convertBox(box, scaleX, scaleY) {
	const x = box[0] * scaleX;
	const y = box[1] * scaleY;
	const x2 = box[2] * scaleX;
	const y2 = box[3] * scaleY;
	return {
		x: Math.round(x * 100) / 100,
		y: Math.round(y * 100) / 100,
		width: Math.round((x2 - x) * 100) / 100,
		height: Math.round((y2 - y) * 100) / 100
	};
}
function parseYoloFloors(yoloData, options) {
	const { pageWidth, pageHeight } = options;
	const { imageWidth, imageHeight, predictions } = yoloData.result1.json;
	const scaleX = pageWidth / imageWidth;
	const scaleY = pageHeight / imageHeight;
	const predMap = /* @__PURE__ */ new Map();
	for (const p of predictions) predMap.set(p.box_id, p);
	const floorMap = /* @__PURE__ */ new Map();
	for (const p of predictions) {
		if (p.label === "Background") continue;
		const bounds = convertBox(p.box, scaleX, scaleY);
		floorMap.set(p.box_id, {
			label: p.label,
			...bounds,
			score: p.score,
			scrollable: p.scrollable,
			boxId: p.box_id,
			children: []
		});
	}
	const topFloors = [];
	for (const p of predictions) {
		if (p.label === "Background") continue;
		const floor = floorMap.get(p.box_id);
		if (!floor) continue;
		if (p.parent === -1) topFloors.push(floor);
		else {
			const parentFloor = floorMap.get(p.parent);
			if (parentFloor) parentFloor.children.push(floor);
			else topFloors.push(floor);
		}
	}
	topFloors.sort((a, b) => a.y - b.y);
	for (const f of topFloors) f.children.sort((a, b) => a.y - b.y || a.x - b.x);
	return topFloors;
}
var IOU_THRESHOLD = .5;
function calcIoU(a, b) {
	const x1 = Math.max(a.x, b.x);
	const y1 = Math.max(a.y, b.y);
	const x2 = Math.min(a.x + a.width, b.x + b.width);
	const y2 = Math.min(a.y + a.height, b.y + b.height);
	if (x2 <= x1 || y2 <= y1) return 0;
	const intersection$1 = (x2 - x1) * (y2 - y1);
	return intersection$1 / (a.width * a.height + b.width * b.height - intersection$1);
}
function flattenFloors(floors) {
	const result = [];
	function walk(list) {
		for (const f of list) {
			result.push(f);
			if (f.children.length > 0) walk(f.children);
		}
	}
	walk(floors);
	return result;
}
function markComponentsByYolo(root, floors) {
	const allFloors = flattenFloors(floors);
	if (allFloors.length === 0) return;
	const nodes = [];
	function collectNodes(node) {
		nodes.push(node);
		node.children?.forEach(collectNodes);
	}
	collectNodes(root);
	const candidates = [];
	for (let ni = 0; ni < nodes.length; ni++) {
		const node = nodes[ni];
		for (let fi = 0; fi < allFloors.length; fi++) {
			const iou = calcIoU(node, allFloors[fi]);
			if (iou >= IOU_THRESHOLD) candidates.push([
				iou,
				ni,
				fi
			]);
		}
	}
	candidates.sort((a, b) => b[0] - a[0]);
	const usedFloors = /* @__PURE__ */ new Set();
	const usedNodes = /* @__PURE__ */ new Set();
	for (const [iou, ni, fi] of candidates) {
		if (usedFloors.has(fi) || usedNodes.has(ni)) continue;
		usedFloors.add(fi);
		usedNodes.add(ni);
		const node = nodes[ni];
		const floor = allFloors[fi];
		const inferredTags = new Set([
			"div",
			"span",
			"svg"
		]);
		if (!node.componentName || inferredTags.has(node.componentName)) node.componentName = floor.label;
		const yoloMeta = {
			name: floor.label,
			score: floor.score,
			scrollable: floor.scrollable,
			source: "yolo",
			iou: Math.round(iou * 1e3) / 1e3
		};
		node.componentInfo = node.componentInfo ? {
			...node.componentInfo,
			_yolo: yoloMeta
		} : yoloMeta;
	}
}
const DEFAULT_COMPRESS_OPTIONS = {
	simplifyId: false,
	removeCoordinates: true,
	removeName: true,
	keepImageName: true,
	keepAllName: true,
	omitDefaults: true,
	convertColors: true,
	removeUnits: true,
	minify: true
};
function rgbToHex(color) {
	if (!color) return color;
	if (color.startsWith("#")) return color;
	const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
	if (rgbMatch) {
		const [, r, g, b] = rgbMatch;
		return rgbComponentsToHex(parseInt(r), parseInt(g), parseInt(b));
	}
	const rgbaMatch = color.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
	if (rgbaMatch) {
		const [, r, g, b, a] = rgbaMatch;
		const alpha = parseFloat(a);
		if (alpha >= .99) return rgbComponentsToHex(parseInt(r), parseInt(g), parseInt(b));
		return rgbComponentsToHex(parseInt(r), parseInt(g), parseInt(b), alpha);
	}
	return color;
}
function rgbComponentsToHex(r, g, b, a) {
	const clamp = (n) => {
		if (!Number.isFinite(n)) return 0;
		return Math.max(0, Math.min(255, Math.round(n)));
	};
	const toHex = (n) => clamp(n).toString(16).padStart(2, "0");
	const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	if (a !== void 0 && a < 1) {
		const hex8 = hex + toHex(Math.round(a * 255));
		if (canSimplifyHex8(hex8)) return `#${hex8[1]}${hex8[3]}${hex8[5]}${hex8[7]}`;
		return hex8;
	}
	if (canSimplifyHex(hex)) return `#${hex[1]}${hex[3]}${hex[5]}`;
	return hex;
}
function canSimplifyHex(hex) {
	return hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6];
}
function canSimplifyHex8(hex) {
	return hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6] && hex[7] === hex[8];
}
function extractNumber(value) {
	if (value === void 0 || value === null) return void 0;
	if (typeof value === "number") return value;
	const match = value.match(/^([\d.]+)/);
	if (match) {
		const num = parseFloat(match[1]);
		return Number.isInteger(num) ? num : num;
	}
}
function simplifyBorderRadius(value) {
	if (!value) return void 0;
	const numbers = value.match(/[\d.]+/g);
	if (!numbers) return void 0;
	if (numbers.length === 1) return parseFloat(numbers[0]);
	if (numbers.length === 4) {
		const nums = numbers.map((n) => parseFloat(n));
		if (nums.every((n) => n === nums[0])) return nums[0];
		return nums.join(" ");
	}
	return value;
}
function simplifyJustify(value) {
	if (!value || value === "flex-start") return void 0;
	return {
		"flex-end": "end",
		"space-between": "between",
		"space-around": "around",
		"space-evenly": "evenly"
	}[value] || value;
}
function simplifyAlign(value) {
	if (!value || value === "flex-start") return void 0;
	return { "flex-end": "end" }[value] || value;
}
function isEmptyObject(obj) {
	if (!obj) return true;
	return Object.keys(obj).length === 0;
}
var idCounter$1 = 0;
var idMap$1 = /* @__PURE__ */ new Map();
function compressDSL(node, options) {
	const opts = {
		...DEFAULT_COMPRESS_OPTIONS,
		...options
	};
	if (opts.simplifyId) {
		idCounter$1 = 0;
		idMap$1.clear();
	}
	return compressNode$1(node, opts);
}
function compressNode$1(node, opts) {
	const result = {
		id: getCompressedId(node.id, opts),
		type: node.type,
		w: node.width,
		h: node.height
	};
	if (shouldKeepName(node, opts)) result.name = node.name;
	if (node.type === "TEXT" && node.characters) result.text = node.characters;
	if (node.imageRole) result.role = node.imageRole === "background" ? "bg" : "img";
	const layout = compressLayout(node.layout, opts);
	if (!isEmptyObject(layout)) result.layout = layout;
	const styles = compressStyles(node.styles, opts);
	if (!isEmptyObject(styles)) result.styles = styles;
	if (node.children && node.children.length > 0) result.children = node.children.map((child) => compressNode$1(child, opts));
	return result;
}
function getCompressedId(id, opts) {
	if (!opts.simplifyId) return id;
	if (!idMap$1.has(id)) idMap$1.set(id, ++idCounter$1);
	return idMap$1.get(id);
}
function compressLayout(layout, opts) {
	if (!layout) return void 0;
	const result = {};
	if (layout.flexDirection) result.flexDirection = layout.flexDirection;
	if (layout.flexWrap === "wrap") result.wrap = true;
	const justify = opts.omitDefaults ? simplifyJustify(layout.justifyContent) : layout.justifyContent;
	if (justify) result.justifyContent = justify;
	const align = opts.omitDefaults ? simplifyAlign(layout.alignItems) : layout.alignItems;
	if (align) result.alignItems = align;
	if (layout.gap && layout.gap > 0) result.gap = layout.gap;
	if (layout.paddingTop && layout.paddingTop > 0) result.pt = layout.paddingTop;
	if (layout.paddingRight && layout.paddingRight > 0) result.pr = layout.paddingRight;
	if (layout.paddingBottom && layout.paddingBottom > 0) result.pb = layout.paddingBottom;
	if (layout.paddingLeft && layout.paddingLeft > 0) result.pl = layout.paddingLeft;
	if (layout.marginTop && layout.marginTop > 0) result.mt = layout.marginTop;
	if (layout.marginRight && layout.marginRight > 0) result.mr = layout.marginRight;
	if (layout.marginBottom && layout.marginBottom > 0) result.mb = layout.marginBottom;
	if (layout.marginLeft && layout.marginLeft > 0) result.ml = layout.marginLeft;
	return result;
}
function compressStyles(styles, opts) {
	if (!styles) return void 0;
	const result = {};
	if (styles.background) result.bg = opts.convertColors ? rgbToHex(styles.background) : styles.background;
	if (styles.border) result.border = opts.convertColors ? convertBorderColor(styles.border) : styles.border;
	if (styles.borderRadius) result.borderRadius = opts.removeUnits ? simplifyBorderRadius(styles.borderRadius) : styles.borderRadius;
	if (styles.boxShadow) result.boxShadow = opts.convertColors ? convertShadowColor(styles.boxShadow) : styles.boxShadow;
	if (styles.opacity !== void 0 && styles.opacity < 1) result.opacity = styles.opacity;
	if (styles.color) result.color = opts.convertColors ? rgbToHex(styles.color) : styles.color;
	if (styles.fontFamily) result.fontFamily = styles.fontFamily;
	if (styles.fontSize) result.fontSize = opts.removeUnits ? extractNumber(styles.fontSize) : void 0;
	if (styles.fontWeight) result.fontWeight = styles.fontWeight;
	if (styles.lineHeight) result.lineHeight = extractNumber(styles.lineHeight);
	if (styles.letterSpacing) {
		const ls = extractNumber(styles.letterSpacing);
		if (ls && ls !== 0) result.letterSpacing = ls;
	}
	if (styles.textAlign && styles.textAlign !== "left") result.textAlign = styles.textAlign;
	return result;
}
function convertBorderColor(border) {
	return border.replace(/rgb\([^)]+\)/g, (match) => rgbToHex(match));
}
function convertShadowColor(shadow) {
	return shadow.replace(/rgba?\([^)]+\)/g, (match) => rgbToHex(match));
}
function shouldKeepName(node, opts) {
	if (opts.keepAllName) return true;
	if (opts.keepImageName) return [
		"ICON",
		"IMAGE",
		"VECTOR"
	].includes(node.type);
	return false;
}
const DEFAULT_ARKTS_OPTIONS = {
	keepMeta: true,
	simplifyId: false,
	minify: true
};
const CONTAINER_COMPONENT_LABELS = new Set([
	"List",
	"Grid",
	"Tabs",
	"Swiper",
	"Scroll",
	"Dialog",
	"Sheet",
	"Modal",
	"Drawer",
	"Navigation",
	"TabBar"
]);
const ATOMIC_COMPONENT_LABELS = new Set([
	"StatusBar",
	"Search",
	"SegmentButton",
	"Button",
	"Input",
	"Switch",
	"Slider",
	"Checkbox",
	"Radio",
	"Avatar",
	"Badge",
	"Chip",
	"Tag",
	"Divider",
	"Progress"
]);
function hasImageFill$1(node) {
	return Array.isArray(node.fills) && node.fills.some((f) => f.type === "IMAGE" && f.visible !== false);
}
var YOLO_VALID_LABELS = new Set([...CONTAINER_COMPONENT_LABELS, ...ATOMIC_COMPONENT_LABELS]);
var INFERRED_TAGS = new Set([
	"div",
	"span",
	"svg"
]);
var BUTTON_KEYWORDS = [
	"button",
	"btn",
	"按钮"
];
var INPUT_KEYWORDS = [
	"input",
	"textfield",
	"textarea",
	"输入框"
];
var INPUT_PLACEHOLDER_KEYWORDS = [
	"请输入",
	"请填写",
	"placeholder"
];
var SEARCH_KEYWORDS = ["search", "搜索"];
var TOGGLE_KEYWORDS = [
	"toggle",
	"switch",
	"开关"
];
function nameContains(name, keywords) {
	if (!name) return false;
	const lower = name.toLowerCase();
	return keywords.some((kw) => lower.includes(kw));
}
function getComponentName(node) {
	const info = node.componentInfo;
	if (!info) return void 0;
	return info.name || info.componentName;
}
function mapComponent(node) {
	const { type, name, children, layout } = node;
	const nameOrComp = getComponentName(node) || name || "";
	if (node.componentName && !INFERRED_TAGS.has(node.componentName) && YOLO_VALID_LABELS.has(node.componentName)) return node.componentName;
	if (type === "TEXT") return "Text";
	if (type === "IMAGE" || type === "ICON" || type === "VECTOR") return "Image";
	if (type === "INSTANCE" || type === "COMPONENT") {
		if (nameContains(nameOrComp, BUTTON_KEYWORDS)) return "Button";
		if (nameContains(nameOrComp, INPUT_KEYWORDS)) return "TextInput";
		if (nameContains(nameOrComp, SEARCH_KEYWORDS)) return "Search";
		if (nameContains(nameOrComp, TOGGLE_KEYWORDS)) return "Toggle";
	}
	if ((!children || children.length === 0) && (hasImageFill$1(node) || node.shouldBeImage)) return "Image";
	if (hasPlaceholderChild(node)) return "TextInput";
	if (children && children.length > 0 && layout?.flexDirection) return layout.flexDirection === "row" ? "Row" : "Column";
	if (children && children.length > 0) return "Column";
	return "Column";
}
function hasPlaceholderChild(node) {
	if (!node.children || node.children.length === 0) return false;
	return node.children.some((child) => {
		if (child.type !== "TEXT") return false;
		return nameContains(child.characters, INPUT_PLACEHOLDER_KEYWORDS) || nameContains(child.name, INPUT_PLACEHOLDER_KEYWORDS);
	});
}
var JUSTIFY_MAP = {
	"flex-start": "FlexAlign.Start",
	"center": "FlexAlign.Center",
	"flex-end": "FlexAlign.End",
	"space-between": "FlexAlign.SpaceBetween",
	"space-around": "FlexAlign.SpaceAround",
	"space-evenly": "FlexAlign.SpaceEvenly"
};
var ROW_ALIGN_MAP = {
	"flex-start": "VerticalAlign.Top",
	"center": "VerticalAlign.Center",
	"flex-end": "VerticalAlign.Bottom",
	"stretch": "VerticalAlign.Top"
};
var COLUMN_ALIGN_MAP = {
	"flex-start": "HorizontalAlign.Start",
	"center": "HorizontalAlign.Center",
	"flex-end": "HorizontalAlign.End",
	"stretch": "HorizontalAlign.Start"
};
var TEXT_ALIGN_MAP = {
	"center": "TextAlign.Center",
	"right": "TextAlign.End",
	"justify": "TextAlign.JUSTIFY"
};
var DECORATION_MAP = {
	"underline": "TextDecorationType.Underline",
	"line-through": "TextDecorationType.LineThrough",
	"overline": "TextDecorationType.Overline"
};
function mapJustifyContent(value) {
	if (!value) return void 0;
	return JUSTIFY_MAP[value];
}
function mapAlignItems(value, direction) {
	if (!value) return void 0;
	return (direction === "row" ? ROW_ALIGN_MAP : COLUMN_ALIGN_MAP)[value];
}
function mapTextAlign(value) {
	if (!value || value === "left") return void 0;
	return TEXT_ALIGN_MAP[value];
}
function mapTextDecoration(value) {
	if (!value || value === "none" || value === "unset") return void 0;
	return DECORATION_MAP[value.toLowerCase()];
}
function parseBorder(border) {
	if (!border) return void 0;
	const match = border.match(/^([\d.]+)px\s+(solid|dashed|dotted)\s+(.+)$/i);
	if (!match) return void 0;
	const width = parseFloat(match[1]);
	const cssStyle = match[2].toLowerCase();
	return {
		width,
		color: rgbToHex(match[3].trim()),
		style: {
			"solid": "BorderStyle.Solid",
			"dashed": "BorderStyle.Dashed",
			"dotted": "BorderStyle.Dotted"
		}[cssStyle] || "BorderStyle.Solid"
	};
}
function parseShadow(shadow) {
	if (!shadow) return void 0;
	const segments = splitShadowSegments(shadow);
	const results = [];
	for (const seg of segments) {
		const parsed = parseSingleShadow(seg.trim());
		if (parsed) results.push(parsed);
	}
	if (results.length === 0) return void 0;
	return results.length === 1 ? results[0] : results;
}
function splitShadowSegments(shadow) {
	const segments = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < shadow.length; i++) if (shadow[i] === "(") depth++;
	else if (shadow[i] === ")") depth--;
	else if (shadow[i] === "," && depth === 0) {
		segments.push(shadow.slice(start, i));
		start = i + 1;
	}
	segments.push(shadow.slice(start));
	return segments.filter((s) => s.trim().length > 0);
}
function parseSingleShadow(seg) {
	let isInset = false;
	if (/^inset\s+/i.test(seg)) {
		isInset = true;
		seg = seg.replace(/^inset\s+/i, "");
	}
	const match4 = seg.match(/^(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px\s+(.+)$/);
	if (match4) {
		const result = {
			offsetX: parseFloat(match4[1]),
			offsetY: parseFloat(match4[2]),
			radius: parseFloat(match4[3]),
			spread: parseFloat(match4[4]) || void 0,
			color: rgbToHex(match4[5].trim())
		};
		if (isInset) result.inset = true;
		return result;
	}
	const match3 = seg.match(/^(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(.+)$/);
	if (match3) {
		const result = {
			offsetX: parseFloat(match3[1]),
			offsetY: parseFloat(match3[2]),
			radius: parseFloat(match3[3]),
			color: rgbToHex(match3[4].trim())
		};
		if (isInset) result.inset = true;
		return result;
	}
}
function parseBorderRadius(value) {
	if (!value) return void 0;
	const numbers = value.match(/[\d.]+/g);
	if (!numbers) return void 0;
	if (numbers.length === 1) return parseFloat(numbers[0]);
	if (numbers.length >= 4) {
		const nums = numbers.map((n) => parseFloat(n));
		if (nums.every((n) => n === nums[0])) return nums[0];
		return {
			topLeft: nums[0],
			topRight: nums[1],
			bottomRight: nums[2],
			bottomLeft: nums[3]
		};
	}
	return parseFloat(numbers[0]);
}
function colorToHex(color) {
	if (!color) return void 0;
	return rgbToHex(color);
}
function normalizeLineHeight(lineHeight, fontSize) {
	if (lineHeight === void 0 || lineHeight === null) return void 0;
	let value;
	let hasPxUnit = false;
	if (typeof lineHeight === "string") {
		hasPxUnit = /px\s*$/i.test(lineHeight);
		const match = lineHeight.match(/^([\d.]+)/);
		if (!match) return void 0;
		value = parseFloat(match[1]);
	} else value = lineHeight;
	if (hasPxUnit) return Math.round(value);
	if (value <= 5 && fontSize && fontSize > 0) return Math.round(value * fontSize);
	return Math.round(value);
}
function hasImageFill(node) {
	return Array.isArray(node.fills) && node.fills.some((f) => f.type === "IMAGE" && f.visible !== false);
}
var idCounter = 0;
var idMap = /* @__PURE__ */ new Map();
function compressToArkTs(node, options) {
	const opts = {
		...DEFAULT_ARKTS_OPTIONS,
		...options
	};
	if (opts.simplifyId) {
		idCounter = 0;
		idMap.clear();
	}
	return compressNode(node, opts);
}
function compressNode(node, opts) {
	const component = mapComponent(node);
	const result = { component };
	if (opts.simplifyId) {
		if (!idMap.has(node.id)) idMap.set(node.id, ++idCounter);
		result.id = String(idMap.get(node.id));
	} else result.id = node.id;
	result.width = node.width;
	result.height = node.height;
	applyLayout$1(result, node);
	applyStyles(result, node);
	if (component === "Text") applyTextAttrs(result, node);
	if (component === "Image" || hasImageFill(node) || node.shouldBeImage) applyImageAttrs(result, node);
	if (opts.keepMeta) applyMeta(result, node);
	if (node.children && node.children.length > 0) result.children = node.children.map((child) => compressNode(child, opts));
	return result;
}
function applyLayout$1(result, node) {
	const layout = node.layout;
	if (!layout) return;
	if (layout.gap && layout.gap > 0) result.space = layout.gap;
	const jc = mapJustifyContent(layout.justifyContent);
	if (jc) result.justifyContent = jc;
	const ai = mapAlignItems(layout.alignItems, layout.flexDirection);
	if (ai) result.alignItems = ai;
	const padding = buildEdges(layout.paddingTop, layout.paddingRight, layout.paddingBottom, layout.paddingLeft);
	if (padding) result.padding = padding;
	const margin = buildEdges(layout.marginTop, layout.marginRight, layout.marginBottom, layout.marginLeft);
	if (margin) result.margin = margin;
}
function applyStyles(result, node) {
	const styles = node.styles;
	if (!styles) return;
	if (styles.background) {
		const bg = styles.background;
		const hasUrl = /url\s*\(/i.test(bg);
		const hasGradient = /gradient\s*\(/i.test(bg);
		if (hasUrl && hasGradient) {
			const gradientOnly = extractGradient$1(bg);
			if (gradientOnly) result.linearGradient = gradientOnly;
		} else if (hasUrl) {} else if (hasGradient) result.linearGradient = bg;
		else result.backgroundColor = colorToHex(bg);
	}
	if (styles.borderRadius) result.borderRadius = parseBorderRadius(styles.borderRadius);
	if (styles.border) result.border = parseBorder(styles.border);
	if (styles.boxShadow) result.shadow = parseShadow(styles.boxShadow);
	if (styles.opacity !== void 0 && styles.opacity < 1) result.opacity = styles.opacity;
}
function applyTextAttrs(result, node) {
	if (node.characters) result.content = node.characters;
	const styles = node.styles;
	if (!styles) return;
	if (styles.color) result.fontColor = colorToHex(styles.color);
	if (styles.fontFamily) result.fontFamily = styles.fontFamily;
	if (styles.fontWeight) result.fontWeight = styles.fontWeight;
	const fontSize = styles.fontSize ? extractNumber(styles.fontSize) : void 0;
	if (fontSize) result.fontSize = fontSize;
	const lh = normalizeLineHeight(styles.lineHeight, fontSize);
	if (lh) result.lineHeight = lh;
	const ls = styles.letterSpacing ? extractNumber(styles.letterSpacing) : void 0;
	if (ls && ls !== 0) result.letterSpacing = ls;
	const ta = mapTextAlign(styles.textAlign);
	if (ta) result.textAlign = ta;
	const dec = mapTextDecoration(styles.textDecoration);
	if (dec) result.decoration = { type: dec };
}
function extractGradient$1(bg) {
	const gradientParts = splitCssLayers(bg).filter((s) => /gradient\s*\(/i.test(s) && !/url\s*\(/i.test(s));
	return gradientParts.length > 0 ? gradientParts.join(", ") : void 0;
}
function splitCssLayers(value) {
	const result = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < value.length; i++) if (value[i] === "(") depth++;
	else if (value[i] === ")") depth--;
	else if (value[i] === "," && depth === 0) {
		result.push(value.slice(start, i).trim());
		start = i + 1;
	}
	result.push(value.slice(start).trim());
	return result.filter((s) => s.length > 0);
}
function sanitizeId(id) {
	return id.replace(/[:/\\]/g, "-");
}
function applyImageAttrs(result, node) {
	if (node.blobPath) result.src = node.blobPath;
	else result.src = `./assets/${sanitizeId(node.id)}.png`;
}
function applyMeta(result, node) {
	const meta = {};
	let hasMeta = false;
	if (node.id) {
		meta.octoId = node.id;
		hasMeta = true;
	}
	if (node.name) {
		meta.octoName = node.name;
		hasMeta = true;
	}
	if (node.type) {
		meta.octoType = node.type;
		hasMeta = true;
	}
	if (node.componentInfo) {
		meta.componentInfo = node.componentInfo;
		hasMeta = true;
	}
	if (node.imageRole) {
		meta.role = node.imageRole === "background" ? "bg" : "img";
		hasMeta = true;
	}
	if (node.rotation && node.rotation !== 0) {
		meta.rotation = node.rotation;
		hasMeta = true;
	}
	if (node.x != null) {
		meta.x = node.x;
		hasMeta = true;
	}
	if (node.y != null) {
		meta.y = node.y;
		hasMeta = true;
	}
	if (hasMeta) result.meta = meta;
}
function buildEdges(top, right$1, bottom$1, left) {
	const result = {};
	let hasValue = false;
	if (top && top > 0) {
		result.top = top;
		hasValue = true;
	}
	if (right$1 && right$1 > 0) {
		result.right = right$1;
		hasValue = true;
	}
	if (bottom$1 && bottom$1 > 0) {
		result.bottom = bottom$1;
		hasValue = true;
	}
	if (left && left > 0) {
		result.left = left;
		hasValue = true;
	}
	return hasValue ? result : void 0;
}
var ALIGN_ITEMS_MAP = {
	"VerticalAlign.Top": "Start",
	"VerticalAlign.Center": "Center",
	"VerticalAlign.Bottom": "End",
	"HorizontalAlign.Start": "Start",
	"HorizontalAlign.Center": "Center",
	"HorizontalAlign.End": "End"
};
function stripEnumPrefix(value) {
	if (!value) return void 0;
	const dot = value.lastIndexOf(".");
	return dot >= 0 ? value.slice(dot + 1) : value;
}
function mapAlignItemsValue(value) {
	if (!value) return void 0;
	return ALIGN_ITEMS_MAP[value] ?? stripEnumPrefix(value);
}
function toArkUiDsl(node, options = {}) {
	return {
		page: {
			name: options.pageName || node.meta?.octoName || "Page",
			description: options.pageDescription
		},
		ui: convertNode(node)
	};
}
function convertNode(node) {
	const result = { componentName: node.component };
	if (node.content) result.content = node.content;
	if (node.src) result.src = node.src;
	const styles = buildStyles(node);
	if (styles && Object.keys(styles).length > 0) result.styles = styles;
	if (node.children && node.children.length > 0) {
		const bgSrc = extractBackgroundImage(node.children);
		if (bgSrc) {
			if (!result.styles) result.styles = {};
			result.styles.backgroundImage = bgSrc;
			result.styles.backgroundImageSize = "Cover";
		}
		const normalChildren = node.children.filter((c) => c.meta?.role !== "bg");
		if (normalChildren.length > 0) result.children = normalChildren.map(convertNode);
	}
	extractComponentSemantics(result);
	const meta = buildMeta(node);
	if (meta) result.meta = meta;
	return result;
}
function extractBackgroundImage(children) {
	return children.find((c) => c.meta?.role === "bg" && c.component === "Image")?.src;
}
var PLACEHOLDER_KEYWORDS = [
	"请输入",
	"请填写",
	"placeholder",
	"搜索",
	"search",
	"输入"
];
function looksLikePlaceholder(text) {
	const lower = text.toLowerCase();
	return PLACEHOLDER_KEYWORDS.some((kw) => lower.includes(kw));
}
function extractComponentSemantics(node) {
	const { componentName, children } = node;
	if (componentName === "Button" && !node.content && children?.length) {
		const textChild = findSingleTextChild(children);
		if (textChild) {
			node.content = textChild.content;
			mergeTextStylesToParent(node, textChild);
			delete node.children;
		}
	}
	if (componentName === "TextInput" && children?.length) {
		const textChild = findSingleTextChild(children);
		if (textChild?.content) {
			const propKey = looksLikePlaceholder(textChild.content) ? "placeholder" : "text";
			node.props = {
				...node.props,
				[propKey]: textChild.content
			};
			delete node.children;
		}
	}
}
function mergeTextStylesToParent(parent, textChild) {
	const ts = textChild.styles;
	if (!ts) return;
	const textKeys = [
		"fontSize",
		"fontColor",
		"fontWeight",
		"fontFamily",
		"lineHeight",
		"letterSpacing",
		"textAlign"
	];
	if (!parent.styles) parent.styles = {};
	for (const key of textKeys) if (ts[key] != null && parent.styles[key] == null) parent.styles[key] = ts[key];
}
function findSingleTextChild(children) {
	if (children.length === 1 && children[0].componentName === "Text") return children[0];
	if (children.length === 1 && children[0].children?.length === 1) {
		const grandChild = children[0].children[0];
		if (grandChild.componentName === "Text") return grandChild;
	}
}
function buildStyles(node) {
	const s = {};
	if (node.width != null) s.width = node.width;
	if (node.height != null) s.height = node.height;
	if (node.layoutWeight != null) s.layoutWeight = node.layoutWeight;
	if (node.backgroundColor) s.backgroundColor = node.backgroundColor;
	if (node.linearGradient) s.linearGradient = node.linearGradient;
	if (node.border) s.border = convertBorder(node.border);
	if (node.borderRadius != null) s.borderRadius = convertBorderRadius(node.borderRadius);
	if (node.opacity != null) s.opacity = node.opacity;
	if (node.shadow) s.shadow = convertShadow(node.shadow);
	if (node.padding) s.padding = simplifyEdges(node.padding);
	if (node.margin) s.margin = simplifyEdges(node.margin);
	if (node.justifyContent) s.justifyContent = stripEnumPrefix(node.justifyContent);
	if (node.alignItems) s.alignItems = mapAlignItemsValue(node.alignItems);
	if (node.space != null) s.space = node.space;
	if (node.fontSize != null) s.fontSize = node.fontSize;
	if (node.fontColor) s.fontColor = node.fontColor;
	if (node.fontWeight != null) s.fontWeight = node.fontWeight;
	if (node.fontFamily) s.fontFamily = node.fontFamily;
	if (node.lineHeight != null) s.lineHeight = node.lineHeight;
	if (node.letterSpacing != null) s.letterSpacing = node.letterSpacing;
	if (node.textAlign) s.textAlign = stripEnumPrefix(node.textAlign);
	if (node.maxLines != null) s.maxLines = node.maxLines;
	if (node.decoration) s.decoration = convertDecoration(node.decoration);
	if (node.imageFit) s.objectFit = stripEnumPrefix(node.imageFit);
	return Object.keys(s).length > 0 ? s : void 0;
}
function convertBorder(b) {
	return {
		width: b.width,
		color: b.color,
		style: b.style ? stripEnumPrefix(b.style) : void 0
	};
}
function convertSingleShadow(s) {
	const result = {
		radius: s.radius,
		color: s.color
	};
	if (s.offsetX != null) result.offsetX = s.offsetX;
	if (s.offsetY != null) result.offsetY = s.offsetY;
	if (s.spread != null) result.spread = s.spread;
	return result;
}
function convertShadow(shadow) {
	if (Array.isArray(shadow)) return shadow.map(convertSingleShadow);
	return convertSingleShadow(shadow);
}
function convertDecoration(d) {
	return {
		type: stripEnumPrefix(d.type) || d.type,
		color: d.color
	};
}
function convertBorderRadius(r) {
	return r;
}
function simplifyEdges(edges) {
	const { top, right: right$1, bottom: bottom$1, left } = edges;
	const values = [
		top ?? 0,
		right$1 ?? 0,
		bottom$1 ?? 0,
		left ?? 0
	];
	if (values.every((v) => v === values[0]) && values[0] > 0) return values[0];
	const result = {};
	if (top && top > 0) result.top = top;
	if (right$1 && right$1 > 0) result.right = right$1;
	if (bottom$1 && bottom$1 > 0) result.bottom = bottom$1;
	if (left && left > 0) result.left = left;
	return result;
}
function buildMeta(node) {
	const src = node.meta;
	if (!src) return void 0;
	const meta = {};
	let has = false;
	if (src.octoId) {
		meta.octoId = src.octoId;
		has = true;
	}
	if (src.octoName) {
		meta.octoName = src.octoName;
		has = true;
	}
	if (src.octoType) {
		meta.octoType = src.octoType;
		has = true;
	}
	if (src.componentInfo) {
		meta.componentInfo = {
			componentName: src.componentInfo.name || src.componentInfo.componentName,
			componentDescription: src.componentInfo.description || src.componentInfo.componentDescription
		};
		has = true;
	}
	if (src.x != null && src.y != null && node.width != null && node.height != null) {
		const w = typeof node.width === "number" ? node.width : parseFloat(node.width);
		const h = typeof node.height === "number" ? node.height : parseFloat(node.height);
		if (!isNaN(w) && !isNaN(h)) {
			meta.bbox = [
				src.x,
				src.y,
				src.x + w,
				src.y + h
			];
			has = true;
		}
	}
	return has ? meta : void 0;
}
function convertTreeToYoloPredictions(root, options) {
	const { pageWidth, pageHeight, originalYolo } = options;
	const { imageWidth, imageHeight } = originalYolo.result1.json;
	const scaleX = pageWidth / imageWidth;
	const scaleY = pageHeight / imageHeight;
	const predictions = [];
	let nextBoxId = 0;
	const nodeIdToBoxId = /* @__PURE__ */ new Map();
	function assignIds(node) {
		nodeIdToBoxId.set(node.id, nextBoxId++);
		node.children?.forEach(assignIds);
	}
	assignIds(root);
	function convert(node, parentBoxId, depth) {
		const boxId = nodeIdToBoxId.get(node.id);
		const yoloInfo = node.componentInfo?.source === "yolo" ? node.componentInfo : node.componentInfo?._yolo;
		const box = [
			node.x / scaleX,
			node.y / scaleY,
			(node.x + node.width) / scaleX,
			(node.y + node.height) / scaleY
		];
		const childBoxIds = [];
		if (node.children) for (const child of node.children) childBoxIds.push(nodeIdToBoxId.get(child.id));
		const prediction = {
			box,
			box_id: boxId,
			children: childBoxIds,
			label: yoloInfo?.name || node.componentName || node.type,
			layer_level: depth,
			max_iou: 0,
			max_iou_id: -1,
			parent: parentBoxId,
			score: yoloInfo ? yoloInfo.score : 1,
			scrollable: yoloInfo ? yoloInfo.scrollable ?? false : false
		};
		predictions.push(prediction);
		node.children?.forEach((child) => convert(child, boxId, depth + 1));
	}
	convert(root, -1, 0);
	return { result1: { json: {
		imageHeight,
		imageWidth,
		predictions
	} } };
}
function idToCssClass(id) {
	return `n-${id.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")}`;
}
function collectTexts(node, limit) {
	const texts = [];
	let totalLen = 0;
	function walk(n) {
		if (totalLen >= limit) return;
		if (n.characters) {
			const t = n.characters.trim();
			if (t) {
				texts.push(t);
				totalLen += t.length;
			}
		}
		if (n.children) for (const child of n.children) walk(child);
	}
	walk(node);
	return texts;
}
function countLeaves(node) {
	if (!node.children || node.children.length === 0) return 1;
	let count = 0;
	for (const child of node.children) count += countLeaves(child);
	return count;
}
function findMeaningfulRoot(tree) {
	let node = tree;
	while (node.children && node.children.length === 1 && node.children[0].children && node.children[0].children.length > 1) node = node.children[0];
	return node;
}
function isMeaningfulName(name) {
	if (!name) return false;
	if (/^(Frame|Group|Rectangle|Vector|Instance)\s*\d*$/i.test(name)) return false;
	if (/^\d+[:-]\d+$/.test(name)) return false;
	return true;
}
function deriveRegionName(node, index) {
	if (isMeaningfulName(node.name)) return node.name;
	const texts = collectTexts(node, 30);
	if (texts.length > 0) return texts[0];
	return `区域 ${index}`;
}
function structuralFingerprint(node) {
	const parts = [node.type];
	if (node.layout?.flexDirection) parts.push(node.layout.flexDirection);
	if (node.children && node.children.length > 0) {
		parts.push(`c${node.children.length}`);
		parts.push(node.children.map((c) => c.type).join(","));
	}
	if (node.styles) {
		const styleParts = Object.entries(node.styles).filter(([, v]) => v !== void 0 && v !== null).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`);
		if (styleParts.length > 0) parts.push(styleParts.join("|"));
	}
	return parts.join(";");
}
function collectRegions(root, maxText) {
	if (!root.children || root.children.length === 0) return [];
	return root.children.map((child, i) => {
		const idx = i + 1;
		let preview = collectTexts(child, maxText).slice(0, 6).join(", ");
		if (preview.length > maxText) preview = preview.slice(0, maxText) + "...";
		return {
			index: idx,
			name: deriveRegionName(child, idx),
			cssAnchor: child.id ? idToCssClass(child.id) : "(无)",
			direction: child.layout?.flexDirection || "row",
			childCount: child.children?.length || 0,
			leafCount: countLeaves(child),
			textPreview: preview
		};
	});
}
function collectRepeatedStructures(root, regions, minCount) {
	const groups = /* @__PURE__ */ new Map();
	function walkRegion(node, regionIdx) {
		if (!node.children || node.children.length === 0) return;
		const fp = structuralFingerprint(node);
		if (fp) {
			let g = groups.get(fp);
			if (!g) {
				g = {
					nodes: [],
					regionIdxSet: /* @__PURE__ */ new Set()
				};
				groups.set(fp, g);
			}
			g.nodes.push(node);
			g.regionIdxSet.add(regionIdx);
		}
		for (const child of node.children) walkRegion(child, regionIdx);
	}
	if (root.children) root.children.forEach((child, i) => walkRegion(child, i + 1));
	const result = [];
	for (const [, { nodes, regionIdxSet }] of groups) {
		if (nodes.length < minCount) continue;
		const textExamples = nodes.slice(0, 3).map((n) => {
			return collectTexts(n, 40).slice(0, 3).join(" / ") || "(无文本)";
		});
		result.push({
			count: nodes.length,
			regionNames: [...regionIdxSet].map((i) => regions[i - 1]?.name || `区域 ${i}`),
			textExamples
		});
	}
	result.sort((a, b) => b.count - a.count);
	return result.slice(0, 15);
}
function collectRiskPoints(root, maxPerType) {
	const risks = [];
	const counters = {};
	function addRisk(type, desc, loc) {
		counters[type] = (counters[type] || 0) + 1;
		if (counters[type] <= maxPerType) risks.push({
			type,
			description: desc,
			location: loc
		});
	}
	function locHint(node) {
		return collectTexts(node, 30).slice(0, 2).join(", ") || node.name || node.id;
	}
	function walk(node, depth) {
		const ml = node.layout?.marginLeft;
		const mt = node.layout?.marginTop;
		if (typeof ml === "number" && ml < -2 || typeof mt === "number" && mt < -2) addRisk("负 margin", `margin-left: ${ml ?? 0}px, margin-top: ${mt ?? 0}px`, locHint(node));
		if (node.styles?.opacity !== void 0 && Number(node.styles.opacity) < 1 && node.children && node.children.length > 0) addRisk("整块 opacity", `opacity: ${node.styles.opacity}，容器含 ${node.children.length} 个子节点`, locHint(node));
		if (depth >= 8 && (!node.children || node.children.length === 0)) {
			if (!counters["过深嵌套"]) addRisk("过深嵌套", `叶子节点嵌套深度达到 ${depth} 层`, locHint(node));
		}
		if (node.children) for (const child of node.children) walk(child, depth + 1);
	}
	walk(root, 0);
	for (const [type, total] of Object.entries(counters)) if (total > maxPerType) risks.push({
		type,
		description: `共 ${total} 处，以上仅列前 ${maxPerType} 处`,
		location: "（汇总）"
	});
	return risks;
}
function generatePageBrief(tree, options) {
	const { maxTextPreview = 80, minRepeatCount = 2, maxRiskPerType = 3 } = options || {};
	const root = findMeaningfulRoot(tree);
	const regions = collectRegions(root, maxTextPreview);
	const repeated = collectRepeatedStructures(root, regions, minRepeatCount);
	const risks = collectRiskPoints(root, maxRiskPerType);
	const lines = [];
	lines.push("# 页面结构说明书");
	lines.push("");
	lines.push("> 由布局引擎自动生成，供下游 AI 做人类化重构时参考。");
	lines.push("");
	lines.push(`## 区域划分（${regions.length} 个区域）`);
	lines.push("");
	lines.push("| # | 区域名称 | 代码锚点 | 方向 | 直接子节点 | 叶子节点 | 内容摘要 |");
	lines.push("|---|----------|----------|------|-----------|---------|----------|");
	for (const r of regions) lines.push(`| ${r.index} | ${r.name} | \`${r.cssAnchor}\` | ${r.direction} | ${r.childCount} | ${r.leafCount} | ${r.textPreview} |`);
	lines.push("");
	if (repeated.length > 0) {
		lines.push(`## 重复结构（${repeated.length} 组）`);
		lines.push("");
		lines.push("| # | 出现次数 | 所在区域 | 内容示例 |");
		lines.push("|---|----------|----------|----------|");
		repeated.forEach((g, i) => {
			lines.push(`| ${i + 1} | ${g.count} 次 | ${g.regionNames.join(", ")} | ${g.textExamples.join(" ‖ ")} |`);
		});
		lines.push("");
	}
	if (risks.length > 0) {
		lines.push(`## 风险点（${risks.length} 项）`);
		lines.push("");
		lines.push("| 类型 | 说明 | 位置 |");
		lines.push("|------|------|------|");
		for (const r of risks) lines.push(`| ${r.type} | ${r.description} | ${r.location} |`);
		lines.push("");
	}
	lines.push("## 改造指引");
	lines.push("");
	lines.push("逐区域独立改造，每次只处理一个区域：");
	lines.push("1. 用语义化 class 名替换机器命名（n-xxx / s-xxx / split-xxx）");
	lines.push("2. 重复结构改为数组 + v-for 或抽成局部子组件");
	lines.push("3. 背景透明用 rgba()，不要对整个容器用 opacity");
	lines.push("4. 删除无意义的包装层");
	lines.push("5. 负 margin 补位改为合理的 flex 布局");
	lines.push("6. 保持文案和视觉主结构不变");
	lines.push("");
	return lines.join("\n");
}
function splitVueByRegion(tree, vueOptions) {
	const root = findMeaningfulRoot(tree);
	if (!root.children || root.children.length === 0) return [];
	const opts = {
		classMode: "tailwind",
		enableDedup: true,
		semanticTags: true,
		scoped: true,
		...vueOptions
	};
	return root.children.map((child, i) => {
		const idx = i + 1;
		return {
			index: idx,
			name: deriveRegionName(child, idx),
			cssAnchor: child.id ? idToCssClass(child.id) : "",
			vue: renderVue(child, opts)
		};
	});
}
function processDesign(json, options = {}) {
	const preStage3Result = tryPreStage3Convert(json, options.preStage3Convert ?? "auto");
	const workingJson = preStage3Result.workingJson;
	const isStage3Input = workingJson?.meta?.stage3_export?.generated_stage === "stage3";
	const trustStage3 = options.trustStage3 ?? (isStage3Input ? "partial" : "off");
	const applyTrustMode = trustStage3 !== "off";
	let vcMap = /* @__PURE__ */ new Map();
	if (trustStage3 === "full" && isStage3Input) vcMap = extractVirtualContainerMap(workingJson);
	let normalized = autoConvertDsl(workingJson, applyTrustMode);
	let materializedContainers = 0;
	let partialMaterialize = 0;
	if (trustStage3 === "full" && normalized && vcMap.size > 0) {
		const r = materializeVirtualContainers(normalized, vcMap);
		normalized = r.tree;
		materializedContainers = r.materialized;
		partialMaterialize = r.partialSkipped;
	}
	const isCompressedDsl = normalized && normalized._fromCompressedDsl === true;
	const { removeHidden = true, removeTransparent = true, removeZeroSize = true, removeOverflow = true, removeOccluded = applyTrustMode ? false : !isCompressedDsl, autoSort = true, flattenMode = "full", containerRecoveryMode = trustStage3 === "full" ? "all" : "styled-only", clusterAlgorithm = "dbscan", dbscanEps = "auto", gapThresholdX = 50, gapThresholdY = 30, minClusterSize = 2, generateStyles = true, imagePlaceholder = false, yoloData, splitPageRegions = false, largeGapSemantics = false, layoutFallback = false, equalFlex = false, justifyContent = false } = options;
	const timings = [];
	const t0 = now();
	const record = (stage, startedAt, nodeCount) => {
		timings.push({
			stage,
			elapsedMs: Math.max(0, now() - startedAt),
			nodeCount
		});
	};
	if (preStage3Result.timingMetadata) {
		const meta = preStage3Result.timingMetadata;
		timings.push({
			stage: "preStage3Convert",
			elapsedMs: 0,
			nodeCount: typeof meta.after === "number" ? meta.after : null,
			metadata: meta
		});
	}
	if (isStage3Input || options.trustStage3 !== void 0) {
		const skippedStages = [];
		if (applyTrustMode) {
			skippedStages.push("detectImageRole", "extractBackground");
			if (removeOccluded === false && !isCompressedDsl) skippedStages.push("removeOccluded");
		}
		const metadata = {
			mode: trustStage3,
			skippedStages
		};
		if (trustStage3 === "full") {
			metadata.materializedContainers = materializedContainers;
			metadata.partialMaterialize = partialMaterialize;
		}
		timings.push({
			stage: "trustStage3",
			elapsedMs: 0,
			nodeCount: null,
			metadata
		});
	}
	const tPre = now();
	const { tree: preprocessed, stats } = processPipeline(normalized, {
		removeHidden,
		removeTransparent,
		removeZeroSize,
		removeOverflow,
		removeOccluded,
		autoSort,
		enableGrouping: false,
		skipDetectImageRole: applyTrustMode,
		skipExtractBackground: applyTrustMode
	});
	record("preprocess", tPre, countNodes(preprocessed));
	const emptyStats = () => ({
		removedHidden: stats.removedHidden,
		removedTransparent: stats.removedTransparent,
		removedZeroSize: stats.removedZeroSize,
		removedNegativeCoords: stats.removedNegativeCoords,
		removedHueBlendMode: stats.removedHueBlendMode,
		removedOverflow: stats.removedOverflow,
		removedOccluded: stats.removedOccluded,
		removedEmptyText: stats.removedEmptyText,
		removedEmptyGroup: stats.removedEmptyGroup,
		remainingNodes: stats.remainingNodes,
		removedByReason: stats.removedByReason,
		timings,
		totalElapsedMs: Math.max(0, now() - t0)
	});
	if (!preprocessed) return {
		tree: null,
		stages: {
			preprocessed: null,
			flattened: null,
			recovered: null,
			clustered: null,
			split: null
		},
		stats: emptyStats()
	};
	const tFlat = now();
	let flattened;
	if (flattenMode === "full") {
		const leaves = flattenToLeaves(preprocessed);
		flattened = {
			...preprocessed,
			children: leaves
		};
	} else if (flattenMode === "smart") flattened = smartFlatten(preprocessed);
	else flattened = preserveGroupsFlatten(preprocessed);
	record("flatten", tFlat, countNodes(flattened));
	let yoloFloors = null;
	if (yoloData) {
		yoloFloors = parseYoloFloors(yoloData, {
			pageWidth: flattened.width,
			pageHeight: flattened.height
		});
		if (yoloFloors.length === 0) yoloFloors = null;
	}
	let recovered = flattened;
	if (flattenMode === "full") {
		const tRec = now();
		const containerLayers = collectContainers(preprocessed);
		recovered = recoverContainersLayered(flattened, containerLayers, {
			clusterAlgorithm,
			dbscanEps,
			gapThresholdX,
			gapThresholdY,
			minClusterSize,
			containerRecoveryMode
		});
		record("containerRecovery", tRec, countNodes(recovered));
	}
	let clustered;
	if (flattenMode === "full") clustered = recovered;
	else {
		const tCluster = now();
		clustered = clusterWithinContainers(recovered, {
			algorithm: clusterAlgorithm,
			dbscanEps,
			gapThresholdX,
			gapThresholdY,
			minClusterSize
		});
		record("cluster", tCluster, countNodes(clustered));
	}
	const tBg = now();
	if (clustered.children && clustered.children.length > 0) extractBackgroundFromContainers(clustered.children, true, imagePlaceholder);
	record("extractBackground", tBg, countNodes(clustered));
	const tSplit = now();
	let split;
	if (flattenMode === "full") if ((clustered.children || []).length === 0) split = clustered;
	else split = splitWithinContainers(clustered);
	else split = splitWithinContainers(clustered);
	record("split", tSplit, countNodes(split));
	const tLayout = now();
	applyLayout(split, {
		largeGapSemantics,
		layoutFallback,
		equalFlex,
		justifyContent
	});
	record("layout", tLayout, countNodes(split));
	let final = split;
	if (generateStyles) {
		const tStyles = now();
		final = applyStylesToTree(split, imagePlaceholder);
		record("styles", tStyles, countNodes(final));
	}
	if (yoloFloors) markComponentsByYolo(final, yoloFloors);
	if (splitPageRegions) {
		const tPs = now();
		tagComponentBoundaries(final);
		classifyPageRegions(final);
		record("pageSplit", tPs, countNodes(final));
	}
	return {
		tree: final,
		stages: {
			preprocessed,
			flattened,
			recovered,
			clustered,
			split
		},
		stats: emptyStats()
	};
}
function now() {
	if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
	return Date.now();
}
function countNodes(node) {
	if (!node) return null;
	let n = 0;
	const walk = (x) => {
		n++;
		if (x.children) for (const c of x.children) walk(c);
	};
	walk(node);
	return n > 0 ? n : null;
}
function octoToDSL(json, options = {}) {
	const { outputFormat = "tree", pretty = false, compress, ...designOptions } = options;
	const { tree, stats } = processDesign(json, designOptions);
	const dsl = tree ? compressDSL(tree, compress) : null;
	const result = {
		dsl,
		stats
	};
	if (outputFormat === "json" && dsl) result.json = pretty ? JSON.stringify(dsl, null, 2) : JSON.stringify(dsl);
	return result;
}
function octoToArkTsDSL(json, options = {}) {
	const { outputFormat = "tree", pretty = false, compress, ...designOptions } = options;
	const { tree, stats } = processDesign(json, designOptions);
	const dsl = tree ? compressToArkTs(tree, compress) : null;
	const result = {
		dsl,
		stats
	};
	if (outputFormat === "json" && dsl) result.json = pretty ? JSON.stringify(dsl, null, 2) : JSON.stringify(dsl);
	return result;
}
function octoToArkUiDsl(json, options = {}) {
	const { outputFormat = "tree", pretty = false, compress, pageName, pageDescription, ...designOptions } = options;
	const { tree, stats } = processDesign(json, designOptions);
	const arkNode = tree ? compressToArkTs(tree, compress) : null;
	const resolvedPageName = pageName || tree?.name || void 0;
	const dsl = arkNode ? toArkUiDsl(arkNode, {
		pageName: resolvedPageName,
		pageDescription
	}) : null;
	const result = {
		dsl,
		stats
	};
	if (outputFormat === "json" && dsl) result.json = pretty ? JSON.stringify(dsl, null, 2) : JSON.stringify(dsl);
	return result;
}
function renderArkUiDsl(tree, options = {}) {
	if (!tree) return null;
	const { pageName, pageDescription, compress } = options;
	const arkNode = compressToArkTs(tree, compress);
	if (!arkNode) return null;
	return toArkUiDsl(arkNode, {
		pageName: pageName || tree.name || void 0,
		pageDescription
	});
}
var ASSET_TYPES = [
	"IMAGE",
	"ICON",
	"VECTOR"
];
function collectImageAssetDetails(node) {
	const assets = [];
	const reasonMap = {
		IMAGE: "image-type",
		ICON: "icon-type",
		VECTOR: "vector-type"
	};
	const walk = (n) => {
		const isAssetType = ASSET_TYPES.includes(n.type);
		const hasImageFill$4 = Array.isArray(n.fills) && n.fills.some((f) => f.type === "IMAGE" && f.visible !== false);
		if (isAssetType || hasImageFill$4 || n.shouldBeImage) {
			const reason = isAssetType ? reasonMap[n.type] ?? "image-type" : hasImageFill$4 ? "image-fill" : "dsl-marked";
			assets.push({
				id: n.id,
				name: n.name,
				type: n.type,
				reason,
				width: n.width,
				height: n.height
			});
		}
		if (n.children) for (const child of n.children) walk(child);
	};
	walk(node);
	return assets;
}
function collectImageAssets(node) {
	return collectImageAssetDetails(node).map((a) => a.id);
}
var DESIGN_TO_CODE_HTML_OPTIONS = {
	classMode: "tailwind",
	semanticTags: true,
	enableDedup: true,
	includeNodeId: false,
	includeNodeName: true
};
var DESIGN_TO_CODE_VUE_OPTIONS = {
	classMode: "tailwind",
	semanticTags: true,
	enableDedup: true,
	includeNodeId: false,
	includeNodeName: false,
	scoped: true
};
function designToCode(json, options) {
	const { tree } = processDesign(json);
	if (!tree) return {
		html: void 0,
		css: void 0,
		vue: void 0,
		images: []
	};
	const images = collectImageAssets(tree);
	if (options.mode === "html") {
		const result = renderLayoutPageWithCss(tree, DESIGN_TO_CODE_HTML_OPTIONS);
		return {
			html: result.html,
			css: result.fullCss,
			images
		};
	}
	if (options.mode === "vue") return {
		vue: renderVue(tree, DESIGN_TO_CODE_VUE_OPTIONS),
		images
	};
	return {
		html: void 0,
		css: void 0,
		vue: void 0,
		images
	};
}
function figmaColorToCss(color, opacity = 1) {
	const r = Math.round(color.r * 255);
	const g = Math.round(color.g * 255);
	const b = Math.round(color.b * 255);
	if (opacity >= 1) return `rgb(${r},${g},${b})`;
	return `rgba(${r},${g},${b},${+opacity.toFixed(3)})`;
}
function escapeHtml(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function extractBackground(fills) {
	if (!Array.isArray(fills)) return void 0;
	for (const f of fills) {
		if (f.visible === false) continue;
		if (f.type === "SOLID" && f.color) return figmaColorToCss(f.color, f.opacity ?? 1);
		if (f.type === "GRADIENT_LINEAR" || f.type === "GRADIENT_RADIAL") return;
	}
}
function extractBorder(strokes, strokeWeight) {
	if (!Array.isArray(strokes) || !strokeWeight) return void 0;
	for (const s of strokes) {
		if (s.visible === false) continue;
		if (s.type === "SOLID" && s.color) return `${strokeWeight}px solid ${figmaColorToCss(s.color, s.opacity ?? 1)}`;
	}
}
function extractBorderRadius(node) {
	if (node.type === "ELLIPSE") return "50%";
	const arr = node.rectangleCornerRadii ?? node.borderRadius;
	if (Array.isArray(arr) && arr.length >= 4) {
		const [tl, tr, br, bl] = arr;
		if (tl === tr && tr === br && br === bl) return tl > 0 ? `${tl}px` : void 0;
		return `${tl}px ${tr}px ${br}px ${bl}px`;
	}
	if (typeof node.cornerRadius === "number" && node.cornerRadius > 0) return `${node.cornerRadius}px`;
}
function extractBoxShadow(effects) {
	if (!Array.isArray(effects)) return void 0;
	const shadows = [];
	for (const e of effects) {
		if (e.visible === false) continue;
		if (e.type !== "DROP_SHADOW" && e.type !== "INNER_SHADOW") continue;
		const c = e.color;
		if (!c) continue;
		const r = typeof c.r === "number" && c.r <= 1 ? Math.round(c.r * 255) : c.r ?? 0;
		const g = typeof c.g === "number" && c.g <= 1 ? Math.round(c.g * 255) : c.g ?? 0;
		const b = typeof c.b === "number" && c.b <= 1 ? Math.round(c.b * 255) : c.b ?? 0;
		const a = typeof c.a === "number" ? c.a > 1 ? +(c.a / 255).toFixed(3) : +c.a.toFixed(3) : 1;
		const ox = e.offset?.x ?? 0;
		const oy = e.offset?.y ?? 0;
		const blur = e.radius ?? 0;
		const spread = e.spread ?? 0;
		const inset = e.type === "INNER_SHADOW" ? "inset " : "";
		shadows.push(`${inset}${ox}px ${oy}px ${blur}px ${spread}px rgba(${r},${g},${b},${a})`);
	}
	return shadows.length > 0 ? shadows.join(",") : void 0;
}
function extractGradient(gradient) {
	if (!gradient || gradient.gradienttype !== "GRADIENT_LINEAR") return void 0;
	const colors = gradient.gradientcolor;
	const positions = gradient.gradientposition;
	if (!Array.isArray(colors) || colors.length < 2) return void 0;
	return `linear-gradient(${typeof gradient.gradientangle === "number" ? gradient.gradientangle + 90 : 180}deg,${colors.map((c, i) => {
		const pos = positions?.[i] ?? "";
		return pos ? `${c} ${pos}` : c;
	}).join(",")})`;
}
function extractTextStyles(node) {
	const parts = [];
	const fontSize = node.fontSize ?? node.style?.["font-size"];
	if (typeof fontSize === "number") parts.push(`font-size:${fontSize}px`);
	else if (typeof fontSize === "string") parts.push(`font-size:${fontSize}`);
	const fontFamily = node.fontName?.family;
	if (fontFamily) parts.push(`font-family:${fontFamily}`);
	const fontWeight = node.textData?.text?.[0]?.fontWeight ?? node.fontName?.style;
	if (typeof fontWeight === "number") parts.push(`font-weight:${fontWeight}`);
	else if (fontWeight === "Bold") parts.push("font-weight:700");
	else if (fontWeight === "Medium") parts.push("font-weight:500");
	const textColor = extractBackground(node.fills);
	if (textColor) parts.push(`color:${textColor}`);
	const lh = node.textData?.text?.[0]?.lineHeight;
	if (typeof lh === "number" && lh > 0) parts.push(`line-height:${lh}`);
	return parts.join(";");
}
function isImageNode(node) {
	if (node.type === "IMAGE") return true;
	if (Array.isArray(node.fills)) return node.fills.some((f) => f.type === "IMAGE" && f.visible !== false);
	return false;
}
var SVG_ASSET_TYPES = new Set([
	"IMAGE",
	"VECTOR",
	"BOOLEAN_OPERATION",
	"ICON"
]);
function idToFileName(id) {
	return id.replace(/:/g, "_");
}
function renderNode(node, isRoot, parentX, parentY, images, zIndex, ext = "svg", imagePlaceholder = true) {
	if (node.visible === false) return "";
	const x = typeof node.x === "number" ? node.x : 0;
	const y = typeof node.y === "number" ? node.y : 0;
	const w = typeof node.width === "number" ? node.width : 0;
	const h = typeof node.height === "number" ? node.height : 0;
	if (isImageNode(node)) images.push(node.id);
	const relX = x - parentX;
	const relY = y - parentY;
	const style = [];
	if (isRoot) style.push("position:relative");
	else {
		style.push("position:absolute");
		style.push(`left:${relX}px`);
		style.push(`top:${relY}px`);
		if (typeof zIndex === "number") style.push(`z-index:${zIndex}`);
	}
	const isText = node.type === "TEXT";
	if (w > 0 && !isText) style.push(`width:${w}px`);
	if (h > 0 && !isText) style.push(`height:${h}px`);
	const bg = extractBackground(node.fills);
	const grad = extractGradient(node.gradient);
	if (grad && node.type !== "TEXT") style.push(`background:${grad}`);
	else if (bg && node.type !== "TEXT") style.push(`background:${bg}`);
	const border = extractBorder(node.strokes, node.strokeWeight);
	if (border) style.push(`border:${border}`);
	const shadow = extractBoxShadow(node.effects);
	if (shadow) style.push(`box-shadow:${shadow}`);
	const radius = extractBorderRadius(node);
	if (radius) style.push(`border-radius:${radius}`);
	if (typeof node.opacity === "number" && node.opacity < 1) style.push(`opacity:${node.opacity}`);
	if (node.clipsContent) style.push("overflow:hidden");
	if (node.id && (SVG_ASSET_TYPES.has(node.type) || isImageNode(node))) {
		if (imagePlaceholder) style.push(`background-image:url("${IMG_PLACEHOLDER}")`);
		else style.push(`background-image:url(./${idToFileName(node.id)}.${ext})`);
		style.push("background-size:cover");
		style.push("background-repeat:no-repeat");
		style.push("background-position:center");
	}
	if (isText) {
		style.push("white-space:nowrap");
		const textStyle = extractTextStyles(node);
		if (textStyle) style.push(textStyle);
	}
	const dataId = node.id ? ` data-id="${escapeHtml(String(node.id))}"` : "";
	const dataName = node.name ? ` data-name="${escapeHtml(String(node.name))}"` : "";
	const dataType = ` data-type="${escapeHtml(node.type || "")}"`;
	const children = Array.isArray(node.children) ? node.children : [];
	let content = "";
	if (isText && node.characters) content = escapeHtml(node.characters);
	else if (isImageNode(node) && !children.length) content = "";
	else {
		const total = children.length;
		content = children.map((child, i) => renderNode(child, false, x, y, images, total - 1 - i, ext, imagePlaceholder)).join("");
	}
	return `<div style="${style.join(";")}"${dataId}${dataName}${dataType}>${content}</div>`;
}
function designToAbsoluteHtml(json, options) {
	if (!json || typeof json !== "object") return {
		html: "",
		images: []
	};
	const ext = options?.assetExt ?? "svg";
	const placeholder = options?.imagePlaceholder ?? true;
	const images = [];
	const rootW = json.width ?? 0;
	const rootH = json.height ?? 0;
	const body = renderNode(json, true, json.x ?? 0, json.y ?? 0, images, void 0, ext, placeholder);
	return {
		html: `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(json.name || "Absolute Render")}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{padding:16px;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif}
[data-type="IMAGE"],[data-type="VECTOR"],[data-type="BOOLEAN_OPERATION"],[data-type="ICON"]{border-radius:4px}
[data-type="TEXT"]{word-break:break-word}
</style>
</head>
<body>
<div style="width:${rootW}px;height:${rootH}px;position:relative;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08);border-radius:8px;overflow:hidden;margin:0 auto">
${body}
</div>
<script>
(function(){
  var dw=${rootW};
  var c=document.querySelector('body>div');
  function s(){var w=window.innerWidth-32;var r=Math.min(w/dw,1);c.style.transform='scale('+r+')';c.style.transformOrigin='top left'}
  s();window.addEventListener('resize',s);
})();
<\/script>
</body>
</html>`,
		images
	};
}
export { autoConvertDsl, convertDslToOldFormat, convertTreeToYoloPredictions, designToAbsoluteHtml, designToCode, generatePageBrief, isNewDslFormat, isStage3Convertible, octoToArkTsDSL, octoToArkUiDsl, octoToDSL, processDesign, renderArkUiDsl, splitVueByRegion };
