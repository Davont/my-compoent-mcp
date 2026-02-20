import React from 'react';
export interface SelectOption {
    label: React.ReactNode;
    value: string | number;
    disabled?: boolean;
}
export interface SelectProps {
    value?: string | number | (string | number)[];
    defaultValue?: string | number | (string | number)[];
    options?: SelectOption[];
    placeholder?: string;
    disabled?: boolean;
    multiple?: boolean;
    allowClear?: boolean;
    searchable?: boolean;
    size?: 'small' | 'medium' | 'large';
    maxTagCount?: number;
    className?: string;
    style?: React.CSSProperties;
    onChange?: (value: string | number | (string | number)[], option: SelectOption | SelectOption[]) => void;
    onSearch?: (keyword: string) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
}
export declare const Select: React.FC<SelectProps>;
export default Select;
