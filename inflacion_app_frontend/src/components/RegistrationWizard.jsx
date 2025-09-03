import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, List, Send, Edit, X } from 'lucide-react';
import { apiFetch } from '../api';
import './RegistrationWizard.css';

const CustomAlert = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm mx-4">
            <p className="text-gray-800 font-semibold mb-4">{message}</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
                <button onClick={onConfirm} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirmar</button>
            </div>
        </div>
    </div>
);

const RegistrationSummary = ({ products, categories, prices, onEdit }) => {
    const [activeCategory, setActiveCategory] = useState(null);
    const summaryData = useMemo(() => {
        return categories.map(category => {
            const categoryProducts = products.filter(p => p.categoryId === category.id);
            const completedCount = categoryProducts.filter(p => prices[p.id] && prices[p.id] !== '').length;
            return { ...category, products: categoryProducts, completedCount, totalCount: categoryProducts.length };
        });
    }, [categories, products, prices]);

    return (
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-3xl shadow-lg max-h-[60vh] overflow-y-auto space-y-3">
            {summaryData.map(category => (
                <div key={category.id} className="bg-white/60 p-1 rounded-2xl">
                    <button onClick={() => setActiveCategory(prev => prev === category.id ? null : category.id)} className="w-full flex justify-between items-center p-3 text-left">
                        <h3 className="font-bold text-lg text-gray-800">{category.name}</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-semibold text-gray-600">{category.completedCount} / {category.totalCount}</span>
                            <ChevronRight size={20} className={`transition-transform ${activeCategory === category.id ? 'rotate-90' : ''}`} />
                        </div>
                    </button>
                    {activeCategory === category.id && (
                        <ul className="space-y-2 p-3 pt-0">
                            {category.products.map(p => {
                                const productIndex = products.findIndex(prod => prod.id === p.id);
                                return (
                                    <li key={p.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm">
                                        <p className="font-medium text-gray-700">{p.name}</p>
                                        <div className="flex items-center gap-4">
                                            <p className="font-mono font-bold text-md text-blue-600">{prices[p.id] ? new Intl.NumberFormat('es-PY').format(prices[p.id]) : 'N/A'}</p>
                                            {onEdit && <button onClick={() => onEdit(productIndex)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-full transition"><Edit size={16} /></button>}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
};

export default function RegistrationWizard({ commerce, products, categories, initialDraft, onClose, onSubmitSuccess }) {
    const [step, setStep] = useState(0);
    const [localPrices, setLocalPrices] = useState(initialDraft || {});
    const [alertInfo, setAlertInfo] = useState(null);
    const priceInputRef = React.useRef(null);
    
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const minSwipeDistance = 50;

    const categoriesMap = useMemo(() => {
        const map = {};
        categories.forEach(cat => map[cat.id] = cat);
        return map;
    }, [categories]);

    useEffect(() => { 
        if (step < products.length && priceInputRef.current) {
            priceInputRef.current.focus();
        }
    }, [step]);

    // --- ¡LÓGICA DE PRECIOS MEJORADA! ---
    const handlePriceChange = (productId, value) => {
        // Permitir que el campo esté vacío, pero si hay un valor, asegurar que sea un número entero.
        const numericValue = value.replace(/\D/g, ''); // Eliminar todo lo que no sea dígito
        setLocalPrices(prev => ({ ...prev, [productId]: numericValue === '' ? '' : parseInt(numericValue, 10) }));
    };

    const handleNext = () => { if (step < products.length) setStep(prev => prev + 1); };
    const handlePrev = () => { if (step > 0) setStep(prev => Math.max(prev - 1, 0)); };
    
    const confirmSubmission = () => {
        const filledCount = Object.values(localPrices).filter(p => p || p === 0).length;
        const confirmationMessage = `Has completado ${filledCount} de ${products.length} productos. ¿Deseas enviar el formulario?`;
        setAlertInfo({
            message: confirmationMessage,
            onConfirm: () => { handleSubmit(); setAlertInfo(null); },
            onCancel: () => setAlertInfo(null)
        });
    };
    
    const handleSubmit = async () => {
        const pricesToSubmit = products
            .map(p => ({
                productId: p.id,
                price: localPrices[p.id] && !isNaN(parseFloat(localPrices[p.id])) ? parseFloat(localPrices[p.id]) : null,
                commerceId: commerce.id
            }))
            .filter(p => p.price !== null);

        try {
            await apiFetch('/api/submit-prices', { method: 'POST', body: JSON.stringify(pricesToSubmit) });
            onSubmitSuccess(commerce.id);
        } catch (error) {
            alert('Error: No se pudieron guardar los precios.');
            console.error(error);
        }
    };
    
    const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > minSwipeDistance) handleNext();
        if (distance < -minSwipeDistance) handlePrev();
        setTouchStart(null); setTouchEnd(null);
    };

    const currentProduct = products[step];
    const isSummaryStep = step >= products.length;

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-700 to-blue-900 flex flex-col z-50 p-4" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            {alertInfo && <CustomAlert {...alertInfo} />}
            <header className="flex-shrink-0 w-full max-w-2xl mx-auto flex justify-between items-center pt-2">
                <div><p className="text-white/80 text-sm">Registrando para:</p><h2 className="text-white font-bold text-lg">{commerce.name}</h2></div>
                <button onClick={() => onClose(localPrices)} className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition"><X size={24}/></button>
            </header>
            <main className="flex-grow w-full flex flex-col justify-center items-center overflow-hidden">
                <div key={step} className="w-full max-w-2xl text-center slide-item-enter">
                    {isSummaryStep ? (
                        <>
                            <h2 className="text-4xl font-bold text-white mb-2">Resumen Final</h2>
                            <p className="text-white/80 mb-8">Revisa los precios antes de enviar.</p>
                            <RegistrationSummary products={products} categories={categories} prices={localPrices} onEdit={(index) => setStep(index)} />
                        </>
                    ) : (
                        <>
                            <p className="text-lg font-semibold text-white/80 mb-2">{categoriesMap[currentProduct.categoryId]?.name}</p>
                            <h2 className="text-5xl font-extrabold text-white mb-4">{currentProduct.name}</h2>
                            <p className="text-white/70 mb-12">({currentProduct.unit})</p>
                            <div className="relative w-64 mx-auto">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-3xl">₲</span>
                                <input
                                    ref={priceInputRef}
                                    type="text" // Cambiado a text para controlar el formato
                                    inputMode="numeric" // Muestra el teclado numérico en móviles
                                    value={localPrices[currentProduct.id] ? new Intl.NumberFormat('es-PY').format(localPrices[currentProduct.id]) : ''}
                                    onChange={(e) => handlePriceChange(currentProduct.id, e.target.value)}
                                    className="w-full text-center text-6xl font-bold p-4 pl-14 bg-white/20 text-white rounded-2xl border-2 border-transparent focus:border-white outline-none placeholder-white/50"
                                    placeholder="0"
                                />
                            </div>
                        </>
                    )}
                </div>
            </main>
            <footer className="flex-shrink-0 w-full p-4 md:p-8">
                <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
                    <div className="w-full bg-white/20 rounded-full h-2.5">
                        <div className="bg-white h-2.5 rounded-full" style={{ width: `${(step / products.length) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between items-center w-full">
                        <button onClick={handlePrev} disabled={step === 0} className="px-6 py-3 rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-30 transition flex items-center gap-2"><ChevronLeft size={20} /> Anterior</button>
                        <button onClick={() => setStep(products.length)} className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition"><List size={20} /></button>
                        {isSummaryStep ? (
                            <button onClick={confirmSubmission} className="px-6 py-3 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition flex items-center shadow-lg gap-2"><Send size={18} /> Enviar</button>
                        ) : (
                            <button onClick={handleNext} className="px-6 py-3 rounded-full bg-white text-blue-600 hover:scale-105 transition shadow-lg flex items-center gap-2">Siguiente <ChevronRight size={20} /></button>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    );
}