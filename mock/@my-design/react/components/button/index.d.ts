import React from 'react';
export interface ButtonProps {
    type?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    block?: boolean;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
export declare const Button: React.FC<ButtonProps>;
export default Button;
