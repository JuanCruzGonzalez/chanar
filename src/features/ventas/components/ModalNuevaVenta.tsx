import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Producto, Promocion, UnidadMedida } from '../../../core/types';
import { updateProducto } from '../../productos/services/productoService';
import { useVentas } from '../context/VentasContext';

// Small row component for product items (editable unit price)
// Memoized to prevent unnecessary re-renders when parent updates
const ProductRow = React.memo<{
    item: { id_producto: number; cantidad: number; nombre: string; precioventa: number; unidadMedida: UnidadMedida };
    onUpdatePrice: (id_producto: number, newPrice: number) => void;
    onRemove: (id_producto: number) => void;
    onChangeCantidad: (id_producto: number, cantidad: number) => void;
}>(({ item, onUpdatePrice, onRemove, onChangeCantidad }) => {
    return (
        <div key={item.id_producto} className="item-row">
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%' }}>
                    <span>{item.nombre}</span>
                    <span style={{ marginLeft: 8, color: '#666', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>Precio: </span>
                        <input
                            style={{
                                width: '70px',
                                backgroundColor: 'transparent',
                                color: '#000',
                                border: '1px solid #ccc',
                                borderRadius: 4,
                                padding: '2px 6px',
                            }}
                            type="number"
                            value={item.unidadMedida.id_unidad_medida === 1 ? String(Math.round((item.precioventa / 100) * 100) / 100) : String(item.precioventa)}
                            onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                onUpdatePrice(item.id_producto, item.unidadMedida.id_unidad_medida === 1 ? Math.round((val / 100) * 100) / 100 : val);
                            }}
                            min="0"
                        />
                        {item.unidadMedida.id_unidad_medida === 1 ? 'x100gr' : 'x' + item.unidadMedida.abreviacion}
                    </span>
                </div>
                <div>
                    <div className="qty-controls">
                        <button type="button" className="qty-button" onClick={() => onChangeCantidad(item.id_producto, Math.max(1, item.cantidad - 1))}>−</button>
                        <input
                            className="qty-input"
                            type="number"
                            min={1}
                            value={item.cantidad}
                            onChange={(e) => {
                                const raw = e.target.value;
                                // allow empty temporarily, but enforce minimum 1 when applying
                                const parsed = raw === '' ? 0 : parseInt(raw, 10);
                                if (isNaN(parsed)) return;
                                onChangeCantidad(item.id_producto, Math.max(1, parsed));
                            }}
                            style={{ width: 60, textAlign: 'center' }}
                        />
                        <button type="button" className="qty-button" onClick={() => onChangeCantidad(item.id_producto, item.cantidad + 1)}>+</button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontWeight: 'bold', width: 'fit-content' }}>${item.cantidad * item.precioventa}</span>
                            <button className="btn-remove" onClick={() => onRemove(item.id_producto)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                    <path d="M10 11v6"></path>
                                    <path d="M14 11v6"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
});

// Small row component for promotion items (editable quantity and unit price)
// Memoized to prevent unnecessary re-renders when parent updates
const PromoRow = React.memo<{
    promo: { id_promocion: number; name: string; precio: number | null; cantidad: number };
    onChangeCantidad: (id_promocion: number, cantidad: number) => void;
    onChangePrecio: (id_promocion: number, precio: number | null) => void;
    onRemove: (id_promocion: number) => void;
}>(({ promo, onChangeCantidad, onChangePrecio, onRemove }) => {
    return (
        <div key={promo.id_promocion} className="item-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', width: '100%' }}>
                <span>{promo.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="qty-controls">
                        <button type="button" className="qty-button" onClick={() => onChangeCantidad(promo.id_promocion, Math.max(1, promo.cantidad - 1))}>−</button>
                        <input
                            className="qty-input"
                            type="number"
                            min={1}
                            value={promo.cantidad}
                            onChange={(e) => {
                                const raw = e.target.value;
                                const parsed = raw === '' ? 0 : parseInt(raw, 10);
                                if (isNaN(parsed)) return;
                                onChangeCantidad(promo.id_promocion, Math.max(1, parsed));
                            }}
                            style={{ width: 60, textAlign: 'center' }}
                        />
                        <button type="button" className="qty-button" onClick={() => onChangeCantidad(promo.id_promocion, promo.cantidad + 1)}>+</button>
                    </div>
                    <span style={{ marginLeft: '10px', color: '#666' }}>
                        <input
                            type="number"
                            value={promo.precio == null ? '' : String(promo.precio)}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') return onChangePrecio(promo.id_promocion, null);
                                const parsed = parseFloat(raw);
                                onChangePrecio(promo.id_promocion, isNaN(parsed) ? null : parsed);
                            }}
                            min="0"
                            style={{ width: '70px' }}
                        />
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span style={{ fontWeight: 'bold', width: '70px' }}>${(promo.precio ?? 0) * promo.cantidad}</span>
                        <button className="btn-remove" onClick={() => onRemove(promo.id_promocion)}>Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
    );
});

