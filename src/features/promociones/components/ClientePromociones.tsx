import React, { useState, useEffect } from 'react';
import { Categoria, Producto, Promocion, PromocionConDetallesCompletos } from '../../../core/types';
import { getPromocionesActivasConDetalles } from '../services/promocionService';
import { getPromocionImageUrl } from '../../../shared/services/storageService';
import { formatPrice, formatPriceLocale } from '../../../shared/utils';
import { ProductImageSlider } from '../../tienda/components/ProductImageSlider';
import { useCarrito } from '../../tienda/context/CarritoContext';
import { ModalVerProducto } from '../../tienda/components/ModalVerProducto';
import { getCategoriasActivas } from '../../categorias/services/categoriaService';
import { supabase } from '../../../core/config/supabase';

interface ClientePromocionesProps {
  busqueda: string;
  agregarPromocionAlCarrito: (promocion: Promocion, cantidad: number) => void;
  productos: Producto[];
}

export const ClientePromociones = React.memo<ClientePromocionesProps>(({
  busqueda,
  agregarPromocionAlCarrito,
  productos
}) => {
  const [promociones, setPromociones] = useState<PromocionConDetallesCompletos[]>([]);
  const [loading, setLoading] = useState(true);
  const { obtenerItemEnCarrito, actualizarCantidad, manejarAgregarProducto } = useCarrito();
  const [modalProducto, setModalProducto] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productosCategorias, setProductosCategorias] = useState<Map<number, number[]>>(new Map());


  useEffect(() => {
    cargarProductos();
    cargarPromociones();
  }, []);

  const cargarProductos = async () => {
    try {
      const categs = await getCategoriasActivas();
      setCategorias(categs);

      // Cargar relaciones producto-categoría
      const { data: relaciones, error } = await supabase
        .from('categoria_producto')
        .select('id_producto, id_categoria');

      if (!error && relaciones) {
        const mapa = new Map<number, number[]>();
        relaciones.forEach((rel: any) => {
          if (!mapa.has(rel.id_producto)) {
            mapa.set(rel.id_producto, []);
          }
          mapa.get(rel.id_producto)!.push(rel.id_categoria);
        });
        setProductosCategorias(mapa);
      }

    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPromociones = async () => {
    try {
      const data = await getPromocionesActivasConDetalles();
      setPromociones(data);
    } catch (error) {
      console.error('Error al cargar promociones:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatearPrecioPromocion = (precio: number | null) => {
    if (precio === null) return 'Consultar';
    return formatPriceLocale(precio);
  };

  const promocionesFiltradas = promociones.filter(promo =>
    promo.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) {
    return (
      <div className="home-loading">
        <div className="home-loading-content">
          <div className="home-loading-spinner" />
          <p className="home-loading-text">Cargando promociones...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* TITLE SECTION */}
      <div className="home-title-section">
        <div className="home-title-left">
          <h1>Promociones Especiales</h1>
          <p className="home-title-results">
            {promocionesFiltradas.length} {promocionesFiltradas.length === 1 ? 'promoción disponible' : 'promociones disponibles'}
          </p>
        </div>
      </div>

      {/* GRID DE PROMOCIONES */}
      <div className="promociones-container">
        <div className="promociones-grid">
          {promocionesFiltradas.length === 0 ? (
            <div className="home-empty-state">
              <div className="home-empty-state-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="55px" height="55px" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9.5C3 9.03534 3 8.80302 3.03843 8.60982C3.19624 7.81644 3.81644 7.19624 4.60982 7.03843C4.80302 7 5.03534 7 5.5 7H12H18.5C18.9647 7 19.197 7 19.3902 7.03843C20.1836 7.19624 20.8038 7.81644 20.9616 8.60982C21 8.80302 21 9.03534 21 9.5V9.5V9.5C21 9.96466 21 10.197 20.9616 10.3902C20.8038 11.1836 20.1836 11.8038 19.3902 11.9616C19.197 12 18.9647 12 18.5 12H12H5.5C5.03534 12 4.80302 12 4.60982 11.9616C3.81644 11.8038 3.19624 11.1836 3.03843 10.3902C3 10.197 3 9.96466 3 9.5V9.5V9.5Z" stroke="#000000" stroke-width="2" stroke-linejoin="round" />
                  <path d="M4 12V16C4 17.8856 4 18.8284 4.58579 19.4142C5.17157 20 6.11438 20 8 20H9H15H16C17.8856 20 18.8284 20 19.4142 19.4142C20 18.8284 20 17.8856 20 16V12" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M12 7V20" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M11.3753 6.21913L9.3959 3.74487C8.65125 2.81406 7.26102 2.73898 6.41813 3.58187C5.1582 4.8418 6.04662 7 7.82843 7L11 7C11.403 7 11.6271 6.53383 11.3753 6.21913Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  <path d="M12.6247 6.21913L14.6041 3.74487C15.3488 2.81406 16.739 2.73898 17.5819 3.58187C18.8418 4.8418 17.9534 7 16.1716 7L13 7C12.597 7 12.3729 6.53383 12.6247 6.21913Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </div>
              <p className="home-empty-state-text">No hay promociones disponibles</p>
            </div>
          ) : (
            promocionesFiltradas.map((promocion) => (
              <div key={promocion.id_promocion} className="promocion-card">
                {/* Imagen de fondo */}
                <div
                  className="promocion-card-image"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5)), url('${getPromocionImageUrl(promocion.imagen_path ?? null) || 'https://images.unsplash.com/photo-1573821663912-6df460f9c684?w=500&h=400&fit=crop'}')`
                  }}
                />

                {/* Contenido */}
                <div className="promocion-card-content">
                  <h3 className="promocion-card-title">{promocion.name}</h3>

                  {/* Productos incluidos */}
                  {promocion.productos && promocion.productos.length > 0 && (
                    <div className="promocion-card-productos">
                      <p className="promocion-card-productos-label">Incluye:</p>
                      <ul className="promocion-card-productos-list">
                        {promocion.productos.map((detalle) => (
                          <li key={detalle.id_detalle_promocion} className="promocion-card-producto-item">
                            <span className="promocion-card-producto-icon">•</span>
                            <span className="promocion-card-producto-nombre">
                              {detalle.producto?.nombre}
                            </span>
                            <span className="promocion-card-producto-cantidad">
                              x{detalle.cantidad}{detalle.producto?.id_unidad_medida === 1 ? ' gr' : ' und'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Precio */}
                  <div className="promocion-card-price">
                    {formatearPrecioPromocion(promocion.precio)}
                  </div>

                  {/* Botón agregar */}
                  <button
                    className="promocion-card-button"
                    onClick={() => agregarPromocionAlCarrito(promocion, 1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                    Agregar al carrito
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div style={{ display: `${productos.length === 0 ? 'none' : 'block'}` }}>
          {/* TITLE SECTION */}
          <div className="home-title-left" style={{marginTop: '20px'}}>
            <h1>Productos en Descuento</h1>
            <p className="home-title-results">
              {productos.length} {productos.length === 1 ? 'producto disponible' : 'productos disponibles'}
            </p>
          </div>
          {/* Grid de productos */}
          <div className="cliente-products-grid" style={{ marginTop: '40px' }}>
            {
              productos.map(producto => {
                return (
                  <div key={producto.id_producto} className="cliente-product-card" onClick={() => setModalProducto(producto)} style={{ cursor: 'pointer' }}>
                    {/* Slider de imágenes del producto */}
                    <div className="cliente-product-image-container">
                      <ProductImageSlider
                        imagenes={producto.imagenes || []}
                        nombreProducto={producto.nombre}
                        hasPromo={producto.promocion_activa && producto.precio_promocion != null}
                      />
                    </div>

                    {/* Contenido */}
                    <div className="cliente-product-content">
                      <div className="cliente-product-info">
                        <h3 className="cliente-product-title">
                          {producto.nombre}
                        </h3>

                        {producto.descripcion && (
                          <p className="cliente-product-description">
                            {producto.descripcion}
                          </p>
                        )}
                      </div>

                      {/* Botón de agregar o controles de cantidad */}
                      {(() => { // eslint-disable-line
                        const itemEnCarrito = obtenerItemEnCarrito(producto.id_producto);

                        if (itemEnCarrito) {
                          // Mostrar controles + y -
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                              <div className="cliente-product-price-container">
                                {producto.promocion_activa && producto.precio_promocion != null ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{
                                      fontSize: '14px',
                                      color: '#999',
                                      textDecoration: 'line-through'
                                    }}>
                                      {producto.id_unidad_medida === 1
                                        ? `${formatPrice(producto.precioventa * 100)}`
                                        : formatPrice(producto.precioventa)
                                      }
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                      <div className="cliente-product-price" style={{ color: '#e74c3c' }}>
                                        {producto.id_unidad_medida === 1
                                          ? `${formatPrice(producto.precio_promocion * 100)}`
                                          : formatPrice(producto.precio_promocion)
                                        }
                                      </div>
                                      {producto.id_unidad_medida === 1 && (
                                        <span className="cliente-product-price-unit" style={{ fontWeight: 700 }}>
                                          x 100gr
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="cliente-product-price">
                                      {producto.id_unidad_medida === 1
                                        ? `${formatPrice(producto.precioventa * 100)}`
                                        : formatPrice(producto.precioventa)
                                      }
                                    </div>
                                    {producto.id_unidad_medida === 1 && (
                                      <span className="cliente-product-price-unit" style={{ fontWeight: 700 }}>
                                        x 100gr
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="cliente-product-quantity-controls">

                                <button
                                  onClick={() => actualizarCantidad(
                                    `producto-${producto.id_producto}`,
                                    itemEnCarrito.cantidad - (producto.id_unidad_medida === 1 ? 10 : 1)
                                  )}
                                  className="cliente-product-quantity-btn"
                                >
                                  −
                                </button>

                                <span className="cliente-product-quantity-display">
                                  {producto.id_unidad_medida === 1
                                    ? `${Math.round(itemEnCarrito.cantidad)}gr`
                                    : `${itemEnCarrito.cantidad}`
                                  }
                                </span>

                                <button
                                  onClick={() => actualizarCantidad(
                                    `producto-${producto.id_producto}`,
                                    itemEnCarrito.cantidad + (producto.id_unidad_medida === 1 ? 10 : 1)
                                  )}
                                  className="cliente-product-quantity-btn"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        } else {
                          // Mostrar botón de agregar
                          return (
                            <div onClick={e => e.stopPropagation()}>
                              <div>
                                <div className="cliente-product-price-container">
                                  {producto.promocion_activa && producto.precio_promocion != null ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <div style={{
                                        fontSize: '14px',
                                        color: '#999',
                                        textDecoration: 'line-through'
                                      }}>
                                        {producto.id_unidad_medida === 1
                                          ? `${formatPrice(producto.precioventa * 100)}`
                                          : formatPrice(producto.precioventa)
                                        }
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <div className="cliente-product-price" style={{ color: '#e74c3c' }}>
                                          {producto.id_unidad_medida === 1
                                            ? `${formatPrice(producto.precio_promocion * 100)}`
                                            : formatPrice(producto.precio_promocion)
                                          }
                                        </div>
                                        {producto.id_unidad_medida === 1 && (
                                          <span className="cliente-product-price-unit" style={{ fontWeight: 700 }}>
                                            x 100gr
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="cliente-product-price">
                                        {producto.id_unidad_medida === 1
                                          ? `${formatPrice(producto.precioventa * 100)}`
                                          : formatPrice(producto.precioventa)
                                        }
                                      </div>
                                      {producto.id_unidad_medida === 1 && (
                                        <span className="cliente-product-price-unit" style={{ fontWeight: 700 }}>
                                          x 100gr
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <button
                                  onClick={() => manejarAgregarProducto(producto)}
                                  disabled={producto.stock <= 0}
                                  className={`cliente-product-add-btn ${producto.stock > 0 ? 'available' : 'unavailable'}`}
                                >
                                  {producto.stock > 0 ? '+ Agregar al carrito' : 'Sin stock'}
                                </button>
                              </div>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )
              })
            }
          </div>
          {/* Modal ver producto */}
          {modalProducto && (
            <ModalVerProducto
              producto={modalProducto}
              categorias={categorias}
              productosCategorias={productosCategorias}
              onClose={() => setModalProducto(null)}
            />
          )}
        </div>
      </div>
    </>
  );
});
