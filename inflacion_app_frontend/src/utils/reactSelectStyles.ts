import type { StylesConfig } from 'react-select';

// App is dark-only (Nocturne, ThemeContext forces `.dark` permanently) --
// no light/dark branching needed, just the Nocturne token set.
export const getReactSelectStyles = <Option = unknown>(): StylesConfig<Option, boolean> => ({
    control: (provided, state) => ({
        ...provided,
        backgroundColor: 'var(--color-surface)',
        borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-divider)',
        borderWidth: '1px',
        borderRadius: 'var(--nc-radius-md)',
        boxShadow: state.isFocused ? '0 0 0 2px color-mix(in srgb, var(--color-accent) 30%, transparent)' : 'none',
        '&:hover': {
            borderColor: 'var(--color-accent)',
        }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: 'var(--color-ink)',
    }),
    input: (provided) => ({
        ...provided,
        color: 'var(--color-ink)',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--nc-radius-md)',
        border: '1px solid var(--color-divider)',
        boxShadow: 'var(--nc-shadow-md)',
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? 'var(--color-accent-800)'
            : state.isFocused
                ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
                : 'transparent',
        color: state.isSelected ? 'var(--color-accent-100)' : 'var(--color-ink)',
        cursor: 'pointer',
        '&:active': {
            backgroundColor: 'var(--color-accent-800)',
        }
    }),
    placeholder: (provided) => ({
        ...provided,
        color: 'color-mix(in srgb, var(--color-ink) 55%, transparent)',
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: 'var(--color-accent-800)',
        borderRadius: 'calc(var(--nc-radius-md) * 0.75)',
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: 'var(--color-accent-100)',
    }),
});
