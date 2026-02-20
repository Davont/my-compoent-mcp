import React from 'react';
export interface InputProps {
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    maxLength?: number;
    size?: 'small' | 'medium' | 'large';
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    allowClear?: boolean;
    className?: string;
    style?: React.CSSProperties;
    onChange?: (value: string, e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}
export declare const Input: React.FC<InputProps>;
export default Input;
