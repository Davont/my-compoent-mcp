"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = void 0;
const react_1 = require("react");
const prefixCls = 'md-select';
function useClickOutside(ref, handler) {
    (0, react_1.useEffect)(() => {
        const listener = (e) => {
            if (!ref.current || ref.current.contains(e.target)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        return () => document.removeEventListener('mousedown', listener);
    }, [ref, handler]);
}
function filterOptions(options, keyword) {
    if (!keyword) return options;
    const lower = keyword.toLowerCase();
    return options.filter((opt) => {
        const label = typeof opt.label === 'string' ? opt.label : String(opt.value);
        return label.toLowerCase().includes(lower);
    });
}
const Select = (props) => {
    const { value: controlledValue, defaultValue, options = [], placeholder = '请选择', disabled = false, multiple = false, allowClear = false, searchable = false, size = 'medium', maxTagCount, className, style, onChange, onSearch, onFocus, onBlur, } = props;
    const wrapperRef = (0, react_1.useRef)(null);
    const inputRef = (0, react_1.useRef)(null);
    const [open, setOpen] = (0, react_1.useState)(false);
    const [innerValue, setInnerValue] = (0, react_1.useState)(defaultValue);
    const [keyword, setKeyword] = (0, react_1.useState)('');
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : innerValue;
    useClickOutside(wrapperRef, () => setOpen(false));
    const filteredOptions = searchable ? filterOptions(options, keyword) : options;
    const handleSelect = (0, react_1.useCallback)((opt) => {
        if (opt.disabled) return;
        let nextValue;
        let nextOption;
        if (multiple) {
            const arr = Array.isArray(currentValue) ? [...currentValue] : [];
            const idx = arr.indexOf(opt.value);
            if (idx >= 0) { arr.splice(idx, 1); } else { arr.push(opt.value); }
            nextValue = arr;
            nextOption = options.filter((o) => arr.includes(o.value));
        } else {
            nextValue = opt.value;
            nextOption = opt;
            setOpen(false);
        }
        if (!isControlled) { setInnerValue(nextValue); }
        setKeyword('');
        onChange === null || onChange === void 0 ? void 0 : onChange(nextValue, nextOption);
    }, [currentValue, multiple, isControlled, options, onChange]);
    const handleClear = (0, react_1.useCallback)((e) => {
        e.stopPropagation();
        const empty = multiple ? [] : undefined;
        if (!isControlled) { setInnerValue(empty); }
        onChange === null || onChange === void 0 ? void 0 : onChange(empty, multiple ? [] : undefined);
    }, [multiple, isControlled, onChange]);
    const handleSearchInput = (0, react_1.useCallback)((e) => {
        const val = e.target.value;
        setKeyword(val);
        onSearch === null || onSearch === void 0 ? void 0 : onSearch(val);
    }, [onSearch]);
    const isSelected = (optValue) => {
        if (multiple && Array.isArray(currentValue)) return currentValue.includes(optValue);
        return currentValue === optValue;
    };
    const renderLabel = () => {
        if (multiple && Array.isArray(currentValue) && currentValue.length > 0) {
            const selected = options.filter((o) => currentValue.includes(o.value));
            const show = maxTagCount !== undefined ? selected.slice(0, maxTagCount) : selected;
            const rest = maxTagCount !== undefined ? selected.length - maxTagCount : 0;
            return (react_1.default.createElement("span", { className: `${prefixCls}__tags` },
                show.map((o) => react_1.default.createElement("span", { key: o.value, className: `${prefixCls}__tag` }, o.label)),
                rest > 0 && react_1.default.createElement("span", { className: `${prefixCls}__tag` }, `+${rest}`)));
        }
        const found = options.find((o) => o.value === currentValue);
        if (found) return react_1.default.createElement("span", { className: `${prefixCls}__label` }, found.label);
        return react_1.default.createElement("span", { className: `${prefixCls}__placeholder` }, placeholder);
    };
    const wrapperCls = [
        prefixCls, `${prefixCls}--${size}`,
        open && `${prefixCls}--open`,
        disabled && `${prefixCls}--disabled`,
        className,
    ].filter(Boolean).join(' ');
    return (react_1.default.createElement("div", { ref: wrapperRef, className: wrapperCls, style: style },
        react_1.default.createElement("div", { className: `${prefixCls}__selector`, onClick: () => { if (!disabled) { setOpen(!open); } }, onFocus: onFocus, onBlur: onBlur, tabIndex: disabled ? -1 : 0, role: "combobox", "aria-expanded": open, "aria-haspopup": "listbox" },
            searchable && open
                ? react_1.default.createElement("input", { ref: inputRef, className: `${prefixCls}__search`, value: keyword, onChange: handleSearchInput, autoFocus: true })
                : renderLabel(),
            allowClear && currentValue != null && !disabled && (react_1.default.createElement("span", { className: `${prefixCls}__clear`, onClick: handleClear }, "\u00D7")),
            react_1.default.createElement("span", { className: `${prefixCls}__arrow` }, "\u25BC")),
        open && (react_1.default.createElement("ul", { className: `${prefixCls}__dropdown`, role: "listbox" },
            filteredOptions.length === 0
                ? react_1.default.createElement("li", { className: `${prefixCls}__empty` }, "\u65E0\u5339\u914D\u9879")
                : filteredOptions.map((opt) => (react_1.default.createElement("li", { key: opt.value, className: [
                    `${prefixCls}__option`,
                    isSelected(opt.value) && `${prefixCls}__option--selected`,
                    opt.disabled && `${prefixCls}__option--disabled`,
                ].filter(Boolean).join(' '), onClick: () => handleSelect(opt), role: "option", "aria-selected": isSelected(opt.value) }, opt.label)))))));
};
exports.Select = Select;
exports.Select.displayName = 'Select';
exports.default = exports.Select;
