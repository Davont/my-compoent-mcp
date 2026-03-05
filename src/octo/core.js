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
			remainingNodes: 0
		}
	};
	const opts = {
		removeHidden: options.removeHidden ?? true,
		removeTransparent: options.removeTransparent ?? true,
		removeZeroSize: options.removeZeroSize ?? true,
		removeNegativeCoords: options.removeNegativeCoords ?? true,
		removeHueBlendMode: options.removeHueBlendMode ?? true,
		removeOverflow: options.removeOverflow ?? true,
		removeOccluded: options.removeOccluded ?? true
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
		remainingNodes: 0
	};
	const cleanedData = cleanNode(rootNode, opts, stats, getNodeBounds(rootNode));
	stats.remainingNodes = stats.totalNodes - stats.removedHidden - stats.removedTransparent - stats.removedZeroSize - stats.removedNegativeCoords - stats.removedHueBlendMode - stats.removedOverflow - stats.removedOccluded;
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
	if (options.removeNegativeCoords && hasNegativeCoords(node)) {
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
	if (node.children && Array.isArray(node.children)) {
		const childClip = computeChildClipBounds(node, clipBounds);
		let cleanedChildren = [];
		for (const child of node.children) {
			const cleanedChild = cleanNode(child, options, stats, childClip);
			if (cleanedChild !== null) cleanedChildren.push(cleanedChild);
		}
		if (options.removeOccluded && cleanedChildren.length > 1) cleanedChildren = removeOccludedSiblings(cleanedChildren, stats);
		return {
			...node,
			children: cleanedChildren
		};
	}
	return { ...node };
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
function isFullyTransparent(node) {
	if (node.opacity === 0) return true;
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
			if (node.fills.every((fill) => {
				if (fill.visible === false) return true;
				if (fill.opacity === 0) return true;
				return false;
			}) && (!node.strokes || node.strokes.length === 0)) return false;
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
function hasNegativeCoords(node) {
	if (node.x !== void 0 && node.x < 0) return true;
	if (node.y !== void 0 && node.y < 0) return true;
	return false;
}
function isHueBlendMode(node) {
	return node.blendMode === "HUE";
}
function roundNum(val) {
	if (typeof val === "number" && !isNaN(val)) return Math.round(val);
}
function getTextWidthFromBaselines(node) {
	if (node?.type !== "TEXT") return void 0;
	const baselines = node?.textData?.baselines;
	if (!Array.isArray(baselines) || baselines.length === 0) return void 0;
	const width = baselines[0]?.width;
	if (typeof width === "number" && !isNaN(width) && width > 0) return Math.round(width);
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
	const id = node.id || `node-${Math.random().toString(36).substr(2, 9)}`;
	const { children: _ignore, ...originalProps } = node;
	nodeMap.set(id, originalProps);
	const width = getTextWidthFromBaselines(node) ?? roundNum(node.width);
	const height = roundNum(node.height);
	const layoutNode = {
		id,
		isPageRoot: node.isPageRoot,
		type: node.type,
		x: roundNum(node.x) ?? 0,
		y: roundNum(node.y) ?? 0,
		name: node.name,
		width: width ?? 0,
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
		fills: node.fills,
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
function isSameGeometry$3(a, b) {
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
function isContainer(node) {
	return [
		"FRAME",
		"GROUP",
		"COMPONENT",
		"INSTANCE",
		"SECTION"
	].includes(node.type);
}
function figmaColorToRgba(color, opacity = 1) {
	const r = Math.round(color.r * 255);
	const g = Math.round(color.g * 255);
	const b = Math.round(color.b * 255);
	const a = opacity;
	if (a === 1) return `rgb(${r}, ${g}, ${b})`;
	return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}
function figmaColorToHex(color, includeAlpha = false) {
	const r = Math.round(color.r * 255).toString(16).padStart(2, "0");
	const g = Math.round(color.g * 255).toString(16).padStart(2, "0");
	const b = Math.round(color.b * 255).toString(16).padStart(2, "0");
	if (includeAlpha && color.a !== void 0) return `#${r}${g}${b}${(color.a > 1 ? color.a : Math.round(color.a * 255)).toString(16).padStart(2, "0")}`;
	return `#${r}${g}${b}`;
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
var IMAGE_PLACEHOLDER = "linear-gradient(135deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%)";
function convertSingleFill(fill) {
	if (fill.visible === false) return null;
	const opacity = fill.opacity ?? 1;
	if (opacity < .01) return null;
	switch (fill.type) {
		case "SOLID":
			if (!fill.color) return null;
			return figmaColorToRgba(fill.color, opacity);
		case "GRADIENT_LINEAR": return convertLinearGradient(fill, opacity);
		case "GRADIENT_RADIAL": return convertRadialGradient(fill, opacity);
		case "IMAGE":
			if (opacity < 1) return `linear-gradient(rgba(255,255,255,${1 - opacity}), rgba(255,255,255,${1 - opacity})), ${IMAGE_PLACEHOLDER}`;
			return IMAGE_PLACEHOLDER;
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
function convertFills(fills) {
	if (!fills || fills.length === 0) return void 0;
	const visibleFills = fills.filter((f) => f.visible !== false);
	if (visibleFills.length === 0) return void 0;
	if (visibleFills.length === 1) return convertSingleFill(visibleFills[0]) ?? void 0;
	const backgrounds = visibleFills.map((f) => {
		const bg = convertSingleFill(f);
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
	const r = Math.round(color.r * 255);
	const g = Math.round(color.g * 255);
	const b = Math.round(color.b * 255);
	let a = color.a ?? 1;
	if (a > 1) a = a / 255;
	return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
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
			if (isSameGeometry$3(nodeA, nodeB)) {
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
						const isPureBgA = nodeA.type === "GROUP" && isPureBackgroundGroup(nodeA);
						const isPureBgB = nodeB.type === "GROUP" && isPureBackgroundGroup(nodeB);
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
		const contained = nodes.filter((node) => node.id !== background.id && !toRemove.has(node.id) && isContainedBy(node, background));
		if (contained.length === 0) continue;
		if (!contained.some((node) => (node.zIndex ?? 0) > (background.zIndex ?? 0))) continue;
		if (!contained.some((node) => isContainer(node)) && contained.length < 2) continue;
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
	if (node.type === "GROUP") return isPureBackgroundGroup(node);
	return false;
}
function isPureBackgroundGroup(node) {
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
			if (!isPureBackgroundGroup(child)) return false;
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
	if (background.fills && !container.fills) container.fills = background.fills;
	if (background.strokes && !container.strokes) container.strokes = background.strokes;
	if (background.effects && !container.effects) container.effects = background.effects;
	if (background.cornerRadius !== void 0 && container.cornerRadius === void 0) container.cornerRadius = background.cornerRadius;
	if (background.borderRadius && !container.borderRadius) container.borderRadius = background.borderRadius;
	if (background.strokeWeight !== void 0 && container.strokeWeight === void 0) container.strokeWeight = background.strokeWeight;
	const extractedStyles = {};
	const bgColor = convertFills(background.fills);
	if (bgColor) extractedStyles.background = bgColor;
	const radius = convertCornerRadius({
		cornerRadius: background.cornerRadius,
		borderRadius: background.borderRadius
	});
	if (radius) extractedStyles.borderRadius = radius;
	const effects = convertEffects(background.effects);
	if (effects?.boxShadow) extractedStyles.boxShadow = effects.boxShadow;
	const border = convertStrokes(background.strokes, { weight: background.strokeWeight });
	if (border) extractedStyles.border = border;
	if (Object.keys(extractedStyles).length > 0) container.styles = {
		...extractedStyles,
		...container.styles
	};
}
function mergeGroupBackgroundStyles(container, group) {
	if (!group.children || group.children.length === 0) return;
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
	if (contentElements.length > 0 && !container.styles?.background) {
		const IMAGE_PLACEHOLDER$1 = "linear-gradient(135deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%)";
		container.styles = {
			...container.styles,
			background: IMAGE_PLACEHOLDER$1
		};
		const firstContent = contentElements[0];
		if (firstContent.fills && !container.fills) container.fills = firstContent.fills;
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
var BACKGROUND_SHAPE_TYPES = new Set([
	"VECTOR",
	"RECTANGLE",
	"ELLIPSE",
	"LINE",
	"POLYGON",
	"STAR"
]);
function extractBackgroundFromContainers(nodes) {
	if (!nodes || nodes.length === 0) return;
	for (const node of nodes) {
		if (node.children && node.children.length > 0) extractBackgroundFromContainers(node.children);
		extractBackgroundFromNode(node);
	}
}
function extractBackgroundFromNode(node) {
	if (!node.children || node.children.length < 2) return;
	const toRemove = [];
	for (const child of node.children) if (isFullSizeBackground(child, node)) {
		mergeBackgroundStyles(node, pickBackgroundStyleSource(child, node));
		node.extractedBackgroundId = child.id;
		node.extractedBackgroundType = child.type;
		toRemove.push(child.id);
		console.log(`[extractBackground] 提取背景: "${child.name}" (${child.id}) → "${node.name}" (${node.id})`, node.styles);
		break;
	}
	if (toRemove.length > 0) node.children = node.children.filter((c) => !toRemove.includes(c.id));
}
function pickBackgroundStyleSource(background, parent) {
	if (BACKGROUND_SHAPE_TYPES.has(background.type)) return background;
	const nestedMatchParent = findFullSizeShapeDescendant(background, parent);
	if (nestedMatchParent) return nestedMatchParent;
	return findFullSizeShapeDescendant(background, background) || background;
}
function findFullSizeShapeDescendant(node, parent) {
	if (!node.children || node.children.length === 0) return null;
	for (const child of node.children) {
		if (BACKGROUND_SHAPE_TYPES.has(child.type) && isFullSizeBackground(child, parent)) return child;
		const nested = findFullSizeShapeDescendant(child, parent);
		if (nested) return nested;
	}
	return null;
}
function isFullSizeBackground(child, parent) {
	if (child.mask === true) return false;
	if (child.imageRole === "background") {
		if (calcCoverageRatio$2(child, parent) > .8) return true;
	}
	if (!BACKGROUND_SHAPE_TYPES.has(child.type)) return false;
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
function mergeBackgroundStyles(parent, background) {
	if (background.fills && !parent.fills) parent.fills = background.fills;
	if (background.strokes && !parent.strokes) parent.strokes = background.strokes;
	if (background.effects && !parent.effects) parent.effects = background.effects;
	if (background.cornerRadius !== void 0 && parent.cornerRadius === void 0) parent.cornerRadius = background.cornerRadius;
	if (background.borderRadius && !parent.borderRadius) parent.borderRadius = background.borderRadius;
	if (background.strokeWeight !== void 0 && parent.strokeWeight === void 0) parent.strokeWeight = background.strokeWeight;
	const extractedStyles = {};
	const bgColor = convertFills(background.fills);
	if (bgColor) extractedStyles.background = bgColor;
	const radius = convertCornerRadius({
		cornerRadius: background.cornerRadius,
		borderRadius: background.borderRadius
	});
	if (radius) extractedStyles.borderRadius = radius;
	const effects = convertEffects(background.effects);
	if (effects?.boxShadow) extractedStyles.boxShadow = effects.boxShadow;
	const border = convertStrokes(background.strokes, { weight: background.strokeWeight });
	if (border) extractedStyles.border = border;
	if (Object.keys(extractedStyles).length > 0) parent.styles = {
		...extractedStyles,
		...parent.styles
	};
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
function isSameGeometry$2(a, b) {
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
	if (isSameGeometry$2(node, child)) return "same";
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
function inheritVisualProps(source, target) {
	if (!target.fills && source.fills) target.fills = source.fills;
	if (!target.strokes && source.strokes) {
		target.strokes = source.strokes;
		target.strokeWeight = source.strokeWeight;
		target.strokeTopWeight = source.strokeTopWeight;
		target.strokeBottomWeight = source.strokeBottomWeight;
		target.strokeLeftWeight = source.strokeLeftWeight;
		target.strokeRightWeight = source.strokeRightWeight;
	}
	if (!target.effects && source.effects) target.effects = source.effects;
	if (target.cornerRadius === void 0 && source.cornerRadius) target.cornerRadius = source.cornerRadius;
	if (!target.borderRadius && source.borderRadius) target.borderRadius = source.borderRadius;
	if (source.opacity !== void 0 && source.opacity < 1) {
		const targetOpacity = target.opacity ?? 1;
		target.opacity = source.opacity * targetOpacity;
	}
	if (!target.componentInfo && source.componentInfo) target.componentInfo = source.componentInfo;
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
}
function keepChild(node, child, nodes, index) {
	inheritVisualProps(node, child);
	child.styles = mergeStyles(node.styles, child.styles);
	child.collapsedParentId = node.id;
	child.collapsedParentType = node.type;
	child.collapsedParentName = node.name;
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
			if (!isSameGeometry$2(nodeA, nodeB)) continue;
			const keepNode = calculateMeaningfulness(nodeA) >= calculateMeaningfulness(nodeB) ? nodeA : nodeB;
			const removeNode = keepNode === nodeA ? nodeB : nodeA;
			inheritVisualProps(removeNode, keepNode);
			keepNode.styles = mergeStyles(removeNode.styles, keepNode.styles);
			keepNode.collapsedSiblingId = removeNode.id;
			keepNode.collapsedSiblingType = removeNode.type;
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
	if (VECTOR_TYPES.has(node.type)) return true;
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
function hasImageFill(node) {
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
	if (hasTextDescendant(node)) return null;
	const coverage = calcCoverageRatio$1(node, parent);
	const isBottom = isBottomLayer(node, parent.children);
	const hasAbove = hasSiblingsAbove(node, parent.children);
	if (coverage > .8 && isBottom && hasAbove) return "background";
	if (hasImageFill(node)) return "content";
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
var CONTAINER_TYPES$3 = new Set([
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
	if (!CONTAINER_TYPES$3.has(node.type)) return;
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
const DEVELOPER_PLUGIN_KEY = "__develoerInfo__";
function hasDeveloperPluginData(node) {
	if (node.pluginData && Array.isArray(node.pluginData)) return node.pluginData.some((item) => item.key === DEVELOPER_PLUGIN_KEY);
	return false;
}
function isAtomicComponent(node) {
	if (node.componentInfo && Array.isArray(node.componentInfo.prop) && node.componentInfo.prop.length > 0) return true;
	if (hasDeveloperPluginData(node)) return true;
	return false;
}
function postprocess(root, options = {}) {
	const { autoSort = true, enableGrouping = false } = options;
	applyRules([root], autoSort ? [
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
	]);
}
function processPipeline(json, options = {}) {
	const { removeHidden, removeTransparent, removeZeroSize, removeOverflow, removeOccluded, autoSort, enableGrouping } = options;
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
		enableGrouping
	});
	return {
		tree: root,
		nodeMap,
		stats
	};
}
const LEAF_TYPES = new Set([
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
const CONTAINER_TYPES = new Set([
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
		if (LEAF_TYPES.has(n.type)) {
			leaves.push(n);
			return;
		}
		if (n.children && n.children.length > 0) {
			n.children.forEach((child) => collect(child));
			return;
		}
		if (CONTAINER_TYPES.has(n.type)) {
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
		if (LEAF_TYPES.has(n.type)) return n;
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
		if (CONTAINER_TYPES.has(n.type)) {
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
function flatten(node, options = {}) {
	const { mode = "smart", verbose = false } = options;
	switch (mode) {
		case "full": return flattenToLeaves(node, verbose);
		case "smart": return smartFlatten(node);
		case "preserve-groups": return preserveGroupsFlatten(node);
		default: return smartFlatten(node);
	}
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
	return hasFills || hasStrokes || hasCorner;
}
function collectContainers(tree) {
	const containerMap = /* @__PURE__ */ new Map();
	const containerStack = [];
	function traverse(node, isRoot) {
		if (LEAF_TYPES.has(node.type)) return new Set([node.id]);
		if (!node.children || node.children.length === 0) {
			if (CONTAINER_TYPES.has(node.type)) return /* @__PURE__ */ new Set();
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
var DEFAULT_OPTIONS$3 = {
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
		...DEFAULT_OPTIONS$3,
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
		id: `vg-${Math.random().toString(36).slice(2, 8)}`,
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
var DEFAULT_OPTIONS$2 = {
	gapThresholdX: 50,
	gapThresholdY: 30,
	minClusterSize: 2,
	requireAlignment: true
};
function clusterLeaves(leaves, options = {}) {
	const opts = {
		...DEFAULT_OPTIONS$2,
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
	const bounds = calcBounds(children);
	return {
		id: `vg-${Math.random().toString(36).slice(2, 8)}`,
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
	const bounds = children.length > 0 ? calcBounds(children) : {
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
function calcBounds(nodes) {
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
			if (LEAF_TYPES.has(child.type)) leafChildren.push(child);
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
function calcBounds$3(nodes) {
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
	for (const child of root.children) (childIdSet.has(child.id) ? victims : remaining).push(child);
	if (victims.length < 2 || victims.length < originalChildIds.length / 2) return false;
	const bounds = calcBounds$3(victims);
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
		children: victims
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
function getTextBaselineWidth(node) {
	return getTextBaselineInfo(node)?.width;
}
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
function calcChildrenMargins(children, direction) {
	if (children.length === 0) return [];
	const sorted = sortByDirection(children, direction);
	const margins = [];
	for (let i = 0; i < sorted.length; i++) {
		if (i === 0) {
			margins.push({});
			continue;
		}
		const prev = sorted[i - 1];
		const curr = sorted[i];
		let gap = calcGap(prev, curr, direction);
		if (gap < 0 && gap >= -2) gap = 0;
		if (gap < 0 && !hasCrossAxisOverlap(prev, curr, direction)) gap = 0;
		if (direction === "row") margins.push({ marginLeft: gap !== 0 ? gap : void 0 });
		else margins.push({ marginTop: gap !== 0 ? gap : void 0 });
	}
	return restoreOrder(children, sorted, margins);
}
function sortByDirection(children, direction) {
	return [...children].sort((a, b) => {
		if (direction === "row") return a.x - b.x;
		else return a.y - b.y;
	});
}
function hasCrossAxisOverlap(a, b, direction) {
	if (direction === "row") return a.y < b.y + b.height && b.y < a.y + a.height;
	else return a.x < b.x + b.width && b.x < a.x + a.width;
}
function calcGap(prev, curr, direction) {
	if (direction === "row") {
		const prevRight = prev.x + prev.width;
		return curr.x - prevRight;
	} else {
		const prevBottom = prev.y + prev.height;
		return curr.y - prevBottom;
	}
}
function restoreOrder(original, sorted, margins) {
	const marginMap = /* @__PURE__ */ new Map();
	sorted.forEach((node, index) => {
		marginMap.set(node.id, margins[index]);
	});
	return original.map((node) => marginMap.get(node.id) || {});
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
	const parentBounds = getEffectiveBounds(parent);
	let minTop = Infinity, minLeft = Infinity, minRight = Infinity, minBottom = Infinity;
	for (const child of sortedChildren) {
		const bounds = getEffectiveBounds(child);
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
		const prev = getEffectiveBounds(sortedChildren[i - 1]);
		const curr = getEffectiveBounds(sortedChildren[i]);
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
	const parentBounds = getEffectiveBounds(parent);
	const currBounds = getEffectiveBounds(child);
	if (isRow) {
		if (prevChild) {
			const prevBounds = getEffectiveBounds(prevChild);
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
			const prevBounds = getEffectiveBounds(prevChild);
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
var CONTAINER_TYPES$2 = new Set([
	"FRAME",
	"GROUP",
	"INSTANCE",
	"COMPONENT",
	"SECTION"
]);
function calcBounds$2(elements) {
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
	if (!CONTAINER_TYPES$2.has(element.type)) return false;
	return allElements.some((el) => el.id !== element.id && (el.zIndex ?? 0) > (element.zIndex ?? 0));
}
function isolateFullCoverElements(elements) {
	if (elements.length <= 1) return {
		normal: elements,
		isolated: [],
		hasIsolated: false
	};
	const bounds = calcBounds$2(elements);
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
function calcBounds$1(nodes) {
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
function isSameGeometry$1(a, b, tolerance = 2) {
	return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance && Math.abs(a.width - b.width) <= tolerance && Math.abs(a.height - b.height) <= tolerance;
}
function absorbFullCoverLayersAsBackground(parent, isolated, normalNodes) {
	if (isolated.length === 0) return isolated;
	if (normalNodes.length === 0) return isolated;
	const parentArea = Math.max(0, (parent.width || 0) * (parent.height || 0));
	if (parentArea === 0) return isolated;
	const normalBounds = calcBounds$1(normalNodes);
	if (Math.max(0, normalBounds.width * normalBounds.height) / parentArea < .35) return isolated;
	const kept = [];
	for (const layer of isolated) {
		if (!isSameGeometry$1(layer, parent, 2)) {
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
var LEAF_TYPES$2 = new Set([
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
	if (LEAF_TYPES$2.has(node.type)) return false;
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
		if (isFullCover(candidate, parent)) continue;
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
function regroupTreeByContainment(node) {
	if (!node.children || node.children.length <= 1) return node;
	const regrouped = regroupByContainment(node.children.map((c) => regroupTreeByContainment(c)), node);
	return {
		...node,
		children: regrouped
	};
}
var MIN_GAP_THRESHOLD = 2;
var FULL_WIDTH_THRESHOLD = .8;
var FULL_WIDTH_EDGE_TOLERANCE = 2;
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
		if (Array.isArray(subResult)) children.push(...subResult);
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
function printSplitResult(result, indent = "") {
	const lines = [];
	if (result.type === "empty") lines.push(`${indent}[Empty]`);
	else if (result.type === "leaf" && result.element) lines.push(`${indent}[Leaf] ${result.element.name || "unnamed"}`);
	else if (result.type === "overlap" && result.elements) {
		const names = result.elements.map((c) => c.name || "unnamed").join(", ");
		lines.push(`${indent}[Overlap] ${names}`);
	} else if (result.children) {
		lines.push(`${indent}[${result.type.toUpperCase()}]`);
		for (const child of result.children) lines.push(printSplitResult(child, indent + "  "));
	}
	return lines.join("\n");
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
	const splitTree = splitResultToTree(projectionSplit(regroupedNormal), `split-${node.id}`);
	let nextChildren = Array.isArray(splitTree) ? splitTree : [splitTree];
	const allIsolated = [...regroupedKept, ...backgroundNodes];
	if (allIsolated.length > 0) {
		allIsolated.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
		nextChildren = [...allIsolated, ...nextChildren];
	}
	if (nextChildren.length === 1 && nextChildren[0].type === "VIRTUAL_GROUP") {
		if (nextChildren[0].layout) node.layout = {
			...node.layout,
			...nextChildren[0].layout
		};
		nextChildren = nextChildren[0].children || [];
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
var LEAF_TYPES$1 = new Set([
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
function applyLayout(root) {
	traverseAndApply(root);
}
function traverseAndApply(node) {
	if (node.children && node.children.length > 0) node.children.forEach((child) => traverseAndApply(child));
	if (!shouldProcessNode(node)) return;
	const direction = detectDirection(node.children);
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
}
function shouldProcessNode(node) {
	if (!node.children || node.children.length === 0) return false;
	if (LEAF_TYPES$1.has(node.type)) return false;
	if (CONTAINER_TYPES$1.has(node.type)) return true;
	return true;
}
function convertTextStyles(input) {
	const result = {};
	const textInfo = input.textData?.text?.[0];
	const fontSize = textInfo?.fontSize || input.fontSize;
	if (fontSize) result.fontSize = `${Math.round(fontSize)}px`;
	if (textInfo?.fontWeight) result.fontWeight = textInfo.fontWeight;
	else if (input.fontName?.style) result.fontWeight = inferFontWeight(input.fontName.style);
	const lineHeightObj = input.lineHeight;
	const textLineHeight = textInfo?.lineHeight;
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
function parseColor(color) {
	color = color.trim();
	if (color.startsWith("#")) {
		const hex = color.slice(1);
		if (hex.length === 3) return {
			r: parseInt(hex[0] + hex[0], 16),
			g: parseInt(hex[1] + hex[1], 16),
			b: parseInt(hex[2] + hex[2], 16)
		};
		if (hex.length === 6 || hex.length === 8) return {
			r: parseInt(hex.slice(0, 2), 16),
			g: parseInt(hex.slice(2, 4), 16),
			b: parseInt(hex.slice(4, 6), 16)
		};
	}
	const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
	if (rgbMatch) return {
		r: parseInt(rgbMatch[1], 10),
		g: parseInt(rgbMatch[2], 10),
		b: parseInt(rgbMatch[3], 10)
	};
	return null;
}
function rgbToLab(rgb) {
	let r = rgb.r / 255;
	let g = rgb.g / 255;
	let b = rgb.b / 255;
	r = r > .04045 ? Math.pow((r + .055) / 1.055, 2.4) : r / 12.92;
	g = g > .04045 ? Math.pow((g + .055) / 1.055, 2.4) : g / 12.92;
	b = b > .04045 ? Math.pow((b + .055) / 1.055, 2.4) : b / 12.92;
	const x = (r * .4124564 + g * .3575761 + b * .1804375) / .95047;
	const y = r * .2126729 + g * .7151522 + b * .072175;
	const z = (r * .0193339 + g * .119192 + b * .9503041) / 1.08883;
	const fx = x > .008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
	const fy = y > .008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
	const fz = z > .008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;
	return {
		l: 116 * fy - 16,
		a: 500 * (fx - fy),
		b: 200 * (fy - fz)
	};
}
function colorDistance(color1, color2) {
	const rgb1 = parseColor(color1);
	const rgb2 = parseColor(color2);
	if (!rgb1 || !rgb2) return Infinity;
	const lab1 = rgbToLab(rgb1);
	const lab2 = rgbToLab(rgb2);
	const deltaL = lab1.l - lab2.l;
	const deltaA = lab1.a - lab2.a;
	const deltaB = lab1.b - lab2.b;
	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}
function findClosestColor(targetColor, tokenColors, tolerance = 5) {
	let closest = null;
	for (const [name, value] of Object.entries(tokenColors)) {
		const distance = colorDistance(targetColor, value);
		if (distance <= tolerance && (!closest || distance < closest.distance)) closest = {
			name,
			value,
			distance
		};
	}
	return closest;
}
function isExactColorMatch(color1, color2) {
	return colorDistance(color1, color2) < 1;
}
function findClosestNumber(target, tokenValues, tolerance = .1) {
	let closest = null;
	for (const [name, value] of Object.entries(tokenValues)) {
		const diff = Math.abs(target - value);
		if ((target !== 0 ? diff / Math.abs(target) : value === 0 ? 0 : Infinity) <= tolerance && (!closest || diff < closest.diff)) closest = {
			name,
			value,
			diff
		};
	}
	return closest;
}
function findExactNumber(target, tokenValues) {
	for (const [name, value] of Object.entries(tokenValues)) if (value === target) return {
		name,
		value
	};
	return null;
}
function findNearestNumber(target, tokenValues) {
	let nearest = null;
	for (const [name, value] of Object.entries(tokenValues)) {
		const diff = Math.abs(target - value);
		if (!nearest || diff < nearest.diff) nearest = {
			name,
			value,
			diff
		};
	}
	return nearest;
}
var DEFAULT_OPTIONS$1 = {
	colorTolerance: 5,
	numberTolerance: .1,
	fuzzyMatch: true,
	fallback: "raw"
};
var TokenMatcher = class {
	config;
	options;
	constructor(config, options = {}) {
		this.config = config;
		this.options = {
			...DEFAULT_OPTIONS$1,
			...options
		};
	}
	matchColor(color) {
		if (!this.config.colors) return null;
		for (const [name, value] of Object.entries(this.config.colors)) if (isExactColorMatch(color, value)) return {
			name,
			cssVar: `var(--color-${name})`,
			rawValue: color,
			tokenValue: value,
			confidence: 1
		};
		if (this.options.fuzzyMatch) {
			const closest = findClosestColor(color, this.config.colors, this.options.colorTolerance);
			if (closest) {
				const confidence = Math.max(0, 1 - closest.distance / (this.options.colorTolerance * 2));
				return {
					name: closest.name,
					cssVar: `var(--color-${closest.name})`,
					rawValue: color,
					tokenValue: closest.value,
					confidence
				};
			}
		}
		return null;
	}
	matchFontSize(size) {
		if (!this.config.fontSizes) return null;
		const exact = findExactNumber(size, this.config.fontSizes);
		if (exact) return {
			name: exact.name,
			cssVar: `var(--font-size-${exact.name})`,
			rawValue: size,
			tokenValue: exact.value,
			confidence: 1
		};
		if (this.options.fuzzyMatch) {
			const closest = findClosestNumber(size, this.config.fontSizes, this.options.numberTolerance);
			if (closest) {
				const confidence = Math.max(0, 1 - closest.diff / size);
				return {
					name: closest.name,
					cssVar: `var(--font-size-${closest.name})`,
					rawValue: size,
					tokenValue: closest.value,
					confidence
				};
			}
		}
		if (this.options.fallback === "nearest") {
			const nearest = findNearestNumber(size, this.config.fontSizes);
			if (nearest) return {
				name: nearest.name,
				cssVar: `var(--font-size-${nearest.name})`,
				rawValue: size,
				tokenValue: nearest.value,
				confidence: Math.max(0, 1 - nearest.diff / size)
			};
		}
		return null;
	}
	matchFontWeight(weight) {
		if (!this.config.fontWeights) return null;
		const exact = findExactNumber(weight, this.config.fontWeights);
		if (exact) return {
			name: exact.name,
			cssVar: `var(--font-weight-${exact.name})`,
			rawValue: weight,
			tokenValue: exact.value,
			confidence: 1
		};
		return null;
	}
	matchBorderRadius(radius) {
		if (!this.config.borderRadius) return null;
		const exact = findExactNumber(radius, this.config.borderRadius);
		if (exact) return {
			name: exact.name,
			cssVar: `var(--radius-${exact.name})`,
			rawValue: radius,
			tokenValue: exact.value,
			confidence: 1
		};
		if (this.options.fuzzyMatch) {
			const closest = findClosestNumber(radius, this.config.borderRadius, this.options.numberTolerance);
			if (closest) return {
				name: closest.name,
				cssVar: `var(--radius-${closest.name})`,
				rawValue: radius,
				tokenValue: closest.value,
				confidence: Math.max(0, 1 - closest.diff / Math.max(radius, 1))
			};
		}
		return null;
	}
	matchSpacing(value) {
		if (!this.config.spacing) return null;
		const exact = findExactNumber(value, this.config.spacing);
		if (exact) return {
			name: exact.name,
			cssVar: `var(--spacing-${exact.name})`,
			rawValue: value,
			tokenValue: exact.value,
			confidence: 1
		};
		if (this.options.fuzzyMatch) {
			const closest = findClosestNumber(value, this.config.spacing, this.options.numberTolerance);
			if (closest) return {
				name: closest.name,
				cssVar: `var(--spacing-${closest.name})`,
				rawValue: value,
				tokenValue: closest.value,
				confidence: Math.max(0, 1 - closest.diff / Math.max(value, 1))
			};
		}
		return null;
	}
	matchOpacity(opacity) {
		if (!this.config.opacities) return null;
		const exact = findExactNumber(opacity, this.config.opacities);
		if (exact) return {
			name: exact.name,
			cssVar: `var(--opacity-${exact.name})`,
			rawValue: opacity,
			tokenValue: exact.value,
			confidence: 1
		};
		return null;
	}
	tokenizeStyles(styles) {
		const tokenized = {};
		const raw = {};
		const matches = [];
		if (styles.background) {
			const match = this.matchColor(styles.background);
			if (match) {
				tokenized.background = match.cssVar;
				matches.push(match);
			} else raw.background = styles.background;
		}
		if (styles.color) {
			const match = this.matchColor(styles.color);
			if (match) {
				tokenized.color = match.cssVar;
				matches.push(match);
			} else raw.color = styles.color;
		}
		if (styles.fontSize) {
			const size = parseFloat(styles.fontSize);
			if (!isNaN(size)) {
				const match = this.matchFontSize(size);
				if (match) {
					tokenized.fontSize = match.cssVar;
					matches.push(match);
				} else raw.fontSize = styles.fontSize;
			}
		}
		if (styles.fontWeight) {
			const match = this.matchFontWeight(styles.fontWeight);
			if (match) {
				tokenized.fontWeight = match.cssVar;
				matches.push(match);
			} else raw.fontWeight = String(styles.fontWeight);
		}
		if (styles.borderRadius) {
			const radius = parseFloat(styles.borderRadius);
			if (!isNaN(radius)) {
				const match = this.matchBorderRadius(radius);
				if (match) {
					tokenized.borderRadius = match.cssVar;
					matches.push(match);
				} else raw.borderRadius = styles.borderRadius;
			}
		}
		if (typeof styles.opacity === "number") {
			const match = this.matchOpacity(styles.opacity);
			if (match) {
				tokenized.opacity = match.cssVar;
				matches.push(match);
			} else raw.opacity = String(styles.opacity);
		}
		if (styles.border) raw.border = styles.border;
		if (styles.boxShadow) raw.boxShadow = styles.boxShadow;
		if (styles.fontFamily) raw.fontFamily = styles.fontFamily;
		if (styles.lineHeight) raw.lineHeight = styles.lineHeight;
		if (styles.letterSpacing) raw.letterSpacing = styles.letterSpacing;
		if (styles.textDecoration) raw.textDecoration = styles.textDecoration;
		return {
			tokenized,
			raw,
			matches
		};
	}
	generateCssVariables() {
		const lines = [":root {"];
		if (this.config.colors) for (const [name, value] of Object.entries(this.config.colors)) lines.push(`  --color-${name}: ${value};`);
		if (this.config.fontSizes) for (const [name, value] of Object.entries(this.config.fontSizes)) lines.push(`  --font-size-${name}: ${value}px;`);
		if (this.config.fontWeights) for (const [name, value] of Object.entries(this.config.fontWeights)) lines.push(`  --font-weight-${name}: ${value};`);
		if (this.config.borderRadius) for (const [name, value] of Object.entries(this.config.borderRadius)) lines.push(`  --radius-${name}: ${value}px;`);
		if (this.config.spacing) for (const [name, value] of Object.entries(this.config.spacing)) lines.push(`  --spacing-${name}: ${value}px;`);
		if (this.config.opacities) for (const [name, value] of Object.entries(this.config.opacities)) lines.push(`  --opacity-${name}: ${value};`);
		lines.push("}");
		return lines.join("\n");
	}
};
function createTokenMatcher(config, options) {
	return new TokenMatcher(config, options);
}
const tailwindTokens = {
	name: "Tailwind CSS",
	colors: {
		"slate-50": "#f8fafc",
		"slate-100": "#f1f5f9",
		"slate-200": "#e2e8f0",
		"slate-300": "#cbd5e1",
		"slate-400": "#94a3b8",
		"slate-500": "#64748b",
		"slate-600": "#475569",
		"slate-700": "#334155",
		"slate-800": "#1e293b",
		"slate-900": "#0f172a",
		"gray-50": "#f9fafb",
		"gray-100": "#f3f4f6",
		"gray-200": "#e5e7eb",
		"gray-300": "#d1d5db",
		"gray-400": "#9ca3af",
		"gray-500": "#6b7280",
		"gray-600": "#4b5563",
		"gray-700": "#374151",
		"gray-800": "#1f2937",
		"gray-900": "#111827",
		"red-500": "#ef4444",
		"orange-500": "#f97316",
		"amber-500": "#f59e0b",
		"yellow-500": "#eab308",
		"lime-500": "#84cc16",
		"green-500": "#22c55e",
		"emerald-500": "#10b981",
		"teal-500": "#14b8a6",
		"cyan-500": "#06b6d4",
		"sky-500": "#0ea5e9",
		"blue-500": "#3b82f6",
		"indigo-500": "#6366f1",
		"violet-500": "#8b5cf6",
		"purple-500": "#a855f7",
		"fuchsia-500": "#d946ef",
		"pink-500": "#ec4899",
		"rose-500": "#f43f5e",
		"white": "#ffffff",
		"black": "#000000",
		"transparent": "transparent"
	},
	fontSizes: {
		"xs": 12,
		"sm": 14,
		"base": 16,
		"lg": 18,
		"xl": 20,
		"2xl": 24,
		"3xl": 30,
		"4xl": 36,
		"5xl": 48,
		"6xl": 60,
		"7xl": 72,
		"8xl": 96,
		"9xl": 128
	},
	fontWeights: {
		"thin": 100,
		"extralight": 200,
		"light": 300,
		"normal": 400,
		"medium": 500,
		"semibold": 600,
		"bold": 700,
		"extrabold": 800,
		"black": 900
	},
	lineHeights: {
		"none": 1,
		"tight": 1.25,
		"snug": 1.375,
		"normal": 1.5,
		"relaxed": 1.625,
		"loose": 2
	},
	borderRadius: {
		"none": 0,
		"sm": 2,
		"DEFAULT": 4,
		"md": 6,
		"lg": 8,
		"xl": 12,
		"2xl": 16,
		"3xl": 24,
		"full": 9999
	},
	spacing: {
		"0": 0,
		"px": 1,
		"0.5": 2,
		"1": 4,
		"1.5": 6,
		"2": 8,
		"2.5": 10,
		"3": 12,
		"3.5": 14,
		"4": 16,
		"5": 20,
		"6": 24,
		"7": 28,
		"8": 32,
		"9": 36,
		"10": 40,
		"11": 44,
		"12": 48,
		"14": 56,
		"16": 64,
		"20": 80,
		"24": 96,
		"28": 112,
		"32": 128,
		"36": 144,
		"40": 160,
		"44": 176,
		"48": 192,
		"52": 208,
		"56": 224,
		"60": 240,
		"64": 256,
		"72": 288,
		"80": 320,
		"96": 384
	},
	shadows: {
		"sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		"DEFAULT": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
		"md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
		"lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
		"xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
		"2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
		"inner": "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
		"none": "none"
	},
	opacities: {
		"0": 0,
		"5": .05,
		"10": .1,
		"20": .2,
		"25": .25,
		"30": .3,
		"40": .4,
		"50": .5,
		"60": .6,
		"70": .7,
		"75": .75,
		"80": .8,
		"90": .9,
		"95": .95,
		"100": 1
	}
};
const antdTokens = {
	name: "Ant Design",
	colors: {
		"primary": "#1677ff",
		"primary-hover": "#4096ff",
		"primary-active": "#0958d9",
		"primary-bg": "#e6f4ff",
		"success": "#52c41a",
		"success-hover": "#73d13d",
		"success-active": "#389e0d",
		"success-bg": "#f6ffed",
		"warning": "#faad14",
		"warning-hover": "#ffc53d",
		"warning-active": "#d48806",
		"warning-bg": "#fffbe6",
		"error": "#ff4d4f",
		"error-hover": "#ff7875",
		"error-active": "#d9363e",
		"error-bg": "#fff2f0",
		"info": "#1677ff",
		"text": "rgba(0, 0, 0, 0.88)",
		"text-secondary": "rgba(0, 0, 0, 0.65)",
		"text-tertiary": "rgba(0, 0, 0, 0.45)",
		"text-quaternary": "rgba(0, 0, 0, 0.25)",
		"border": "#d9d9d9",
		"border-secondary": "#f0f0f0",
		"fill": "rgba(0, 0, 0, 0.15)",
		"fill-secondary": "rgba(0, 0, 0, 0.06)",
		"fill-tertiary": "rgba(0, 0, 0, 0.04)",
		"bg-container": "#ffffff",
		"bg-elevated": "#ffffff",
		"bg-spotlight": "rgba(0, 0, 0, 0.85)",
		"white": "#ffffff",
		"black": "#000000"
	},
	fontSizes: {
		"sm": 12,
		"base": 14,
		"lg": 16,
		"xl": 20,
		"h1": 38,
		"h2": 30,
		"h3": 24,
		"h4": 20,
		"h5": 16
	},
	fontWeights: {
		"normal": 400,
		"medium": 500,
		"semibold": 600,
		"bold": 700
	},
	lineHeights: {
		"base": 1.5714285714285714,
		"lg": 1.5,
		"sm": 1.6666666666666667
	},
	borderRadius: {
		"xs": 2,
		"sm": 4,
		"base": 6,
		"lg": 8,
		"xl": 12,
		"full": 9999
	},
	spacing: {
		"xxs": 4,
		"xs": 8,
		"sm": 12,
		"base": 16,
		"md": 20,
		"lg": 24,
		"xl": 32,
		"xxl": 48
	},
	shadows: {
		"base": "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
		"secondary": "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
		"tertiary": "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)"
	},
	opacities: {
		"disabled": .25,
		"hover": .04,
		"active": .15
	}
};
const INHERITABLE_PROPERTIES = [
	"color",
	"fontFamily",
	"fontSize",
	"fontWeight",
	"lineHeight",
	"letterSpacing",
	"textAlign",
	"textDecoration"
];
function computeStyleHash(styles) {
	const sortedKeys = Object.keys(styles).sort();
	const parts = [];
	for (const key of sortedKeys) {
		const value = styles[key];
		if (value !== void 0 && value !== null) parts.push(`${key}:${value}`);
	}
	return parts.join("|");
}
function extractInheritableStyles(styles) {
	const result = {};
	for (const prop of INHERITABLE_PROPERTIES) if (styles[prop] !== void 0) result[prop] = styles[prop];
	return result;
}
function removeInheritedStyles(styles, parentStyles) {
	if (!parentStyles) return { ...styles };
	const result = {};
	for (const key of Object.keys(styles)) {
		const value = styles[key];
		const parentValue = parentStyles[key];
		if (INHERITABLE_PROPERTIES.includes(key) && value === parentValue) continue;
		result[key] = value;
	}
	return result;
}
function collectStyleFingerprints(nodes) {
	const fingerprints = /* @__PURE__ */ new Map();
	for (const { id, styles } of nodes) {
		const hash = computeStyleHash(styles);
		if (fingerprints.has(hash)) {
			const fp = fingerprints.get(hash);
			fp.count++;
			fp.nodeIds.push(id);
		} else fingerprints.set(hash, {
			hash,
			styles,
			count: 1,
			nodeIds: [id]
		});
	}
	return fingerprints;
}
var DEFAULT_OPTIONS = {
	extractInheritable: true,
	minRepeatCount: 2,
	classPrefix: "st-",
	mergeSimilar: false
};
function collectAllNodes(node, parentStyles, result = []) {
	if (node.styles) result.push({
		id: node.id,
		styles: node.styles,
		parentStyles
	});
	if (node.children) for (const child of node.children) collectAllNodes(child, node.styles, result);
	return result;
}
function findMostCommonInheritableStyles(nodes) {
	const valueCounts = {};
	for (const { styles } of nodes) {
		const inheritable = extractInheritableStyles(styles);
		for (const [key, value] of Object.entries(inheritable)) {
			if (value === void 0) continue;
			if (!valueCounts[key]) valueCounts[key] = {};
			const strValue = String(value);
			valueCounts[key][strValue] = (valueCounts[key][strValue] || 0) + 1;
		}
	}
	const result = {};
	const totalNodes = nodes.length;
	for (const [key, counts] of Object.entries(valueCounts)) {
		let maxCount = 0;
		let maxValue;
		for (const [value, count] of Object.entries(counts)) if (count > maxCount) {
			maxCount = count;
			maxValue = value;
		}
		if (maxValue && maxCount > totalNodes * .3) if (key === "fontWeight" || key === "opacity") result[key] = parseFloat(maxValue);
		else result[key] = maxValue;
	}
	return result;
}
function generateClassName(prefix, index) {
	return `${prefix}${index}`;
}
function optimizeStyles(root, options = {}) {
	const opts = {
		...DEFAULT_OPTIONS,
		...options
	};
	const allNodes = collectAllNodes(root);
	let rootStyles = {};
	if (opts.extractInheritable && allNodes.length > 0) rootStyles = findMostCommonInheritableStyles(allNodes);
	const processedNodes = [];
	for (const { id, styles, parentStyles } of allNodes) {
		let processed = removeInheritedStyles(styles, parentStyles);
		if (opts.extractInheritable) {
			for (const [key, value] of Object.entries(rootStyles)) if (processed[key] === value) delete processed[key];
		}
		if (Object.keys(processed).length > 0) processedNodes.push({
			id,
			styles: processed
		});
	}
	const fingerprints = collectStyleFingerprints(processedNodes);
	const sharedClasses = /* @__PURE__ */ new Map();
	const nodeClasses = /* @__PURE__ */ new Map();
	const nodeUniqueStyles = /* @__PURE__ */ new Map();
	const hashToClassName = /* @__PURE__ */ new Map();
	let classIndex = 0;
	for (const [hash, fp] of fingerprints.entries()) if (fp.count >= opts.minRepeatCount) {
		const className = generateClassName(opts.classPrefix, classIndex++);
		sharedClasses.set(className, fp.styles);
		hashToClassName.set(hash, className);
		for (const nodeId of fp.nodeIds) {
			if (!nodeClasses.has(nodeId)) nodeClasses.set(nodeId, []);
			nodeClasses.get(nodeId).push(className);
		}
	} else for (const nodeId of fp.nodeIds) nodeUniqueStyles.set(nodeId, fp.styles);
	return {
		rootStyles,
		sharedClasses,
		nodeClasses,
		nodeUniqueStyles
	};
}
function generateOptimizedCss(optimized) {
	const lines = [];
	if (Object.keys(optimized.rootStyles).length > 0) {
		lines.push(":root, body {");
		for (const [key, value] of Object.entries(optimized.rootStyles)) {
			const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			lines.push(`  ${cssKey}: ${value};`);
		}
		lines.push("}");
		lines.push("");
	}
	for (const [className, styles] of optimized.sharedClasses.entries()) {
		lines.push(`.${className} {`);
		for (const [key, value] of Object.entries(styles)) if (value !== void 0) {
			const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			lines.push(`  ${cssKey}: ${value};`);
		}
		lines.push("}");
		lines.push("");
	}
	return lines.join("\n");
}
function getNodeOptimizedStyle(nodeId, optimized) {
	const classes = optimized.nodeClasses.get(nodeId) || [];
	const unique = optimized.nodeUniqueStyles.get(nodeId);
	let uniqueStyle;
	if (unique && Object.keys(unique).length > 0) {
		const parts = [];
		for (const [key, value] of Object.entries(unique)) if (value !== void 0) {
			const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			parts.push(`${cssKey}: ${value}`);
		}
		uniqueStyle = parts.join("; ");
	}
	return {
		classes,
		uniqueStyle
	};
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
function extractStyles(node) {
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
			const background = convertFills(fills);
			if (background) styles.background = background;
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
	}
	if (typeof node.opacity === "number" && node.opacity < 1) styles.opacity = node.opacity;
	if (node.type === "TEXT") {
		const textStyles = convertTextStyles({
			fontName: node.fontName,
			fontSize: node.fontSize,
			height: node.height,
			baselineCount: Array.isArray(node.textData?.baselines) ? node.textData.baselines.length : void 0,
			lineHeight: node.lineHeight,
			characters: node.characters,
			textData: node.textData,
			fills: node.fills
		});
		if (textStyles) Object.assign(styles, textStyles);
	}
	return Object.keys(styles).length > 0 ? styles : void 0;
}
function applyStylesToTree(root) {
	const processNode$1 = (node) => {
		const extractedStyles = extractStyles(node);
		const newNode = { ...node };
		if (extractedStyles || node.styles) newNode.styles = {
			...extractedStyles,
			...node.styles
		};
		if (node.children && node.children.length > 0) newNode.children = node.children.map(processNode$1);
		return newNode;
	};
	return processNode$1(root);
}
function stylesToInlineString(styles) {
	const parts = [];
	if (styles.background) parts.push(`background: ${styles.background}`);
	if (styles.border) parts.push(`border: ${styles.border}`);
	if (styles.borderRadius) parts.push(`border-radius: ${styles.borderRadius}`);
	if (styles.boxShadow) parts.push(`box-shadow: ${styles.boxShadow}`);
	if (typeof styles.opacity === "number") parts.push(`opacity: ${styles.opacity}`);
	if (styles.color) parts.push(`color: ${styles.color}`);
	if (styles.fontFamily) parts.push(`font-family: ${styles.fontFamily}`);
	if (styles.fontSize) parts.push(`font-size: ${styles.fontSize}`);
	if (styles.fontWeight) parts.push(`font-weight: ${styles.fontWeight}`);
	if (styles.lineHeight) parts.push(`line-height: ${styles.lineHeight}`);
	if (styles.letterSpacing) parts.push(`letter-spacing: ${styles.letterSpacing}`);
	if (styles.textDecoration) parts.push(`text-decoration: ${styles.textDecoration}`);
	return parts.join("; ");
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
	const toHex = (n) => n.toString(16).padStart(2, "0");
	const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
	if (canSimplifyHex(hex)) return `#${hex[1]}${hex[3]}${hex[5]}`;
	if (a !== void 0 && a < 1) return hex + toHex(Math.round(a * 255));
	return hex;
}
function canSimplifyHex(hex) {
	return hex[1] === hex[2] && hex[3] === hex[4] && hex[5] === hex[6];
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
var idCounter = 0;
var idMap = /* @__PURE__ */ new Map();
function compressDSL(node, options) {
	const opts = {
		...DEFAULT_COMPRESS_OPTIONS,
		...options
	};
	if (opts.simplifyId) {
		idCounter = 0;
		idMap.clear();
	}
	return compressNode(node, opts);
}
function compressNode(node, opts) {
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
	if (node.children && node.children.length > 0) result.children = node.children.map((child) => compressNode(child, opts));
	return result;
}
function getCompressedId(id, opts) {
	if (!opts.simplifyId) return id;
	if (!idMap.has(id)) idMap.set(id, ++idCounter);
	return idMap.get(id);
}
function compressLayout(layout, opts) {
	if (!layout) return void 0;
	const result = {};
	if (layout.flexDirection) result.direction = layout.flexDirection;
	if (layout.flexWrap === "wrap") result.wrap = true;
	const justify = opts.omitDefaults ? simplifyJustify(layout.justifyContent) : layout.justifyContent;
	if (justify) result.justify = justify;
	const align = opts.omitDefaults ? simplifyAlign(layout.alignItems) : layout.alignItems;
	if (align) result.align = align;
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
	if (styles.borderRadius) result.radius = opts.removeUnits ? simplifyBorderRadius(styles.borderRadius) : styles.borderRadius;
	if (styles.boxShadow) result.shadow = opts.convertColors ? convertShadowColor(styles.boxShadow) : styles.boxShadow;
	if (styles.opacity !== void 0 && styles.opacity < 1) result.opacity = styles.opacity;
	if (styles.color) result.color = opts.convertColors ? rgbToHex(styles.color) : styles.color;
	if (styles.fontFamily) result.font = styles.fontFamily;
	if (styles.fontSize) result.size = opts.removeUnits ? extractNumber(styles.fontSize) : void 0;
	if (styles.fontWeight) result.weight = styles.fontWeight;
	if (styles.lineHeight) result.leading = extractNumber(styles.lineHeight);
	if (styles.letterSpacing) {
		const spacing = extractNumber(styles.letterSpacing);
		if (spacing && spacing !== 0) result.spacing = spacing;
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
function getCompressionStats(original, compressed, minify = true) {
	const originalJson = JSON.stringify(original, null, minify ? 0 : 2);
	const compressedJson = JSON.stringify(compressed, null, minify ? 0 : 2);
	const originalSize = new TextEncoder().encode(originalJson).length;
	const compressedSize = new TextEncoder().encode(compressedJson).length;
	const nodeCount = countNodes(original);
	const originalTokens = Math.ceil(originalJson.length / 4);
	const compressedTokens = Math.ceil(compressedJson.length / 4);
	const savedBytes = originalSize - compressedSize;
	const savedPercent = (savedBytes / originalSize * 100).toFixed(1);
	return {
		original: {
			size: originalSize,
			sizeKB: (originalSize / 1024).toFixed(2),
			nodeCount,
			estimatedTokens: originalTokens
		},
		compressed: {
			size: compressedSize,
			sizeKB: (compressedSize / 1024).toFixed(2),
			estimatedTokens: compressedTokens
		},
		savings: {
			bytes: savedBytes,
			percent: `${savedPercent}%`,
			tokens: originalTokens - compressedTokens
		}
	};
}
function countNodes(node) {
	let count = 1;
	if (node.children) for (const child of node.children) count += countNodes(child);
	return count;
}
function toJsonString(node, minify = true) {
	return JSON.stringify(node, null, minify ? 0 : 2);
}
function printStats(stats) {
	console.log("📊 AI DSL 压缩统计");
	console.log("================");
	console.log(`节点数量: ${stats.original.nodeCount}`);
	console.log("");
	console.log("原始大小:");
	console.log(`  - ${stats.original.sizeKB} KB (${stats.original.size} bytes)`);
	console.log(`  - 估算 token: ~${stats.original.estimatedTokens}`);
	console.log("");
	console.log("压缩后:");
	console.log(`  - ${stats.compressed.sizeKB} KB (${stats.compressed.size} bytes)`);
	console.log(`  - 估算 token: ~${stats.compressed.estimatedTokens}`);
	console.log("");
	console.log("节省:");
	console.log(`  - ${stats.savings.percent} (${stats.savings.bytes} bytes)`);
	console.log(`  - ~${stats.savings.tokens} tokens`);
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
			tag: "span",
			extraClass: "icon",
			role: "img"
		};
		case "IMAGE": return {
			tag: "img",
			role: "img"
		};
		case "VECTOR": return {
			tag: "span",
			extraClass: "vector",
			role: "img"
		};
		case "INSTANCE":
		case "VIRTUAL_GROUP":
		case "FRAME":
		case "GROUP":
		default: return { tag: "div" };
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
function removeRedundantNesting(node) {
	if (node.children && node.children.length > 0) node = {
		...node,
		children: node.children.map((child) => removeRedundantNesting(child))
	};
	if (node.children && node.children.length === 1 && node.children[0].children && node.children[0].children.length > 0) {
		const child = node.children[0];
		const sameSize = Math.abs(node.width - child.width) < 2 && Math.abs(node.height - child.height) < 2;
		const isVirtualGroup = child.type === "VIRTUAL_GROUP";
		if (sameSize && isVirtualGroup) return {
			...node,
			layout: child.layout || node.layout,
			children: child.children
		};
	}
	return node;
}
function escapeHtml(input) {
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
function formatScaleClass(scale) {
	return `scale-${String(scale).replace(".", "_")}`;
}
function shouldUseSpaceBetween(node, spacingAnalysis) {
	if (!spacingAnalysis || !node.children || node.children.length !== 2) return false;
	if (!(node.layout?.flexDirection === "row" || !node.layout?.flexDirection)) return false;
	if (!spacingAnalysis.useGap || spacingAnalysis.gap <= 0) return false;
	const justify = node.layout?.justifyContent;
	if (justify && justify !== "flex-start") return false;
	const parentWidth = typeof node.width === "number" ? node.width : 0;
	if (parentWidth <= 0) return false;
	const { left, right } = spacingAnalysis.padding;
	if (left > 1 || right > 1) return false;
	const sorted = [...node.children].sort((a, b) => a.x - b.x);
	const leftWidth = getEffectiveBounds(sorted[0]).width;
	const rightWidth = getEffectiveBounds(sorted[1]).width;
	const expectedGap = parentWidth - left - right - leftWidth - rightWidth;
	return Math.abs(expectedGap - spacingAnalysis.gap) <= 2;
}
function collectStyleParts(node, isRoot, spacingAnalysis, parentCtx) {
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
	if (isRoot) addDimensions();
	else if (isGraphic) addDimensions();
	else if (isText) {
		const baselines = node.textData?.baselines;
		const baselineCount = Array.isArray(baselines) ? baselines.length : 0;
		const hasBaselineInfo = baselineCount > 0;
		const isMultiLineByBaseline = hasBaselineInfo && baselineCount > 1;
		let isMultiLineByHeight = false;
		if (!hasBaselineInfo) {
			const singleLineHeight = parseFloat(node.styles?.fontSize || "14px") * parseFloat(node.styles?.lineHeight || "1.5");
			isMultiLineByHeight = !!(node.height && node.height > singleLineHeight + 1);
		}
		if (isMultiLineByBaseline || isMultiLineByHeight) {
			if (typeof node.width === "number" && node.width > 0) parts.push(`width: ${node.width}px`);
		}
	} else if (isLeaf) addDimensions();
	else if (hasVisualStyles) addDimensions();
	const layoutGap = node.layout?.gap;
	const hasLayoutGap = typeof layoutGap === "number" && layoutGap > 0;
	const hasLayoutPadding = typeof node.layout?.paddingTop === "number" || typeof node.layout?.paddingRight === "number" || typeof node.layout?.paddingBottom === "number" || typeof node.layout?.paddingLeft === "number";
	if (hasLayoutGap || hasLayoutPadding) {
		if (hasLayoutGap) parts.push(`gap: ${layoutGap}px`);
		const pt = node.layout?.paddingTop ?? 0;
		const pr = node.layout?.paddingRight ?? 0;
		const pb = node.layout?.paddingBottom ?? 0;
		const pl = node.layout?.paddingLeft ?? 0;
		const padParts = [
			pt > 0 ? `${pt}px` : "0",
			pr > 0 ? `${pr}px` : "0",
			pb > 0 ? `${pb}px` : "0",
			pl > 0 ? `${pl}px` : "0"
		];
		if (padParts.some((p) => p !== "0")) parts.push(`padding: ${padParts.join(" ")}`);
	} else if (spacingAnalysis) {
		const { useGap, gap, padding } = spacingAnalysis;
		const useSpaceBetween = shouldUseSpaceBetween(node, spacingAnalysis);
		const gapRound = Math.round(gap);
		if (useSpaceBetween) {
			if (!parts.some((p) => p.startsWith("width:")) && typeof node.width === "number" && node.width > 0) parts.push(`width: ${node.width}px`);
			parts.push("justify-content: space-between");
		} else if (useGap && gapRound > 0) parts.push(`gap: ${gapRound}px`);
		const padParts = [];
		const pt = Math.round(padding.top);
		const pr = Math.round(padding.right);
		const pb = Math.round(padding.bottom);
		const pl = Math.round(padding.left);
		if (pt > 0) padParts.push(`${pt}px`);
		else padParts.push("0");
		if (pr > 0) padParts.push(`${pr}px`);
		else padParts.push("0");
		if (pb > 0) padParts.push(`${pb}px`);
		else padParts.push("0");
		if (pl > 0) padParts.push(`${pl}px`);
		else padParts.push("0");
		if (padParts.some((p) => p !== "0")) parts.push(`padding: ${padParts.join(" ")}`);
	}
	if (parentCtx) {
		const hasLayoutMarginTop = typeof node.layout?.marginTop === "number";
		const hasLayoutMarginLeft = typeof node.layout?.marginLeft === "number";
		let mt = hasLayoutMarginTop ? Math.round(node.layout.marginTop) : 0;
		let ml = hasLayoutMarginLeft ? Math.round(node.layout.marginLeft) : 0;
		if (!hasLayoutMarginTop || !hasLayoutMarginLeft) {
			const pUseGap = typeof parentCtx.parent.layout?.gap === "number" && parentCtx.parent.layout.gap > 0 || (parentCtx.useGap ?? false);
			const pGap = typeof parentCtx.parent.layout?.gap === "number" ? parentCtx.parent.layout.gap : parentCtx.gap ?? 0;
			const pPadding = {
				top: parentCtx.parent.layout?.paddingTop ?? parentCtx.padding?.top ?? 0,
				right: parentCtx.parent.layout?.paddingRight ?? parentCtx.padding?.right ?? 0,
				bottom: parentCtx.parent.layout?.paddingBottom ?? parentCtx.padding?.bottom ?? 0,
				left: parentCtx.parent.layout?.paddingLeft ?? parentCtx.padding?.left ?? 0
			};
			const margins = calcChildMargins(node, parentCtx.parent, parentCtx.prevSibling, parentCtx.isRow, pUseGap, pGap, pPadding, parentCtx.alignItems);
			if (!hasLayoutMarginTop) mt = Math.round(margins.marginTop);
			if (!hasLayoutMarginLeft) ml = Math.round(margins.marginLeft);
		}
		if (mt !== 0) parts.push(`margin-top: ${mt}px`);
		if (ml !== 0) parts.push(`margin-left: ${ml}px`);
	}
	if (node.styles) {
		for (const [key, value] of Object.entries(node.styles)) if (value !== void 0 && value !== null) {
			const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			parts.push(`${cssKey}: ${value}`);
		}
	}
	return parts;
}
function collectAllStyles(node, isRoot, path, parentCtx, entries, contexts) {
	const hasChildren = node.children && node.children.length > 0;
	const nodeId = node.id || `node-${path}`;
	const nodeClass = `n-${sanitizeClassName(nodeId)}`;
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const sortedChildren = hasChildren ? [...node.children].sort((a, b) => isRow ? a.x - b.x : a.y - b.y) : [];
	const spacingAnalysis = hasChildren ? analyzeChildSpacing(node, sortedChildren, isRow) : void 0;
	const styles = collectStyleParts(node, isRoot, spacingAnalysis, parentCtx);
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
			const childCtx = {
				...childCtxBase,
				prevSibling: prev
			};
			collectAllStyles(child, false, `${path}-${index}`, childCtx, entries, contexts);
		});
	}
}
function renderNodeWithDedup(node, _isRoot, includeLabels, classMode, debugMode, dedupResult, path, _parentCtx, semanticTags = true, includeNodeId = true) {
	const hasChildren = node.children && node.children.length > 0;
	const nodeId = node.id || `node-${path}`;
	const tagInfo = semanticTags ? inferTag(node) : { tag: "div" };
	const tag = tagInfo.tag;
	const baseClasses = buildClassNames(node, classMode, debugMode);
	if (tagInfo.extraClass) baseClasses.push(tagInfo.extraClass);
	const allClasses = [...dedupResult.nodeClassMap.get(nodeId) || [], ...baseClasses].join(" ");
	const label = includeLabels ? `<span class="layout-label">${escapeHtml(node.name || node.type)}</span>` : "";
	let content = "";
	if (node.characters) content = escapeHtml(node.characters);
	const dataType = debugMode ? ` data-type="${escapeHtml(node.type)}"` : "";
	const dataNodeId = includeNodeId && nodeId ? ` data-node-id="${escapeHtml(nodeId)}"` : "";
	const roleAttr = tagInfo.role ? ` role="${tagInfo.role}"` : "";
	const altAttr = tag === "img" ? ` alt="${escapeHtml(node.name || "")}"` : "";
	if (isSelfClosingTag(tag)) return `<${tag} class="${allClasses}"${dataNodeId}${dataType}${roleAttr}${altAttr} />`;
	if (!hasChildren) return `<${tag} class="${allClasses}"${dataNodeId}${dataType}${roleAttr}>${label}${content}</${tag}>`;
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const sortedChildren = [...node.children].sort((a, b) => isRow ? a.x - b.x : a.y - b.y);
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
	return `<${tag} class="${allClasses}"${dataNodeId}${dataType}${roleAttr}>${label}${sortedChildren.map((child, index) => {
		const prev = index > 0 ? sortedChildren[index - 1] : null;
		const childCtx = {
			...childCtxBase,
			prevSibling: prev
		};
		return renderNodeWithDedup(child, false, includeLabels, classMode, debugMode, dedupResult, `${path}-${index}`, childCtx, semanticTags, includeNodeId);
	}).join("")}</${tag}>`;
}
function generateUniqueCssRules(dedupResult) {
	const rules = [];
	for (const [nodeId, styles] of dedupResult.uniqueStyles) {
		if (styles.length === 0) continue;
		const classNames = dedupResult.nodeClassMap.get(nodeId);
		if (!classNames) continue;
		const nodeClass = classNames.find((c) => c.startsWith("n-"));
		if (!nodeClass) continue;
		const body = styles.map((s) => `  ${s};`).join("\n");
		rules.push(`.${nodeClass} {\n${body}\n}`);
	}
	return rules.join("\n\n");
}
function renderNode(node, isRoot, includeLabels, classMode, debugMode, cssRules, path, parentCtx, semanticTags = true, includeNodeId = true) {
	const hasChildren = node.children && node.children.length > 0;
	const isRow = node.layout?.flexDirection === "row" || !node.layout?.flexDirection;
	const sortedChildren = hasChildren ? [...node.children].sort((a, b) => isRow ? a.x - b.x : a.y - b.y) : [];
	const spacingAnalysis = hasChildren ? analyzeChildSpacing(node, sortedChildren, isRow) : void 0;
	const tagInfo = semanticTags ? inferTag(node) : { tag: "div" };
	const tag = tagInfo.tag;
	const styleParts = collectStyleParts(node, isRoot, spacingAnalysis, parentCtx);
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
	const label = includeLabels ? `<span class="layout-label">${escapeHtml(node.name || node.type)}</span>` : "";
	let content = "";
	if (node.characters) content = escapeHtml(node.characters);
	const dataType = debugMode ? ` data-type="${escapeHtml(node.type)}"` : "";
	const dataNodeId = includeNodeId && nodeId ? ` data-node-id="${escapeHtml(nodeId)}"` : "";
	if (debugMode && node.id) allClasses.push(nodeIdToClass(node.id));
	const roleAttr = tagInfo.role ? ` role="${tagInfo.role}"` : "";
	const altAttr = tag === "img" ? ` alt="${escapeHtml(node.name || "")}"` : "";
	if (isSelfClosingTag(tag)) return `<${tag} class="${allClasses.join(" ")}"${dataNodeId}${dataType}${roleAttr}${altAttr} />`;
	if (!hasChildren) return `<${tag} class="${allClasses.join(" ")}"${dataNodeId}${dataType}${roleAttr}>${label}${content}</${tag}>`;
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
	const childrenHtml = sortedChildren.map((child, index) => {
		const prev = index > 0 ? sortedChildren[index - 1] : null;
		const childCtx = {
			...childCtxBase,
			prevSibling: prev
		};
		return renderNode(child, false, includeLabels, classMode, debugMode, cssRules, `${path}-${index}`, childCtx, semanticTags, includeNodeId);
	}).join("");
	return `<${tag} class="${allClasses.join(" ")}"${dataNodeId}${dataType}${roleAttr}>${label}${childrenHtml}</${tag}>`;
}
function renderLayoutToHtml(node, options = {}) {
	const { scale = 1, rootClassName = "layout-root", includeLabels = false, classMode = "tailwind", debugMode = false, semanticTags = true, includeNodeId = true } = options;
	return `<div class="${rootClassName} ${formatScaleClass(scale)}">${renderNode(removeRedundantNesting(node), true, includeLabels, classMode, debugMode, [], "0", void 0, semanticTags, includeNodeId)}</div>`;
}
function renderNodeAbsolute(node, isRoot, includeLabels, cssRules, path, parentX, parentY) {
	const hasChildren = node.children && node.children.length > 0;
	const nodeClass = `abs-${sanitizeClassName(node.id || `${node.name || "node"}-${path}` || `node-${path}`)}`;
	const relX = node.x - parentX;
	const relY = node.y - parentY;
	const styleParts = [];
	if (isRoot) styleParts.push("position:relative");
	else {
		styleParts.push("position:absolute");
		styleParts.push(`left:${relX}px`);
		styleParts.push(`top:${relY}px`);
	}
	if (typeof node.width === "number" && node.width > 0) styleParts.push(`width:${node.width}px`);
	if (typeof node.height === "number" && node.height > 0) styleParts.push(`height:${node.height}px`);
	if (node.styles) {
		for (const [key, value] of Object.entries(node.styles)) if (value !== void 0 && value !== null) {
			const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
			styleParts.push(`${cssKey}:${value}`);
		}
	}
	cssRules.push(`.abs-node.${nodeClass}{${styleParts.join(";")}}`);
	const classes = [
		"abs-node",
		hasChildren ? "is-container" : "is-leaf",
		`type-${node.type.toLowerCase()}`,
		nodeClass
	].join(" ");
	const label = includeLabels ? `<div class="abs-label">${escapeHtml(node.name || node.type)}</div>` : "";
	let content = "";
	if (node.characters) content = escapeHtml(node.characters);
	const dataType = includeLabels ? ` data-type="${escapeHtml(node.type)}"` : "";
	if (!hasChildren) return `<div class="${classes}"${dataType}>${label}${content}</div>`;
	return `<div class="${classes}"${dataType}>${label}${node.children.map((child, index) => renderNodeAbsolute(child, false, includeLabels, cssRules, `${path}-${index}`, node.x, node.y)).join("")}</div>`;
}
function renderAbsoluteToHtml(node, options = {}) {
	const { scale = 1, rootClassName = "abs-root", includeLabels = false } = options;
	const cssRules = [];
	const scaleClass = formatScaleClass(scale);
	const cleanedNode = removeRedundantNesting(node);
	return `<div class="${rootClassName} ${scaleClass}">${renderNodeAbsolute(cleanedNode, true, includeLabels, cssRules, "0", cleanedNode.x, cleanedNode.y)}</div>`;
}
function renderAbsolutePage(node, options = {}) {
	const { title = "Absolute Layout", includeStyles = true, scale = 1, includeLabels = false } = options;
	const cssRules = [];
	const scaleClass = formatScaleClass(scale);
	const cleanedNode = removeRedundantNesting(node);
	const body = `<div class="abs-root ${scaleClass}">${renderNodeAbsolute(cleanedNode, true, includeLabels, cssRules, "0", cleanedNode.x, cleanedNode.y)}</div>`;
	return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    ${includeStyles ? `<style>
      body { margin: 0; padding: 16px; font-family: ui-sans-serif, system-ui, -apple-system; color: #333; }
      .abs-root { position: relative; }
      .abs-node { box-sizing: border-box; overflow: hidden; }
      .abs-node.type-text { display: flex; align-items: center; white-space: nowrap; }
      .abs-node.type-image, .abs-node.type-icon, .abs-node.type-vector { background: #d1d5db; }
      .${scaleClass} { transform: scale(${scale}); transform-origin: top left; }
      ${cssRules.join("\n")}
    </style>` : ""}
  </head>
  <body>
    ${body}
  </body>
</html>`;
}
var BASE_STYLES = `body { margin: 0; padding: 16px; }
.layout-root { position: relative; }
.layout-node { box-sizing: border-box; flex-shrink: 0; }
/* 组合类：flex方向 + 交叉轴对齐 */
.flex-row-start { display: flex; flex-direction: row; align-items: flex-start; }
.flex-row-center { display: flex; flex-direction: row; align-items: center; }
.flex-row-end { display: flex; flex-direction: row; align-items: flex-end; }
.flex-col-start { display: flex; flex-direction: column; align-items: flex-start; }
.flex-col-center { display: flex; flex-direction: column; align-items: center; }
.flex-col-end { display: flex; flex-direction: column; align-items: flex-end; }
/* 主轴对齐（较少使用，保留单独类） */
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
/* 按钮重置并默认居中 */
.btn { display: inline-flex; align-items: center; justify-content: center; text-align: center; border: none; padding: 0; background: none; outline: none; appearance: none; -webkit-appearance: none; }
/* 图片/图标占位背景 - 纯灰色，与背景渐变区分 */
.type-image, .type-icon, .type-vector { background: #d1d5db !important; border-radius: 4px; }`;
function renderLayoutPageWithCss(node, options = {}) {
	const { title = "Layout Render", includeStyles = true, ...rest } = options;
	const { rootClassName = "layout-root", includeLabels = false, classMode = "tailwind", debugMode = false, enableDedup = false, semanticTags = true, includeNodeId = true } = rest;
	const designWidth = node.width || 1920;
	const cleanedNode = removeRedundantNesting(node);
	let body;
	let css;
	if (enableDedup) {
		const entries = [];
		collectAllStyles(cleanedNode, true, "0", void 0, entries, []);
		const dedupResult = deduplicateStyles(entries);
		body = `<div id="layout-container" class="${rootClassName}">${renderNodeWithDedup(cleanedNode, true, includeLabels, classMode, debugMode, dedupResult, "0", void 0, semanticTags, includeNodeId)}</div>`;
		css = [generateSharedCss(dedupResult.sharedClasses), generateUniqueCssRules(dedupResult)].filter(Boolean).join("\n\n");
	} else {
		const cssRules = [];
		body = `<div id="layout-container" class="${rootClassName}">${renderNode(cleanedNode, true, includeLabels, classMode, debugMode, cssRules, "0", void 0, semanticTags, includeNodeId)}</div>`;
		css = cssRules.join("\n\n");
	}
	const fullCss = `${BASE_STYLES}\n\n${css}`;
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
    <title>${escapeHtml(title)}</title>
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
function renderLayoutPage(node, options = {}) {
	return renderLayoutPageWithCss(node, options).html;
}
function renderNodeWithClass(node, classNameMap, sharedClasses, includeLabels) {
	const hasChildren = node.children && node.children.length > 0;
	const classes = [];
	const baseClass = classNameMap.get(node.id);
	if (baseClass) classes.push(baseClass);
	if (sharedClasses) {
		const shared = sharedClasses.get(node.id);
		if (shared) classes.push(...shared);
	}
	const classAttr = classes.length > 0 ? ` class="${classes.join(" ")}"` : "";
	const label = includeLabels ? `<div class="node-label">${escapeHtml(node.name || node.type)}</div>` : "";
	let content = "";
	if (node.type === "TEXT" && node.characters) content = escapeHtml(node.characters);
	else if (node.type === "IMAGE") content = "";
	if (!hasChildren) return `<div${classAttr}>${label}${content}</div>`;
	return `<div${classAttr}>${label}\n${node.children.map((child) => renderNodeWithClass(child, classNameMap, sharedClasses, includeLabels)).join("\n")}\n</div>`;
}
function renderHtmlWithClasses(node, options) {
	const { classNameMap, sharedClasses, includeLabels = false } = options;
	return renderNodeWithClass(removeRedundantNesting(node), classNameMap, sharedClasses, includeLabels);
}
function renderSeparatedPage(node, css, options) {
	const { title = "Layout", classNameMap, sharedClasses, includeLabels = false } = options;
	const body = renderNodeWithClass(removeRedundantNesting(node), classNameMap, sharedClasses, includeLabels);
	return {
		html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${body}
  </body>
</html>`,
		css
	};
}
function checkBackgroundOverflow(node, parent, issues, ctx) {
	if (!parent) return;
	if (node.imageRole !== "background") return;
	const tol = ctx.options.backgroundTolerance;
	const leftOverflow = parent.x - node.x;
	const topOverflow = parent.y - node.y;
	const rightOverflow = node.x + node.width - (parent.x + parent.width);
	const bottomOverflow = node.y + node.height - (parent.y + parent.height);
	if (!(leftOverflow > tol || topOverflow > tol || rightOverflow > tol || bottomOverflow > tol)) return;
	issues.push({
		id: ctx.createIssueId("BACKGROUND_OUT_OF_BOUNDS", node.id),
		type: "BACKGROUND_OUT_OF_BOUNDS",
		severity: "warning",
		nodeId: node.id,
		nodeName: node.name,
		message: "背景层尺寸或位置超出父容器，可能导致溢出",
		suggestion: "请将背景与父容器尺寸对齐，或调整偏移",
		metrics: {
			leftOverflow,
			topOverflow,
			rightOverflow,
			bottomOverflow
		},
		relatedNodeIds: [parent.id]
	});
}
function checkSiblingOverlap(node, issues, ctx) {
	if (!node.children || node.children.length === 0) return;
	const result = prefilterOverlappingLayers(node.children);
	if (result.removed.length > 0) for (const removed of result.removed) issues.push({
		id: ctx.createIssueId("SIBLING_OVERLAP", removed.id),
		type: "SIBLING_OVERLAP",
		severity: "warning",
		nodeId: removed.id,
		nodeName: removed.name,
		message: "检测到同名且高度重叠的兄弟节点，疑似重复或层级错误",
		suggestion: "请检查是否存在重复图层或放错父级",
		relatedNodeIds: [node.id]
	});
	if (result.isolated.length > 0) for (const isolated of result.isolated) issues.push({
		id: ctx.createIssueId("FULL_COVER_LAYER", isolated.id),
		type: "FULL_COVER_LAYER",
		severity: "warning",
		nodeId: isolated.id,
		nodeName: isolated.name,
		message: "检测到覆盖父容器大部分区域的异常层，可能淹没其他内容",
		suggestion: "请确认该层是否为背景或占位，如非必要建议调整或移除",
		relatedNodeIds: [node.id]
	});
	const reportedPairs = /* @__PURE__ */ new Set();
	const children = node.children;
	for (let i = 0; i < children.length; i++) for (let j = i + 1; j < children.length; j++) {
		const a = children[i];
		const b = children[j];
		if (a.imageRole === "background" || b.imageRole === "background") continue;
		const overlapRatio = calcOverlapRatio(a, b);
		const samePosition = Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;
		if (overlapRatio >= ctx.options.overlapThreshold || samePosition) {
			const key = `${a.id}-${b.id}`;
			if (reportedPairs.has(key)) continue;
			reportedPairs.add(key);
			issues.push({
				id: ctx.createIssueId("SIBLING_OVERLAP", a.id),
				type: "SIBLING_OVERLAP",
				severity: "warning",
				nodeId: a.id,
				nodeName: a.name,
				message: "同级元素出现大面积重叠或完全同坐标，疑似层级错误",
				suggestion: "请检查图层顺序与归属，避免重叠导致的可视异常",
				relatedNodeIds: [b.id, node.id],
				metrics: { overlapRatio }
			});
		}
	}
}
function calcOverlapRatio(a, b) {
	const overlapArea = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
	const smallerArea = Math.min(a.width * a.height, b.width * b.height);
	if (smallerArea <= 0) return 0;
	return overlapArea / smallerArea;
}
function checkSpacing(node, issues, ctx) {
	if (!node.children || node.children.length < 2) return;
	const direction = node.layout?.flexDirection === "column" ? "column" : "row";
	const sorted = [...node.children].sort((a, b) => direction === "row" ? a.x - b.x : a.y - b.y);
	const spacing = analyzeChildSpacing(node, sorted, direction === "row");
	if (spacing.useGap && spacing.gap > 0) issues.push({
		id: ctx.createIssueId("UNIFIED_GAP_SUGGESTED", node.id),
		type: "UNIFIED_GAP_SUGGESTED",
		severity: "info",
		nodeId: node.id,
		nodeName: node.name,
		message: `子元素间距基本一致，建议统一间距≈${spacing.gap}px`,
		suggestion: "将相邻元素的间隔统一为同一数值，保持等距排布",
		metrics: { gap: spacing.gap }
	});
	const gaps = [];
	for (let i = 1; i < sorted.length; i++) {
		const prev = getEffectiveBounds(sorted[i - 1]);
		const curr = getEffectiveBounds(sorted[i]);
		const gap = direction === "row" ? curr.x - (prev.x + prev.width) : curr.y - (prev.y + prev.height);
		gaps.push(gap);
	}
	if (gaps.length === 0) return;
	const minGap = Math.min(...gaps);
	const maxGap = Math.max(...gaps);
	if (maxGap - minGap > ctx.options.gapTolerance) issues.push({
		id: ctx.createIssueId("INCONSISTENT_SPACING", node.id),
		type: "INCONSISTENT_SPACING",
		severity: "warning",
		nodeId: node.id,
		nodeName: node.name,
		message: "同一容器内的主轴间距差异较大，疑似未统一布局规则",
		suggestion: "请检查自动布局间距设置，或统一留白值",
		metrics: {
			minGap,
			maxGap
		}
	});
}
var DEVICE_KEYWORDS = [
	"phone",
	"device",
	"frame",
	"screen",
	"mobile"
];
var SYSTEM_UI_KEYWORDS = [
	"statusbar",
	"bottombar",
	"navbar",
	"tabbar"
];
function checkDeviceFrame(node, parent, issues, ctx) {
	if (!parent) return;
	if (node.type !== "INSTANCE" && node.type !== "COMPONENT") return;
	const name = node.name?.toLowerCase() || "";
	if (!DEVICE_KEYWORDS.some((k) => name.includes(k))) return;
	if (!(parent.width > 0 && parent.height > 0 && Math.abs(node.width - parent.width) / parent.width <= .05 && Math.abs(node.height - parent.height) / parent.height <= .05)) return;
	const hasParallelContent = (parent.children?.length || 0) > 1;
	if (hasParallelContent) issues.push({
		id: ctx.createIssueId("DEVICE_FRAME_PARALLEL_CONTENT", node.id),
		type: "DEVICE_FRAME_PARALLEL_CONTENT",
		severity: "warning",
		nodeId: node.id,
		nodeName: node.name,
		message: "检测到设备框架与主要内容并列，可能导致内容不在设备壳内",
		suggestion: "请将页面内容放入设备框架内部，或移除外层设备框架",
		relatedNodeIds: parent.children?.map((c) => c.id) || []
	});
	if (node.children && node.children.length > 0) {
		if (node.children.every((child) => SYSTEM_UI_KEYWORDS.some((k) => child.name?.toLowerCase().includes(k))) && hasParallelContent) issues.push({
			id: ctx.createIssueId("DEVICE_FRAME_PARALLEL_CONTENT", `${node.id}-ui`),
			type: "DEVICE_FRAME_PARALLEL_CONTENT",
			severity: "info",
			nodeId: node.id,
			nodeName: node.name,
			message: "设备框架内部仅包含系统 UI，主要内容放在同级，结构可能不合理",
			suggestion: "考虑将系统 UI 与业务内容统一到同一层级或内部容器",
			relatedNodeIds: parent.children?.map((c) => c.id) || []
		});
	}
}
function checkChildOverflow(node, parent, issues, ctx) {
	if (!parent) return;
	if (node.imageRole === "background") return;
	const tol = ctx.options.backgroundTolerance;
	const overflowLeft = parent.x - node.x;
	const overflowTop = parent.y - node.y;
	const overflowRight = node.x + node.width - (parent.x + parent.width);
	const overflowBottom = node.y + node.height - (parent.y + parent.height);
	if (!(overflowLeft > tol || overflowTop > tol || overflowRight > tol || overflowBottom > tol)) return;
	issues.push({
		id: ctx.createIssueId("CHILD_OVERFLOW", node.id),
		type: "CHILD_OVERFLOW",
		severity: "warning",
		nodeId: node.id,
		nodeName: node.name,
		message: "子元素超出父容器范围，可能影响布局",
		suggestion: "检查父容器尺寸或将内容调整到可视范围内",
		metrics: {
			overflowLeft,
			overflowTop,
			overflowRight,
			overflowBottom
		},
		relatedNodeIds: [parent.id]
	});
}
function checkMissingGroup(node, issues, ctx) {
	if (!node.children || node.children.length < 2) return;
	const children = node.children.filter((c) => c.imageRole !== "background" && c.visible !== false);
	if (children.length < 2) return;
	const sorted = [...children].sort((a, b) => a.y - b.y);
	const processedIds = /* @__PURE__ */ new Set();
	for (let i = 0; i < sorted.length - 1; i++) {
		const curr = sorted[i];
		const next = sorted[i + 1];
		if (processedIds.has(curr.id) || processedIds.has(next.id)) continue;
		if (curr.width > 300 || next.width > 300 || curr.height > 300 || next.height > 300) continue;
		const currBounds = getEffectiveBounds(curr);
		const nextBounds = getEffectiveBounds(next);
		const vGap = nextBounds.y - (currBounds.y + currBounds.height);
		const centerDiff = Math.abs(currBounds.x + currBounds.width / 2 - (nextBounds.x + nextBounds.width / 2));
		const isTightStack = vGap >= 0 && vGap <= 8 && centerDiff < 20;
		let isRowPair = false;
		let rowNext = null;
		if (!isTightStack) {
			const rowCandidates = children.filter((c) => c.id !== curr.id && Math.abs(c.y - curr.y) < 10 && c.x > curr.x).sort((a, b) => a.x - b.x);
			if (rowCandidates.length > 0) {
				rowNext = rowCandidates[0];
				const rnBounds = getEffectiveBounds(rowNext);
				const hGap = rnBounds.x - (currBounds.x + currBounds.width);
				const vCenterDiff = Math.abs(currBounds.y + currBounds.height / 2 - (rnBounds.y + rnBounds.height / 2));
				if (hGap >= 0 && hGap <= 12 && vCenterDiff < 10) isRowPair = true;
			}
		}
		if (isTightStack) {
			reportIssue(curr, next, "垂直紧密堆叠", issues, ctx);
			processedIds.add(curr.id);
			processedIds.add(next.id);
		} else if (isRowPair && rowNext) {
			reportIssue(curr, rowNext, "水平紧密关联", issues, ctx);
			processedIds.add(curr.id);
			processedIds.add(rowNext.id);
		}
	}
}
function reportIssue(a, b, reason, issues, ctx) {
	issues.push({
		id: ctx.createIssueId("MISSING_GROUP", a.id),
		type: "MISSING_GROUP",
		severity: "info",
		nodeId: a.id,
		nodeName: `${a.name} + ${b.name}`,
		message: `检测到 ${reason} 的元素未编组`,
		suggestion: "建议将这两个关联紧密的元素打组（Frame/Group），便于管理和布局",
		relatedNodeIds: [b.id]
	});
}
var GEO_EPS = 1;
function checkMergeCandidates(node, parent, issues, ctx) {
	if (parent) detectParentChildCollapse(parent, node, issues, ctx);
	if (node.children && node.children.length > 1) detectSameGeometrySiblings(node, issues, ctx);
}
function detectParentChildCollapse(parent, child, issues, ctx) {
	if (!parent.children || parent.children.length !== 1) return;
	const sameGeometry = isSameGeometry(parent, child);
	const overflow = isOverflow(child, parent);
	if (!sameGeometry && !overflow) return;
	const parentScore = calculateMeaningfulness(parent);
	const childScore = calculateMeaningfulness(child);
	const keepParent$1 = parentScore >= childScore;
	issues.push({
		id: ctx.createIssueId("MERGE_SUGGESTION", parent.id),
		type: "MERGE_SUGGESTION",
		severity: overflow ? "warning" : "info",
		nodeId: keepParent$1 ? parent.id : child.id,
		nodeName: keepParent$1 ? parent.name : child.name,
		message: sameGeometry ? "父子尺寸与位置相同，疑似冗余包装，可塌缩为单层。" : "子元素尺寸超出父容器，建议调整或直接保留子元素。",
		suggestion: keepParent$1 ? "保留父容器，合并子元素内容与样式。" : "保留子元素，用其替代父容器以减少嵌套。",
		relatedNodeIds: [keepParent$1 ? child.id : parent.id],
		metrics: {
			parentScore,
			childScore,
			overflow: overflow ? 1 : 0
		}
	});
}
function detectSameGeometrySiblings(node, issues, ctx) {
	const children = node.children;
	const reported = /* @__PURE__ */ new Set();
	for (let i = 0; i < children.length; i++) for (let j = i + 1; j < children.length; j++) {
		const a = children[i];
		const b = children[j];
		if (!isSameGeometry(a, b)) continue;
		const scoreA = calculateMeaningfulness(a);
		const scoreB = calculateMeaningfulness(b);
		const keepA = scoreA >= scoreB;
		const keep = keepA ? a : b;
		const remove = keepA ? b : a;
		const key = `${keep.id}-${remove.id}`;
		if (reported.has(key)) continue;
		reported.add(key);
		issues.push({
			id: ctx.createIssueId("SAME_GEOMETRY_SIBLINGS", keep.id),
			type: "SAME_GEOMETRY_SIBLINGS",
			severity: "info",
			nodeId: keep.id,
			nodeName: keep.name,
			message: "同级节点几何完全相同，建议合并以减少重复层。",
			suggestion: `保留 ${keep.name}，合并/移除 ${remove.name}，避免重复覆盖。`,
			relatedNodeIds: [remove.id, node.id],
			metrics: {
				keepScore: keepA ? scoreA : scoreB,
				removeScore: keepA ? scoreB : scoreA
			}
		});
	}
}
function isSameGeometry(a, b) {
	return Math.abs((a.x ?? 0) - (b.x ?? 0)) < GEO_EPS && Math.abs((a.y ?? 0) - (b.y ?? 0)) < GEO_EPS && Math.abs((a.width ?? 0) - (b.width ?? 0)) < GEO_EPS && Math.abs((a.height ?? 0) - (b.height ?? 0)) < GEO_EPS;
}
function isOverflow(child, parent) {
	return (child.width ?? 0) > (parent.width ?? 0) + GEO_EPS || (child.height ?? 0) > (parent.height ?? 0) + GEO_EPS;
}
var DEFAULT_OPTS = {
	overlapThreshold: .6,
	gapTolerance: 2,
	backgroundTolerance: 2
};
function checkDesign(json, options = {}) {
	const { pipelineOptions = {
		removeHidden: true,
		removeTransparent: true,
		removeZeroSize: true,
		autoSort: true,
		enableGrouping: false
	}, enableGrouping = true, applyLayout: applyLayout$1 = true, checkOptions } = options;
	const { tree } = processPipeline(json, {
		...pipelineOptions,
		enableGrouping: false
	});
	if (!tree) return {
		tree: null,
		issues: []
	};
	if (enableGrouping) clusterGroups(tree);
	if (applyLayout$1) applyLayout(tree);
	return {
		tree,
		issues: checkLayoutTree(tree, checkOptions)
	};
}
function checkLayoutTree(root, options = {}) {
	const opts = {
		...DEFAULT_OPTS,
		...options
	};
	let counter = 0;
	const ctx = {
		createIssueId: (type, nodeId) => `${type}-${nodeId}-${++counter}`,
		options: opts
	};
	const issues = [];
	function walk(node, parent) {
		checkBackgroundOverflow(node, parent, issues, ctx);
		checkChildOverflow(node, parent, issues, ctx);
		checkDeviceFrame(node, parent, issues, ctx);
		checkMergeCandidates(node, parent, issues, ctx);
		if (node.children && node.children.length > 0) {
			checkSiblingOverlap(node, issues, ctx);
			checkSpacing(node, issues, ctx);
			checkMissingGroup(node, issues, ctx);
			node.children.forEach((child) => walk(child, node));
		}
	}
	walk(root, null);
	return issues;
}
function formatDiagnostics(issues) {
	if (!issues || issues.length === 0) return "No issues found.";
	const severityOrder = {
		error: 2,
		warning: 1,
		info: 0
	};
	const sorted = [...issues].sort((a, b) => {
		const s = severityOrder[b.severity] - severityOrder[a.severity];
		if (s !== 0) return s;
		return a.type.localeCompare(b.type);
	});
	const lines = [];
	const counts = sorted.reduce((acc, cur) => {
		acc[cur.severity] += 1;
		return acc;
	}, {
		error: 0,
		warning: 0,
		info: 0
	});
	lines.push(`Issues: total ${sorted.length} (error ${counts.error}, warning ${counts.warning}, info ${counts.info})`);
	for (const issue of sorted) {
		const msg = `${`[${issue.severity.toUpperCase()}] ${issue.type} · ${issue.nodeName} (${issue.nodeId})`} => ${issue.message}`;
		lines.push(msg);
		if (issue.suggestion) lines.push(`  ↳ Suggestion: ${issue.suggestion}`);
		if (issue.relatedNodeIds && issue.relatedNodeIds.length > 0) lines.push(`  ↳ Related: ${issue.relatedNodeIds.join(", ")}`);
	}
	return lines.join("\n");
}
function generateContainmentTree(json, options) {
	const { tree } = processPipeline(json, options);
	return tree;
}
const utils = {
	hasDeveloperPluginData,
	isAtomicComponent
};
function processDesign(json, options = {}) {
	const { removeHidden = true, removeTransparent = true, removeZeroSize = true, removeOverflow = true, removeOccluded = true, autoSort = true, flattenMode = "full", containerRecoveryMode = "styled-only", clusterAlgorithm = "dbscan", dbscanEps = "auto", gapThresholdX = 50, gapThresholdY = 30, minClusterSize = 2, generateStyles = true } = options;
	const { tree: preprocessed, stats } = processPipeline(json, {
		removeHidden,
		removeTransparent,
		removeZeroSize,
		removeOverflow,
		removeOccluded,
		autoSort,
		enableGrouping: false
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
		stats: {
			removedHidden: 0,
			removedTransparent: 0,
			removedZeroSize: 0,
			removedOverflow: 0,
			removedOccluded: 0,
			remainingNodes: 0
		}
	};
	let flattened;
	if (flattenMode === "full") {
		const leaves = flattenToLeaves(preprocessed);
		flattened = {
			...preprocessed,
			children: leaves
		};
	} else if (flattenMode === "smart") flattened = smartFlatten(preprocessed);
	else flattened = preserveGroupsFlatten(preprocessed);
	let recovered = flattened;
	if (flattenMode === "full") {
		const containerLayers = collectContainers(preprocessed);
		recovered = recoverContainersLayered(flattened, containerLayers, {
			clusterAlgorithm,
			dbscanEps,
			gapThresholdX,
			gapThresholdY,
			minClusterSize,
			containerRecoveryMode
		});
	}
	let clustered;
	if (flattenMode === "full") clustered = recovered;
	else clustered = clusterWithinContainers(recovered, {
		algorithm: clusterAlgorithm,
		dbscanEps,
		gapThresholdX,
		gapThresholdY,
		minClusterSize
	});
	let split;
	if (flattenMode === "full") if ((clustered.children || []).length === 0) split = clustered;
	else split = splitWithinContainers(clustered);
	else split = splitWithinContainers(clustered);
	applyLayout(split);
	let final = split;
	if (generateStyles) final = applyStylesToTree(split);
	return {
		tree: final,
		stages: {
			preprocessed,
			flattened,
			recovered,
			clustered,
			split
		},
		stats: {
			removedHidden: stats.removedHidden,
			removedTransparent: stats.removedTransparent,
			removedZeroSize: stats.removedZeroSize,
			removedOverflow: stats.removedOverflow,
			removedOccluded: stats.removedOccluded,
			remainingNodes: stats.remainingNodes
		}
	};
}
export { CONTAINER_TYPES, DEFAULT_COMPRESS_OPTIONS, LEAF_TYPES, PRESERVE_TYPES, TokenMatcher, analyzeChildSpacing, antdTokens, applyLayout, applyStylesToTree, calcBounds, calcChildMargins, calcChildrenMargins, checkDesign, checkLayoutTree, clusterGroups, clusterLeaves, clusterWithDBSCAN, clusterWithinContainers, collectContainers, compressDSL, convertCornerRadius, convertEffects, convertFills, convertStrokes, convertTextStyles, createTokenMatcher, deduplicateSameNameOverlaps, extractStyles, figmaColorToHex, figmaColorToRgba, filterAndPropagate, findRows, flatten, flattenToLeaves, formatDiagnostics, generateContainmentTree, generateOptimizedCss, getCompressionStats, getEffectiveBounds, getNodeOptimizedStyle, getTextBaselineWidth, hasVisualStylesForSpacing, isolateFullCoverElements, optimizeStyles, parseColorString, prefilterOverlappingLayers, preserveGroupsFlatten, printSplitResult, printStats, processDesign, processPipeline, projectionSplit, recoverContainersLayered, regroupByContainment, regroupTreeByContainment, renderAbsolutePage, renderAbsoluteToHtml, renderHtmlWithClasses, renderLayoutPage, renderLayoutPageWithCss, renderLayoutToHtml, renderSeparatedPage, smartFlatten, splitResultToTree, splitWithinContainers, stylesToInlineString, tailwindTokens, toJsonString, utils };
