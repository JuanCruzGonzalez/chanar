import React, { useState } from 'react';
import { Producto, Categoria } from '../../../core/types';
import { formatPrice } from '../../../shared/utils';
import { useCarrito } from '../context/CarritoContext';
import { getProductImageUrl } from '../../../shared/services/storageService';
import '../../../core/styles/modalVerProducto.css';

interface ModalVerProductoProps {
    producto: Producto;
    categorias: Categoria[];
    productosCategorias: Map<number, number[]>;
    onClose: () => void;
}

export const ModalVerProducto: React.FC<ModalVerProductoProps> = ({
    producto,
    onClose,
}) => {
    const { manejarAgregarProducto, obtenerItemEnCarrito, actualizarCantidad } = useCarrito();
    const itemEnCarrito = obtenerItemEnCarrito(producto.id_producto);

    const imagenesOrdenadas = producto.imagenes
        ? [...producto.imagenes].sort((a, b) => a.orden - b.orden)
        : [];

    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const hasPromo = producto.promocion_activa && producto.precio_promocion != null;
    const precioBase = producto.id_unidad_medida === 1
        ? producto.precioventa * 100
        : producto.precioventa;
    const precioPromo = hasPromo
        ? (producto.id_unidad_medida === 1
            ? producto.precio_promocion! * 100
            : producto.precio_promocion!)
        : null;
    const unidadLabel = producto.id_unidad_medida === 1 ? ' x 100gr' : '';

    return (
        <div className="mvp-overlay" onClick={onClose}>
            <div className="mvp-shell" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="mvp-header">
                    <div className="mvp-header-copy"> 
                        <span className="mvp-eyebrow">Detalle del producto</span>
                        <span className="mvp-header-title">{producto.nombre}</span>
                    </div>
                    <button className="mvp-close-btn" onClick={onClose} aria-label="Cerrar">✕</button>
                </div>

                {/* Two-column content */}
                <div className="mvp-content">

                    {/* Gallery */}
                    <div className="mvp-gallery-panel">
                        <div className="mvp-main-image-card">
                            {imagenesOrdenadas.length > 0 ? (
                                <img
                                    src={getProductImageUrl(imagenesOrdenadas[selectedImageIndex].imagen_path) || undefined}
                                    alt={`${producto.nombre} - imagen ${selectedImageIndex + 1}`}
                                    className="mvp-main-image"
                                />
                            ) : (
                                <div className="mvp-image-placeholder">📦</div>
                            )}
                            {hasPromo && <span className="mvp-promo-badge">Oferta</span>}
                        </div>

                        {imagenesOrdenadas.length > 1 && (
                            <div className="mvp-thumb-row">
                                {imagenesOrdenadas.map((img, index) => (
                                    <button
                                        key={img.id_producto_imagen}
                                        className={`mvp-thumb-btn ${selectedImageIndex === index ? 'mvp-thumb-active' : ''}`}
                                        onClick={() => setSelectedImageIndex(index)}
                                        aria-label={`Ver imagen ${index + 1}`}
                                    >
                                        <img
                                            src={getProductImageUrl(img.imagen_path) || undefined}
                                            alt={`${producto.nombre} vista ${index + 1}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="mvp-details-panel">
                        <div>
                            <h1 className="mvp-product-name">{producto.nombre}</h1>
                            {producto.descripcion && (
                                <p className="mvp-product-description">{producto.descripcion}</p>
                            )}
                        </div>
                        <div className="info-product">
                            {/* Price */}
                            <div className="mvp-price-block">
                                {precioPromo !== null ? (
                                    <>
                                        <span className="mvp-price-original">
                                            {formatPrice(precioBase)}{unidadLabel}
                                        </span>
                                        <span className="mvp-price-promo">
                                            {formatPrice(precioPromo)}{unidadLabel}
                                        </span>
                                    </>
                                ) : (
                                    <span className="mvp-price-regular">
                                        {formatPrice(precioBase)}{unidadLabel}
                                    </span>
                                )}
                            </div>


                            {/* Add to cart / quantity controls */}
                            <div className="mvp-footer">
                                {itemEnCarrito ? (
                                    <div className="mvp-qty-wrapper">
                                        <span className="mvp-qty-label">Cantidad en carrito</span>
                                        <div className="mvp-qty-controls">
                                            <button
                                                className="mvp-qty-btn"
                                                onClick={() => actualizarCantidad(
                                                    `producto-${producto.id_producto}`,
                                                    itemEnCarrito.cantidad - (producto.id_unidad_medida === 1 ? 10 : 1)
                                                )}
                                            >
                                                −
                                            </button>
                                            <span className="mvp-qty-display">
                                                {producto.id_unidad_medida === 1
                                                    ? `${Math.round(itemEnCarrito.cantidad)}gr`
                                                    : itemEnCarrito.cantidad
                                                }
                                            </span>
                                            <button
                                                className="mvp-qty-btn"
                                                onClick={() => actualizarCantidad(
                                                    `producto-${producto.id_producto}`,
                                                    itemEnCarrito.cantidad + (producto.id_unidad_medida === 1 ? 10 : 1)
                                                )}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className={`mvp-add-btn ${producto.stock > 0 ? 'mvp-add-btn-available' : 'mvp-add-btn-unavailable'}`}
                                        onClick={() => producto.stock > 0 && manejarAgregarProducto(producto)}
                                        disabled={producto.stock <= 0}
                                    >
                                        {producto.stock > 0 ? '+ Agregar al carrito' : 'Sin stock'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
