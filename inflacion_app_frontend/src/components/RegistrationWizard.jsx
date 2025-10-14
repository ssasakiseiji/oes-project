import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight, List, Send, Edit, X, ArrowLeft, Search } from 'lucide-react';
import { apiFetch } from '../api';
import { useToast } from './Toast';
import LoadingOverlay from './LoadingOverlay';
import './RegistrationWizard.css';

const CustomAlert = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl text-center max-w-sm mx-4 animate-scale-in">
            <p className="text-gray-800 dark:text-gray-100 font-semibold mb-4">{message}</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition">Cancelar</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition">Confirmar</button>
            </div>
        </div>
    </div>
);

const SearchModal = ({ products, categories, prices, onClose, onSelectProduct }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = React.useRef(null);

    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    const categoriesMap = useMemo(() => {
        const map = {};
        categories.forEach(cat => map[cat.id] = cat);
        return map;
    }, [categories]);

    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const term = searchTerm.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(term) ||
            categoriesMap[p.categoryId]?.name.toLowerCase().includes(term)
        );
    }, [products, searchTerm, categoriesMap]);

    const groupedByCategory = useMemo(() => {
        const groups = {};
        filteredProducts.forEach(product => {
            const categoryName = categoriesMap[product.categoryId]?.name || 'Sin categoría';
            if (!groups[categoryName]) {
                groups[categoryName] = [];
            }
            groups[categoryName].push(product);
        });
        return groups;
    }, [filteredProducts, categoriesMap]);

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Buscar Producto</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre o categoría..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
                    {Object.keys(groupedByCategory).length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                            No se encontraron productos
                        </p>
                    ) : (
                        Object.entries(groupedByCategory).map(([categoryName, categoryProducts]) => (
                            <div key={categoryName}>
                                <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 px-2">
                                    {categoryName}
                                </h3>
                                <div className="space-y-2">
                                    {categoryProducts.map((product) => {
                                        const hasPrice = prices[product.id] && prices[product.id] !== '';
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => onSelectProduct(product.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                                                    hasPrice
                                                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                                                        : 'bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                        hasPrice ? 'bg-green-500 dark:bg-green-400' : 'bg-gray-300 dark:bg-gray-500'
                                                    }`}></div>
                                                    <div className="text-left min-w-0 flex-1">
                                                        <p className={`font-semibold text-sm truncate ${
                                                            hasPrice ? 'text-green-800 dark:text-green-200' : 'text-gray-700 dark:text-gray-300'
                                                        }`}>
                                                            {product.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {product.unit}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {hasPrice ? (
                                                        <div className="text-right">
                                                            <p className="font-mono font-bold text-sm text-green-700 dark:text-green-300">
                                                                ₲ {new Intl.NumberFormat('es-PY').format(prices[product.id])}
                                                            </p>
                                                            <span className="text-xs font-bold text-green-600 dark:text-green-400">✓</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">Sin precio</span>
                                                    )}
                                                    <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const CategoryView = ({ category, products, prices, onEdit, onBack }) => {
    const categoryProducts = products.filter(p => p.categoryId === category.id);
    const completedCount = categoryProducts.filter(p => prices[p.id] && prices[p.id] !== '').length;
    const percentage = categoryProducts.length > 0 ? Math.round((completedCount / categoryProducts.length) * 100) : 0;

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-lg max-h-[60vh] overflow-hidden flex flex-col max-w-full">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 p-4 overflow-x-hidden">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/90 hover:text-white mb-3 transition"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-medium">Volver al resumen</span>
                </button>
                <h2 className="text-2xl font-bold text-white mb-2">{category.name}</h2>
                <div className="flex items-center gap-4 text-white/90">
                    <span className="text-3xl font-bold">{percentage}%</span>
                    <span className="text-sm">{completedCount} de {categoryProducts.length} productos completados</span>
                </div>
            </div>

            <div className="overflow-y-auto overflow-x-hidden p-4 space-y-2">
                {categoryProducts.map(product => {
                    const productIndex = products.findIndex(prod => prod.id === product.id);
                    const hasPrice = prices[product.id] && prices[product.id] !== '';

                    return (
                        <div
                            key={product.id}
                            className={`flex justify-between items-center p-4 rounded-xl shadow-sm transition-all ${
                                hasPrice
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                                    : 'bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className={`font-semibold text-base ${hasPrice ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {product.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">({product.unit})</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <p className={`font-mono font-bold text-lg ${hasPrice ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {hasPrice ? `₲ ${new Intl.NumberFormat('es-PY').format(prices[product.id])}` : 'Sin precio'}
                                </p>
                                <button
                                    onClick={() => onEdit(productIndex)}
                                    className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition"
                                >
                                    <Edit size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RegistrationSummary = ({ products, categories, prices, onEdit, onCategoryClick }) => {
    const summaryData = useMemo(() => {
        return categories.map(category => {
            const categoryProducts = products.filter(p => p.categoryId === category.id);
            const completedCount = categoryProducts.filter(p => prices[p.id] && prices[p.id] !== '').length;
            const percentage = categoryProducts.length > 0 ? Math.round((completedCount / categoryProducts.length) * 100) : 0;
            return { ...category, products: categoryProducts, completedCount, totalCount: categoryProducts.length, percentage };
        });
    }, [categories, products, prices]);

    const totalCompleted = Object.values(prices).filter(p => p && p !== '').length;
    const totalPercentage = products.length > 0 ? Math.round((totalCompleted / products.length) * 100) : 0;

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 md:p-6 rounded-3xl shadow-lg max-h-[60vh] overflow-y-auto overflow-x-hidden space-y-4 max-w-full">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 p-4 rounded-2xl text-white">
                <p className="text-sm opacity-90 mb-1">Progreso Total</p>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold">{totalPercentage}%</span>
                    <span className="text-lg opacity-90 mb-1">{totalCompleted} / {products.length} productos</span>
                </div>
            </div>

            {summaryData.map(category => {
                const isComplete = category.completedCount === category.totalCount && category.totalCount > 0;
                return (
                    <button
                        key={category.id}
                        onClick={() => onCategoryClick(category.id)}
                        className={`w-full transition-all duration-200 rounded-2xl overflow-hidden p-4 text-left ${
                            isComplete
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:shadow-md'
                                : 'bg-white/60 dark:bg-gray-700/60 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    isComplete ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'
                                }`}>
                                    <span className={`text-sm font-bold ${isComplete ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}>
                                        {category.percentage}%
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{category.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{category.completedCount} de {category.totalCount} productos</p>
                                </div>
                            </div>
                            <ChevronRight size={24} className="text-gray-400 dark:text-gray-500" />
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default function RegistrationWizard({ commerce, products, categories, initialDraft, onClose, onSubmitSuccess }) {
    const toast = useToast();
    const [step, setStep] = useState(0);
    const [localPrices, setLocalPrices] = useState(initialDraft || {});
    const [alertInfo, setAlertInfo] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const priceInputRef = React.useRef(null);

    const [touchStart, setTouchStart] = useState({ x: null, y: null });
    const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
    const minSwipeDistance = 50;

    const categoriesMap = useMemo(() => {
        const map = {};
        categories.forEach(cat => map[cat.id] = cat);
        return map;
    }, [categories]);

    // Sort products by category
    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => {
            // First, sort by category
            const catA = categoriesMap[a.categoryId];
            const catB = categoriesMap[b.categoryId];

            if (catA && catB) {
                const catComparison = catA.name.localeCompare(catB.name);
                if (catComparison !== 0) return catComparison;
            }

            // Then sort by product name within the same category
            return a.name.localeCompare(b.name);
        });
    }, [products, categoriesMap]);

    const handleCategoryClick = (categoryId) => {
        setSelectedCategoryId(categoryId);
    };

    const handleBackToSummary = () => {
        setSelectedCategoryId(null);
    };

    const handleSelectProduct = (productId) => {
        // Find the index of the product in sortedProducts
        const productIndex = sortedProducts.findIndex(p => p.id === productId);
        if (productIndex !== -1) {
            setStep(productIndex);
            setSelectedCategoryId(null);
            setShowSearchModal(false);
        }
    };

    useEffect(() => {
        if (step < sortedProducts.length && priceInputRef.current) {
            priceInputRef.current.focus();
        }
    }, [step, sortedProducts.length]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (alertInfo || isSubmitting) return; // Don't trigger shortcuts during alerts or submission

            if (e.key === 'Escape') {
                onClose(localPrices);
            } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (step >= sortedProducts.length) {
                    // Summary step - submit
                    confirmSubmission();
                } else {
                    // Product step - advance to next
                    handleNext();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [step, alertInfo, isSubmitting, localPrices, sortedProducts.length]);

    // --- ¡LÓGICA DE PRECIOS MEJORADA! ---
    const handlePriceChange = (productId, value) => {
        // Permitir que el campo esté vacío, pero si hay un valor, asegurar que sea un número entero.
        const numericValue = value.replace(/\D/g, ''); // Eliminar todo lo que no sea dígito
        setLocalPrices(prev => ({ ...prev, [productId]: numericValue === '' ? '' : parseInt(numericValue, 10) }));
    };

    const validatePrice = (price) => {
        if (!price || price === '') return { valid: true, message: '' };
        const numPrice = parseInt(price, 10);
        if (numPrice <= 0) return { valid: false, message: 'El precio debe ser mayor a 0' };
        if (numPrice > 99999999) return { valid: false, message: 'Precio demasiado alto' };
        return { valid: true, message: '' };
    };

    const handleNext = () => {
        if (step < sortedProducts.length) {
            // Allow advancing even with invalid price (they can skip products)
            setStep(prev => prev + 1);
        }
    };
    const handlePrev = () => { if (step > 0) setStep(prev => Math.max(prev - 1, 0)); };
    
    const confirmSubmission = () => {
        const filledCount = Object.values(localPrices).filter(p => p || p === 0).length;
        const confirmationMessage = `Has completado ${filledCount} de ${sortedProducts.length} productos. ¿Deseas enviar el formulario?`;
        setAlertInfo({
            message: confirmationMessage,
            onConfirm: () => { handleSubmit(); setAlertInfo(null); },
            onCancel: () => setAlertInfo(null)
        });
    };

    const handleSubmit = async () => {
        const pricesToSubmit = sortedProducts
            .map(p => ({
                productId: p.id,
                price: localPrices[p.id] && !isNaN(parseFloat(localPrices[p.id])) ? parseFloat(localPrices[p.id]) : null,
                commerceId: commerce.id
            }))
            .filter(p => p.price !== null);

        setIsSubmitting(true);
        try {
            await apiFetch('/api/submit-prices', { method: 'POST', body: JSON.stringify(pricesToSubmit) });
            onSubmitSuccess(commerce.id);
        } catch (error) {
            toast.error(error.message || 'No se pudieron guardar los precios');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const onTouchStart = (e) => {
        setTouchEnd({ x: null, y: null });
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchMove = (e) => {
        setTouchEnd({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const onTouchEnd = () => {
        if (!touchStart.x || !touchEnd.x) return;

        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;

        // Check if horizontal swipe is more significant than vertical
        const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontalSwipe) {
            if (distanceX > minSwipeDistance) handleNext();
            if (distanceX < -minSwipeDistance) handlePrev();
        }

        setTouchStart({ x: null, y: null });
        setTouchEnd({ x: null, y: null });
    };

    const isSummaryStep = step >= sortedProducts.length;
    const currentProduct = sortedProducts[step];
    const currentPriceValidation = currentProduct ? validatePrice(localPrices[currentProduct.id]) : { valid: true, message: '' };

    // Calculate category breakpoints for progress bar
    const categoryBreakpoints = useMemo(() => {
        const breakpoints = [];
        let lastCategoryId = null;

        sortedProducts.forEach((product, index) => {
            if (lastCategoryId !== null && product.categoryId !== lastCategoryId) {
                breakpoints.push({
                    position: (index / sortedProducts.length) * 100,
                    categoryName: categoriesMap[product.categoryId]?.name
                });
            }
            lastCategoryId = product.categoryId;
        });

        return breakpoints;
    }, [sortedProducts, categoriesMap]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-blue-900 flex flex-col z-50 p-4 overflow-x-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            {alertInfo && <CustomAlert {...alertInfo} />}
            {showSearchModal && (
                <SearchModal
                    products={sortedProducts}
                    categories={categories}
                    prices={localPrices}
                    onClose={() => setShowSearchModal(false)}
                    onSelectProduct={handleSelectProduct}
                />
            )}
            <header className="flex-shrink-0 w-full max-w-2xl mx-auto flex justify-between items-center pt-2 px-2">
                <div className="min-w-0 flex-1 mr-2">
                    <p className="text-white/70 text-xs sm:text-sm">Registrando para:</p>
                    <h2 className="text-white font-bold text-base sm:text-lg truncate">{commerce.name}</h2>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => setShowSearchModal(true)}
                        className="p-2 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
                        title="Buscar producto"
                    >
                        <Search size={20}/>
                    </button>
                    <button onClick={() => onClose(localPrices)} className="p-2 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition"><X size={20}/></button>
                </div>
            </header>
            <main className="flex-grow w-full flex flex-col justify-center items-center overflow-x-hidden overflow-y-auto">
                <div key={`${step}-${selectedCategoryId}`} className="w-full max-w-2xl text-center slide-item-enter">
                    {isSummaryStep ? (
                        <>
                            <h2 className="text-4xl font-bold text-white mb-2">
                                {selectedCategoryId ? 'Categoría' : 'Resumen Final'}
                            </h2>
                            <p className="text-white/80 mb-8">
                                {selectedCategoryId ? 'Edita los productos de esta categoría' : 'Revisa los precios antes de enviar.'}
                            </p>
                            {selectedCategoryId ? (
                                <CategoryView
                                    category={categoriesMap[selectedCategoryId]}
                                    products={sortedProducts}
                                    prices={localPrices}
                                    onEdit={(index) => {
                                        setSelectedCategoryId(null);
                                        setStep(index);
                                    }}
                                    onBack={handleBackToSummary}
                                />
                            ) : (
                                <RegistrationSummary
                                    products={sortedProducts}
                                    categories={categories}
                                    prices={localPrices}
                                    onEdit={(index) => setStep(index)}
                                    onCategoryClick={handleCategoryClick}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-base sm:text-lg font-semibold text-white/80 mb-2">{categoriesMap[currentProduct.categoryId]?.name}</p>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 px-4">{currentProduct.name}</h2>
                            <p className="text-sm sm:text-base text-white/70 mb-4">({currentProduct.unit})</p>
                            <div className="relative w-full max-w-xs sm:max-w-sm mx-auto px-4 mb-2">
                                <span className="absolute left-6 sm:left-8 top-1/2 -translate-y-1/2 text-white/50 text-2xl sm:text-3xl">₲</span>
                                <input
                                    ref={priceInputRef}
                                    type="text"
                                    inputMode="numeric"
                                    value={localPrices[currentProduct.id] ? new Intl.NumberFormat('es-PY').format(localPrices[currentProduct.id]) : ''}
                                    onChange={(e) => handlePriceChange(currentProduct.id, e.target.value)}
                                    className={`w-full text-center text-4xl sm:text-5xl md:text-6xl font-bold p-3 sm:p-4 pl-12 sm:pl-14 bg-white/20 text-white rounded-2xl border-2 ${
                                        !currentPriceValidation.valid ? 'border-red-400' : 'border-transparent focus:border-white'
                                    } outline-none placeholder-white/50 transition-colors`}
                                    placeholder="0"
                                />
                            </div>
                            {!currentPriceValidation.valid && (
                                <p className="text-red-300 text-sm font-semibold animate-fade-in">{currentPriceValidation.message}</p>
                            )}
                            {currentPriceValidation.valid && localPrices[currentProduct.id] && (
                                <p className="text-green-300 text-sm font-semibold animate-fade-in">✓ Precio válido</p>
                            )}
                        </>
                    )}
                </div>
            </main>
            <footer className="flex-shrink-0 w-full p-3 sm:p-4 md:p-8">
                <div className="w-full max-w-md mx-auto flex flex-col items-center gap-3 sm:gap-4">
                    <div className="w-full space-y-2">
                        <div className="flex justify-between items-center text-white/90 text-sm font-semibold">
                            <span>{isSummaryStep ? 'Resumen' : `${step + 1} de ${sortedProducts.length}`}</span>
                            <span>{Math.round((step / sortedProducts.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2.5 relative overflow-visible">
                            {/* Category breakpoint markers */}
                            {categoryBreakpoints.map((breakpoint, index) => (
                                <div
                                    key={index}
                                    className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                                    style={{ left: `${breakpoint.position}%` }}
                                    title={breakpoint.categoryName}
                                >
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white"></div>
                                </div>
                            ))}
                            {/* Progress bar */}
                            <div className="bg-gradient-to-r from-white to-blue-200 h-2.5 rounded-full transition-all duration-300 shadow-lg" style={{ width: `${(step / sortedProducts.length) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center w-full gap-2">
                        <button onClick={handlePrev} disabled={step === 0} className="px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1 sm:gap-2 text-sm sm:text-base"><ChevronLeft size={18} /> <span className="hidden sm:inline">Anterior</span></button>
                        <button onClick={() => setStep(sortedProducts.length)} className="p-2 sm:p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition" title="Ver resumen"><List size={18} /></button>
                        {isSummaryStep ? (
                            <button onClick={confirmSubmission} className="px-3 sm:px-6 py-2 sm:py-3 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition flex items-center shadow-lg gap-1 sm:gap-2 text-sm sm:text-base"><Send size={16} /> Enviar</button>
                        ) : (
                            <button onClick={handleNext} className="px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-white text-blue-600 hover:scale-105 transition shadow-lg flex items-center gap-1 sm:gap-2 text-sm sm:text-base"><span className="hidden sm:inline">Siguiente</span> <ChevronRight size={18} /></button>
                        )}
                    </div>
                </div>
            </footer>

            {isSubmitting && <LoadingOverlay message="Enviando precios..." />}
        </div>
    );
}

RegistrationWizard.propTypes = {
    commerce: PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        initialDraft: PropTypes.object,
    }).isRequired,
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        unit: PropTypes.string.isRequired,
        categoryId: PropTypes.number.isRequired,
    })).isRequired,
    categories: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
    })).isRequired,
    initialDraft: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onSubmitSuccess: PropTypes.func.isRequired,
};

CustomAlert.propTypes = {
    message: PropTypes.string.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

SearchModal.propTypes = {
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        unit: PropTypes.string.isRequired,
        categoryId: PropTypes.number.isRequired,
    })).isRequired,
    categories: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
    })).isRequired,
    prices: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onSelectProduct: PropTypes.func.isRequired,
};

CategoryView.propTypes = {
    category: PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
    }).isRequired,
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        unit: PropTypes.string.isRequired,
        categoryId: PropTypes.number.isRequired,
    })).isRequired,
    prices: PropTypes.object.isRequired,
    onEdit: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
};

RegistrationSummary.propTypes = {
    products: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
    })).isRequired,
    categories: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
    })).isRequired,
    prices: PropTypes.object.isRequired,
    onEdit: PropTypes.func,
    onCategoryClick: PropTypes.func.isRequired,
};