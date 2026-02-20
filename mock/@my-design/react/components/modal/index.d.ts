import React from 'react';
export interface ModalProps {
    visible?: boolean;
    title?: React.ReactNode;
    width?: number | string;
    centered?: boolean;
    closable?: boolean;
    maskClosable?: boolean;
    keyboard?: boolean;
    confirmLoading?: boolean;
    okText?: string;
    cancelText?: string;
    okType?: 'primary' | 'secondary' | 'danger';
    footer?: React.ReactNode | null;
    destroyOnClose?: boolean;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    onOk?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onCancel?: (e: React.MouseEvent<HTMLButtonElement> | KeyboardEvent) => void;
    afterClose?: () => void;
}
export declare const Modal: React.FC<ModalProps>;
export default Modal;