interface ModalNuevaVentaProps {
    productos: Producto[];
    promociones?: Promocion[];
    showError?: (message: string) => void;
    showWarning?: (message: string) => void;
}

export const ModalNuevaVenta = React.memo<ModalNuevaVentaProps>(({
    productos,
    promociones = [],
    showError,
    showWarning,
}) => {
    const { modalNuevaVenta, handleNuevaVenta, crearVentaAsync } = useVentas();
    const [items, setItems] = useState<{ id_producto: number; cantidad: number; nombre: string; precioventa: number; unidadMedida: UnidadMedida }[]>([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState('');
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [showProductosDropdown, setShowProductosDropdown] = useState(false);
    const [cantidad, setCantidad] = useState('');
    const [pagada, setPagada] = useState(true);
    const [promoSeleccionada, setPromoSeleccionada] = useState('');
    const [busquedaPromo, setBusquedaPromo] = useState('');
    const [showPromosDropdown, setShowPromosDropdown] = useState(false);
    const [promoCantidad, setPromoCantidad] = useState('1');
    const [promosAdded, setPromosAdded] = useState<{ id_promocion: number; name: string; precio: number | null; cantidad: number }[]>([]);

    const productSearchRef = useRef<HTMLDivElement>(null);
    const promoSearchRef = useRef<HTMLDivElement>(null);

    // Cerrar dropdowns cuando se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
                setShowProductosDropdown(false);
            }
            if (promoSearchRef.current && !promoSearchRef.current.contains(event.target as Node)) {
                setShowPromosDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mover useMemo ANTES del early return para cumplir las reglas de hooks
    const calcularTotal = useMemo(() => {
        const productosTotal = items.reduce((total, item) => total + (item.cantidad * item.precioventa), 0);
        const promosTotal = promosAdded.reduce((total, p) => total + (p.cantidad * (p.precio ?? 0)), 0);
        return productosTotal + promosTotal;
    }, [items, promosAdded]);

    if (!modalNuevaVenta.isOpen) return null;

    // Filtrar productos basado en la búsqueda
    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase())
    ).slice(0, 10); // Limitar a 10 resultados

    // Filtrar promociones basado en la búsqueda
    const promocionesFiltradas = promociones.filter(p =>
        p.name.toLowerCase().includes(busquedaPromo.toLowerCase())
    ).slice(0, 10);

    const seleccionarProducto = (producto: Producto) => {
        setProductoSeleccionado(String(producto.id_producto));
        setBusquedaProducto(producto.nombre);
        setShowProductosDropdown(false);
    };

    const seleccionarPromocion = (promo: Promocion) => {
        setPromoSeleccionada(String(promo.id_promocion));
        setBusquedaPromo(promo.name);
        setShowPromosDropdown(false);
    };

    const agregarItem = () => {
        const productoId = parseInt(productoSeleccionado);
        const cant = parseInt(cantidad);

        if (!productoId || !cant || cant <= 0) {
            showWarning?.('Seleccione un producto y cantidad válida');
            return;
        }

        const producto = productos.find(p => p.id_producto === productoId);
        if (!producto) return;

        if (producto.stock < cant) {
            showError?.(`Stock insuficiente. Disponible: ${producto.stock}`);
            return;
        }

        if (items.find(i => i.id_producto === productoId)) {
            showWarning?.('Este producto ya está agregado');
            return;
        }

        // Crear objeto UnidadMedida si no existe
        const unidadMedida: UnidadMedida = producto.unidad_medida || {
            id_unidad_medida: producto.id_unidad_medida,
            nombre: producto.id_unidad_medida === 1 ? 'Kilogramo' : 'Unidad',
            abreviacion: producto.id_unidad_medida === 1 ? 'kg' : 'u'
        };

        setItems([...items, {
            id_producto: productoId,
            cantidad: cant,
            nombre: producto.nombre,
            precioventa: producto.precioventa,
            unidadMedida
        }]);
        setProductoSeleccionado('');
        setBusquedaProducto('');
        setCantidad('');
    };

    const handleSubmit = () => {
        if (items.length === 0 && promosAdded.length === 0) {
            showWarning?.('Agregue al menos un producto o promoción');
            return;
        }

        const productosDetalles = items.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad, precioUnitario: i.precioventa }));
        const promocionesDetalles = promosAdded.map(p => ({ id_promocion: p.id_promocion, cantidad: p.cantidad, precioUnitario: p.precio ?? undefined }));

        handleNuevaVenta([...productosDetalles, ...promocionesDetalles], pagada);
        setItems([]);
        setProductoSeleccionado('');
        setBusquedaProducto('');
        setCantidad('');
        setPromosAdded([]);
        setPromoSeleccionada('');
        setBusquedaPromo('');
    };

    const agregarPromocion = () => {
        const id = parseInt(promoSeleccionada);
        const cant = parseInt(promoCantidad) || 1;
        if (!id || cant <= 0) {
            showWarning?.('Seleccione una promoción y cantidad válida');
            return;
        }
        const promo = promociones?.find(p => p.id_promocion === id);
        if (!promo) return;
        if (promosAdded.find(p => p.id_promocion === id)) {
            showWarning?.('Esta promoción ya está agregada');
            return;
        }
        setPromosAdded(prev => [...prev, { id_promocion: promo.id_promocion, name: promo.name, precio: promo.precio, cantidad: cant }]);
        setPromoSeleccionada('');
        setBusquedaPromo('');
        setPromoCantidad('1');
    };

    const removerPromocion = (id_promocion: number) => {
        setPromosAdded(prev => prev.filter(p => p.id_promocion !== id_promocion));
    };

    const updateProductPrice = async (id_producto: number, newPrice: number) => {
        setItems(prev => prev.map(it => it.id_producto === id_producto ? { ...it, precioventa: newPrice } : it));

        try {
            await updateProducto(id_producto, { precioventa: newPrice });
            // Precio actualizado silenciosamente en la base de datos
        } catch (error) {
            showError?.('Error al actualizar el precio en la base de datos');
            console.error('Error updating price:', error);
        }
    };

    const updateProductCantidad = (id_producto: number, cantidad: number) => {
        setItems(prev => prev.map(it => it.id_producto === id_producto ? { ...it, cantidad } : it));
    };

    const updatePromoCantidad = (id_promocion: number, cantidad: number) => {
        setPromosAdded(prev => prev.map(p => p.id_promocion === id_promocion ? { ...p, cantidad } : p));
    };

    const updatePromoPrecio = (id_promocion: number, precio: number | null) => {
        setPromosAdded(prev => prev.map(p => p.id_promocion === id_promocion ? { ...p, precio } : p));
    };

    return (
        <div className="modal-overlay" onClick={modalNuevaVenta.close}>
            <div className="modal-minimal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-minimal-header">
                    <h2>Nueva Venta</h2>
                    <button className="btn-close" onClick={modalNuevaVenta.close}>×</button>
                </div>
                <div className="modal-minimal-body">
                    <div className="form-group" style={{ position: 'relative' }} ref={productSearchRef}>
                        <label>Buscar Producto</label>
                        <input
                            type="text"
                            value={busquedaProducto}
                            onChange={(e) => {
                                setBusquedaProducto(e.target.value);
                                setShowProductosDropdown(true);
                                setProductoSeleccionado('');
                            }}
                            onFocus={() => setShowProductosDropdown(true)}
                            placeholder="Escribe para buscar..."
                        />
                        {showProductosDropdown && busquedaProducto && productosFiltrados.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                {productosFiltrados.map(p => (
                                    <div
                                        key={p.id_producto}
                                        onClick={() => seleccionarProducto(p)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: '14px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                                        <div style={{ fontWeight: 500 }}>{p.descripcion}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            Stock: {p.stock} | ${p.id_unidad_medida === 1 ? (p.precioventa * 100).toFixed(2) : p.precioventa.toFixed(2)}{p.id_unidad_medida === 1 ? ' x100gr' : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '50%' }}>
                            <input
                                type="number"
                                value={cantidad}
                                onChange={(e) => setCantidad(e.target.value)}
                                min="1"
                                placeholder="0"
                            />
                        </div>
                        <button className="btn-secondary" onClick={agregarItem} style={{ width: '50%' }} disabled={crearVentaAsync.loading}>
                            + Agregar
                        </button>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={pagada} onChange={(e) => setPagada(e.target.checked)} />
                            <span>Pagada</span>
                        </label>
                    </div>

                    <div style={{ height: 8 }} />
                    <div className="form-group" style={{ position: 'relative' }} ref={promoSearchRef}>
                        <label>Buscar Promoción</label>
                        <input
                            type="text"
                            value={busquedaPromo}
                            onChange={(e) => {
                                setBusquedaPromo(e.target.value);
                                setShowPromosDropdown(true);
                                setPromoSeleccionada('');
                            }}
                            onFocus={() => setShowPromosDropdown(true)}
                            placeholder="Escribe para buscar..."
                        />
                        {showPromosDropdown && busquedaPromo && promocionesFiltradas.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }}>
                                {promocionesFiltradas.map(p => (
                                    <div
                                        key={p.id_promocion}
                                        onClick={() => seleccionarPromocion(p)}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #f0f0f0',
                                            fontSize: '14px'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            Precio: ${(p.precio ?? 0).toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '50%' }}>
                            <input
                                type="number"
                                value={promoCantidad}
                                onChange={(e) => setPromoCantidad(e.target.value)}
                                min="1"
                            />
                        </div>
                        <button className="btn-secondary" onClick={agregarPromocion} style={{ width: '50%' }} disabled={crearVentaAsync.loading}>
                            + Agregar
                        </button>
                    </div>

                    {items.length > 0 && (
                        <div className="items-list">
                            <h3>Productos agregados:</h3>
                            {items.map(item => (
                                <ProductRow key={item.id_producto} item={item} onUpdatePrice={updateProductPrice} onRemove={(id) => setItems(items.filter(i => i.id_producto !== id))} onChangeCantidad={updateProductCantidad} />
                            ))}
                        </div>
                    )}

                    {promosAdded.length > 0 && (
                        <div className="items-list" style={{ marginTop: 12 }}>
                            <h3>Promociones agregadas:</h3>
                            {promosAdded.map(p => (
                                <PromoRow key={p.id_promocion} promo={p} onChangeCantidad={updatePromoCantidad} onChangePrecio={updatePromoPrecio} onRemove={removerPromocion} />
                            ))}
                        </div>
                    )}
                    <div style={{
                        marginTop: '15px',
                        paddingTop: '15px',
                        borderTop: '2px solid #ddd',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '18px',
                        fontWeight: 'bold'
                    }}>
                        <span>Total:</span>
                        <span>${calcularTotal}</span>
                    </div>
                </div>

                <div className="modal-minimal-footer">
                    <button className="btn-secondary" onClick={modalNuevaVenta.close} disabled={crearVentaAsync.loading}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSubmit} disabled={crearVentaAsync.loading}>
                        {crearVentaAsync.loading ? 'Registrando...' : 'Registrar Venta'}
                    </button>
                </div>

            </div>
        </div>
    );
});
