export const getReactSelectStyles = (isDark) => ({
    control: (provided, state) => ({
        ...provided,
        backgroundColor: isDark ? '#374151' : '#f9fafb',
        borderColor: isDark ? (state.isFocused ? '#3b82f6' : '#4b5563') : (state.isFocused ? '#3b82f6' : '#e5e7eb'),
        borderWidth: '1px',
        borderRadius: '0.5rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
        '&:hover': {
            borderColor: isDark ? '#60a5fa' : '#93c5fd',
        }
    }),
    singleValue: (provided) => ({
        ...provided,
        color: isDark ? '#f3f4f6' : '#1f2937',
    }),
    input: (provided) => ({
        ...provided,
        color: isDark ? '#f3f4f6' : '#1f2937',
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderRadius: '0.5rem',
        border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? (isDark ? '#3b82f6' : '#3b82f6')
            : state.isFocused
                ? (isDark ? '#374151' : '#eff6ff')
                : 'transparent',
        color: state.isSelected ? '#ffffff' : (isDark ? '#f3f4f6' : '#1f2937'),
        cursor: 'pointer',
        '&:active': {
            backgroundColor: isDark ? '#2563eb' : '#2563eb',
        }
    }),
    placeholder: (provided) => ({
        ...provided,
        color: isDark ? '#9ca3af' : '#6b7280',
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: isDark ? '#374151' : '#e5e7eb',
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: isDark ? '#f3f4f6' : '#1f2937',
    }),
});
