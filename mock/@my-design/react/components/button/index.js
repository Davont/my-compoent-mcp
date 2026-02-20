"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const react_1 = require("react");
const prefixCls = 'md-button';
function getClassNames(props) {
    const { type = 'secondary', size = 'medium', disabled, loading, block } = props;
    const classes = [
        prefixCls,
        `${prefixCls}--${type}`,
        `${prefixCls}--${size}`,
    ];
    if (disabled)
        classes.push(`${prefixCls}--disabled`);
    if (loading)
        classes.push(`${prefixCls}--loading`);
    if (block)
        classes.push(`${prefixCls}--block`);
    if (props.className)
        classes.push(props.className);
    return classes.join(' ');
}
function LoadingIcon() {
    return (react_1.default.createElement("span", { className: `${prefixCls}__loading-icon` },
        react_1.default.createElement("svg", { viewBox: "0 0 24 24", width: "1em", height: "1em" },
            react_1.default.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "2", fill: "none" }))));
}
function useRipple(ref) {
    const handleClick = (0, react_1.useCallback)((e) => {
        const button = ref.current;
        if (!button)
            return;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ripple = document.createElement('span');
        ripple.className = `${prefixCls}__ripple`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }, [ref]);
    (0, react_1.useEffect)(() => {
        const button = ref.current;
        if (button) {
            button.addEventListener('click', handleClick);
            return () => button.removeEventListener('click', handleClick);
        }
    }, [ref, handleClick]);
}
const Button = (props) => {
    const { type = 'secondary', size = 'medium', disabled = false, loading = false, icon, iconPosition = 'left', block = false, className, style, children, onClick, ...rest } = props;
    const buttonRef = (0, react_1.useRef)(null);
    const [innerLoading, setInnerLoading] = (0, react_1.useState)(false);
    useRipple(buttonRef);
    const isLoading = loading || innerLoading;
    const handleClick = (0, react_1.useCallback)((e) => {
        if (isLoading || disabled)
            return;
        onClick === null || onClick === void 0 ? void 0 : onClick(e);
    }, [isLoading, disabled, onClick]);
    const iconNode = isLoading ? react_1.default.createElement(LoadingIcon, null) : icon;
    const classNames = getClassNames({ ...props, loading: isLoading });
    return (react_1.default.createElement("button", { ref: buttonRef, className: classNames, style: style, disabled: disabled || isLoading, onClick: handleClick, ...rest },
        iconNode && iconPosition === 'left' && (react_1.default.createElement("span", { className: `${prefixCls}__icon ${prefixCls}__icon--left` }, iconNode)),
        children && (react_1.default.createElement("span", { className: `${prefixCls}__content` }, children)),
        iconNode && iconPosition === 'right' && (react_1.default.createElement("span", { className: `${prefixCls}__icon ${prefixCls}__icon--right` }, iconNode))));
};
exports.Button = Button;
exports.Button.displayName = 'Button';
exports.default = exports.Button;
