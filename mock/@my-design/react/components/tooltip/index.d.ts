import React from 'react';
export interface TooltipProps {
    content: React.ReactNode;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
    trigger?: 'hover' | 'click' | 'focus';
    visible?: boolean;
    defaultVisible?: boolean;
    disabled?: boolean;
    mouseEnterDelay?: number;
    mouseLeaveDelay?: number;
    color?: string;
    overlayClassName?: string;
    overlayStyle?: React.CSSProperties;
    children: React.ReactElement;
    onVisibleChange?: (visible: boolean) => void;
}
export declare const Tooltip: React.FC<TooltipProps>;
export default Tooltip;
