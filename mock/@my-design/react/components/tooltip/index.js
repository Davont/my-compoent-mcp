"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tooltip = void 0;
const react_1 = require("react");
const prefixCls = 'md-tooltip';
function getPosition(triggerRect, placement) {
    const gap = 8;
    const map = {
        top: { left: triggerRect.left + triggerRect.width / 2, top: triggerRect.top - gap },
        bottom: { left: triggerRect.left + triggerRect.width / 2, top: triggerRect.bottom + gap },
        left: { left: triggerRect.left - gap, top: triggerRect.top + triggerRect.height / 2 },
        right: { left: triggerRect.right + gap, top: triggerRect.top + triggerRect.height / 2 },
        topLeft: { left: triggerRect.left, top: triggerRect.top - gap },
        topRight: { left: triggerRect.right, top: triggerRect.top - gap },
        bottomLeft: { left: triggerRect.left, top: triggerRect.bottom + gap },
        bottomRight: { left: triggerRect.right, top: triggerRect.bottom + gap },
    };
    return map[placement] || map.top;
}
const Tooltip = (props) => {
    const { content, placement = 'top', trigger = 'hover', visible: controlledVisible, defaultVisible = false, disabled = false, mouseEnterDelay = 100, mouseLeaveDelay = 100, color, overlayClassName, overlayStyle, children, onVisibleChange, } = props;
    const triggerRef = (0, react_1.useRef)(null);
    const timerRef = (0, react_1.useRef)(null);
    const [innerVisible, setInnerVisible] = (0, react_1.useState)(defaultVisible);
    const isControlled = controlledVisible !== undefined;
    const actualVisible = isControlled ? controlledVisible : innerVisible;
    const setVisible = (0, react_1.useCallback)((val) => {
        if (!isControlled) { setInnerVisible(val); }
        onVisibleChange === null || onVisibleChange === void 0 ? void 0 : onVisibleChange(val);
    }, [isControlled, onVisibleChange]);
    const delaySetVisible = (0, react_1.useCallback)((val, delay) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setVisible(val), delay);
    }, [setVisible]);
    const handleMouseEnter = (0, react_1.useCallback)(() => {
        if (disabled || trigger !== 'hover') return;
        delaySetVisible(true, mouseEnterDelay);
    }, [disabled, trigger, mouseEnterDelay, delaySetVisible]);
    const handleMouseLeave = (0, react_1.useCallback)(() => {
        if (disabled || trigger !== 'hover') return;
        delaySetVisible(false, mouseLeaveDelay);
    }, [disabled, trigger, mouseLeaveDelay, delaySetVisible]);
    const handleClick = (0, react_1.useCallback)(() => {
        if (disabled || trigger !== 'click') return;
        setVisible(!actualVisible);
    }, [disabled, trigger, actualVisible, setVisible]);
    const handleFocus = (0, react_1.useCallback)(() => {
        if (disabled || trigger !== 'focus') return;
        setVisible(true);
    }, [disabled, trigger, setVisible]);
    const handleBlur = (0, react_1.useCallback)(() => {
        if (disabled || trigger !== 'focus') return;
        setVisible(false);
    }, [disabled, trigger, setVisible]);
    (0, react_1.useEffect)(() => {
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);
    const tooltipCls = [
        `${prefixCls}__content`,
        `${prefixCls}__content--${placement}`,
        overlayClassName,
    ].filter(Boolean).join(' ');
    const tooltipStyle = { ...overlayStyle };
    if (color) { tooltipStyle.backgroundColor = color; }
    return (react_1.default.createElement("span", { className: prefixCls, ref: triggerRef, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onClick: handleClick, onFocus: handleFocus, onBlur: handleBlur },
        children,
        actualVisible && !disabled && (react_1.default.createElement("div", { className: tooltipCls, style: tooltipStyle, role: "tooltip" },
            react_1.default.createElement("div", { className: `${prefixCls}__arrow` }),
            react_1.default.createElement("div", { className: `${prefixCls}__inner` }, content)))));
};
exports.Tooltip = Tooltip;
exports.Tooltip.displayName = 'Tooltip';
exports.default = exports.Tooltip;
