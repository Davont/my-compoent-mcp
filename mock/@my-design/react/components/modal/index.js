"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = void 0;
const react_1 = require("react");
const prefixCls = 'md-modal';
function useLockBody(visible) {
    (0, react_1.useEffect)(() => {
        if (!visible) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = original; };
    }, [visible]);
}
function useFocusTrap(ref, visible) {
    (0, react_1.useEffect)(() => {
        if (!visible || !ref.current) return;
        const focusable = ref.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) focusable[0].focus();
        const handleTab = (e) => {
            if (e.key !== 'Tab' || focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, [ref, visible]);
}
const Modal = (props) => {
    const { visible = false, title, width = 520, centered = false, closable = true, maskClosable = true, keyboard = true, confirmLoading = false, okText = '确定', cancelText = '取消', okType = 'primary', footer, destroyOnClose = false, className, style, children, onOk, onCancel, afterClose, } = props;
    const modalRef = (0, react_1.useRef)(null);
    const [animating, setAnimating] = (0, react_1.useState)(false);
    useLockBody(visible);
    useFocusTrap(modalRef, visible);
    (0, react_1.useEffect)(() => {
        if (!visible && !animating) {
            afterClose === null || afterClose === void 0 ? void 0 : afterClose();
        }
    }, [visible, animating, afterClose]);
    (0, react_1.useEffect)(() => {
        if (!keyboard || !visible) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onCancel === null || onCancel === void 0 ? void 0 : onCancel(e);
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [keyboard, visible, onCancel]);
    const handleMaskClick = (0, react_1.useCallback)((e) => {
        if (maskClosable && e.target === e.currentTarget) {
            onCancel === null || onCancel === void 0 ? void 0 : onCancel(e);
        }
    }, [maskClosable, onCancel]);
    if (!visible && destroyOnClose) return null;
    if (!visible) return null;
    const modalCls = [prefixCls, centered && `${prefixCls}--centered`, className].filter(Boolean).join(' ');
    const renderFooter = () => {
        if (footer === null) return null;
        if (footer !== undefined) return footer;
        return (react_1.default.createElement("div", { className: `${prefixCls}__footer` },
            react_1.default.createElement("button", { className: `${prefixCls}__btn ${prefixCls}__btn--cancel`, onClick: onCancel }, cancelText),
            react_1.default.createElement("button", { className: `${prefixCls}__btn ${prefixCls}__btn--${okType}`, disabled: confirmLoading, onClick: onOk }, confirmLoading ? '加载中...' : okText)));
    };
    return (react_1.default.createElement("div", { className: `${prefixCls}__mask`, onClick: handleMaskClick },
        react_1.default.createElement("div", { ref: modalRef, className: modalCls, style: { width, ...style }, role: "dialog", "aria-modal": "true", "aria-labelledby": title ? `${prefixCls}-title` : undefined },
            react_1.default.createElement("div", { className: `${prefixCls}__header` },
                title && react_1.default.createElement("span", { id: `${prefixCls}-title`, className: `${prefixCls}__title` }, title),
                closable && react_1.default.createElement("button", { className: `${prefixCls}__close`, onClick: onCancel, "aria-label": "\u5173\u95ed" }, "\u00D7")),
            react_1.default.createElement("div", { className: `${prefixCls}__body` }, children),
            renderFooter())));
};
exports.Modal = Modal;
exports.Modal.displayName = 'Modal';
exports.default = exports.Modal;
