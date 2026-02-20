"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = void 0;
const react_1 = require("react");
const prefixCls = 'md-input';
const Input = (props) => {
    const { value: controlledValue, defaultValue = '', placeholder, disabled = false, readOnly = false, maxLength, size = 'medium', prefix, suffix, allowClear = false, className, style, onChange, onFocus, onBlur, onPressEnter, } = props;
    const inputRef = (0, react_1.useRef)(null);
    const [innerValue, setInnerValue] = (0, react_1.useState)(defaultValue);
    const [focused, setFocused] = (0, react_1.useState)(false);
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : innerValue;
    const handleChange = (0, react_1.useCallback)((e) => {
        const newValue = e.target.value;
        if (!isControlled) {
            setInnerValue(newValue);
        }
        onChange === null || onChange === void 0 ? void 0 : onChange(newValue, e);
    }, [isControlled, onChange]);
    const handleFocus = (0, react_1.useCallback)((e) => {
        setFocused(true);
        onFocus === null || onFocus === void 0 ? void 0 : onFocus(e);
    }, [onFocus]);
    const handleBlur = (0, react_1.useCallback)((e) => {
        setFocused(false);
        onBlur === null || onBlur === void 0 ? void 0 : onBlur(e);
    }, [onBlur]);
    const handleKeyDown = (0, react_1.useCallback)((e) => {
        if (e.key === 'Enter') {
            onPressEnter === null || onPressEnter === void 0 ? void 0 : onPressEnter(e);
        }
    }, [onPressEnter]);
    const handleClear = (0, react_1.useCallback)(() => {
        if (!isControlled) {
            setInnerValue('');
        }
        onChange === null || onChange === void 0 ? void 0 : onChange('', {});
        const el = inputRef.current;
        if (el)
            el.focus();
    }, [isControlled, onChange]);
    const wrapperCls = [
        `${prefixCls}-wrapper`,
        `${prefixCls}-wrapper--${size}`,
        focused && `${prefixCls}-wrapper--focused`,
        disabled && `${prefixCls}-wrapper--disabled`,
        className,
    ].filter(Boolean).join(' ');
    return (react_1.default.createElement("span", { className: wrapperCls, style: style },
        prefix && (react_1.default.createElement("span", { className: `${prefixCls}__prefix` }, prefix)),
        react_1.default.createElement("input", { ref: inputRef, className: prefixCls, value: currentValue, placeholder: placeholder, disabled: disabled, readOnly: readOnly, maxLength: maxLength, onChange: handleChange, onFocus: handleFocus, onBlur: handleBlur, onKeyDown: handleKeyDown }),
        allowClear && currentValue && !disabled && (react_1.default.createElement("span", { className: `${prefixCls}__clear`, onClick: handleClear }, "\u00D7")),
        suffix && (react_1.default.createElement("span", { className: `${prefixCls}__suffix` }, suffix))));
};
exports.Input = Input;
exports.Input.displayName = 'Input';
exports.default = exports.Input;
