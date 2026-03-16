import React, { useState, useEffect, useMemo } from 'react';
import { Producto, Categoria } from '../../core/types';
import { getProductosActivos } from '../productos/services/productoService';
import { getCategoriasActivas } from '../categorias/services/categoriaService';
import { ClientePromociones } from '../promociones/components/ClientePromociones';
import { ProductImageSlider } from './components/ProductImageSlider';
import { DatosClienteModal } from './components/DatosClienteModal';
import { supabase } from '../../core/config/supabase';
import { formatPrice } from '../../shared/utils';
import { useCarrito } from './context/CarritoContext';
import './ClientePage.css';

type VistaActiva = 'productos' | 'promociones';

export const ClientePage: React.FC = () => {
  const {
    carrito,
    mostrarCarrito,
    modalCantidad,
    cantidadGramos,
    modalDatosCliente,
    setCantidadGramos,
    manejarAgregarProducto,
    agregarPromocionAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    vaciarCarrito,
    calcularTotal,
    enviarPedidoWhatsApp,
    toggleMostrarCarrito,
    cerrarCarrito,
    cerrarModalCantidad,
    confirmarCantidadGramos,
    obtenerItemEnCarrito,
    cerrarModalDatosCliente,
    confirmarPedidoCliente,
  } = useCarrito();

  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('productos');
  const PAGE_SIZE = 15;
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Estados para filtros
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState<number[]>([]);
  const [productosCategorias, setProductosCategorias] = useState<Map<number, number[]>>(new Map());
  const [maxPrice, setMaxPrice] = useState(0);
  const [priceFilter, setPriceFilter] = useState(0);
  const [categoriasPanelOpen, setCategoriasPanelOpen] = useState(false);
  const [expandedParentIds, setExpandedParentIds] = useState<number[]>([]);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const data = await getProductosActivos();
      setProductos(data);

      if (data.length > 0) {
        // Calcular max precio considerando productos por gramos
        const max = Math.max(...data.map(p => {
          const precio = p.id_unidad_medida === 1 ? p.precioventa * 1 : p.precioventa;
          return precio;
        }));
        setMaxPrice(Math.ceil(max));
        setPriceFilter(Math.ceil(max));
      }

      // Cargar categorías activas
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

  const productosFiltrados = useMemo(() => {
    let result = productos.filter(p =>
      p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );

    // Filtrar por categorías seleccionadas
    if (categoriasSeleccionadas.length > 0) {
      result = result.filter(p => {
        const categsDelProducto = productosCategorias.get(p.id_producto) || [];
        return categsDelProducto.some(catId => categoriasSeleccionadas.includes(catId));
      });
    }

    // Filtrar por precio
    if (priceFilter < maxPrice) {
      result = result.filter(p => {
        let precio = (p.promocion_activa && p.precio_promocion != null)
          ? p.precio_promocion
          : p.precioventa;
        // Ajustar precio para productos por gramos
        if (p.id_unidad_medida === 1) {
          precio = precio * 100;
        }
        return precio <= priceFilter;
      });
    }

    return result;
  }, [productos, busqueda, categoriasSeleccionadas, productosCategorias, priceFilter, maxPrice]);

  // Categorías en árbol padre/hijo
  const categoriasRaiz = useMemo(
    () => categorias.filter(c => !c.id_categoria_padre),
    [categorias]
  );
  const getHijosDeCategoria = (padreId: number) =>
    categorias.filter(c => c.id_categoria_padre === padreId);

  // Paginación
  const totalPages = Math.ceil(productosFiltrados.length / PAGE_SIZE);
  const productosPaginados = productosFiltrados.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  // Resetear página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda, categoriasSeleccionadas, priceFilter]);

  const toggleCategoria = (id_categoria: number) => {
    setCategoriasSeleccionadas(prev =>
      prev.includes(id_categoria)
        ? prev.filter(id => id !== id_categoria)
        : [...prev, id_categoria]
    );
  };

  const toggleExpandedParent = (id: number) => {
    setExpandedParentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setBusqueda('');
    setPriceFilter(maxPrice);
    setCategoriasSeleccionadas([]);
    setCurrentPage(1);
  };

  return (
    <div className="cliente-page">
      {/* Header moderno */}
      <header className="cliente-header">
        <div className="cliente-header-content">
          <button
            className="cliente-categorias-hamburger"
            onClick={() => setCategoriasPanelOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            {categoriasSeleccionadas.length > 0 && (
              <span className="cliente-categorias-badge">{categoriasSeleccionadas.length}</span>
            )}
          </button>
          <div className="cliente-header-logo">
            <div className="cliente-header-icon">
              <img src="/logo.png" alt="Logo Chañar" style={{ width: 105, height: 'auto' }} />
            </div>
            <h1 className="cliente-header-title">
              Chañar
            </h1>
          </div>

          {/* Navegación de vistas (desktop) */}
          <nav className="cliente-header-nav">
            <button
              className={`cliente-header-nav-link ${vistaActiva === 'productos' ? 'active' : ''}`}
              onClick={() => setVistaActiva('productos')}
            >
              Productos
            </button>
            <button
              className={`cliente-header-nav-link ${vistaActiva === 'promociones' ? 'active' : ''}`}
              onClick={() => setVistaActiva('promociones')}
            >
              Promociones
            </button>
          </nav>

          {/* Buscador en header */}
          <div className="cliente-header-search-container">
            <div className="cliente-header-search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
                <path d="M15.7955 15.8111L21 21M18 10.5C18 14.6421 14.6421 18 10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5Z" stroke="#a8a7a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="cliente-header-search-input"
            />
          </div>

          <button
            onClick={toggleMostrarCarrito}
            className="cliente-header-cart-btn"
          >
            <span className="cliente-header-cart-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
                <path d="M2 3L2.26491 3.0883C3.58495 3.52832 4.24497 3.74832 4.62248 4.2721C5 4.79587 5 5.49159 5 6.88304V9.5C5 12.3284 5 13.7426 5.87868 14.6213C6.75736 15.5 8.17157 15.5 11 15.5H19" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z" stroke="#fff" strokeWidth="1.5" />
                <path d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z" stroke="#fff" strokeWidth="1.5" />
                <path d="M5 6H16.4504C18.5054 6 19.5328 6 19.9775 6.67426C20.4221 7.34853 20.0173 8.29294 19.2078 10.1818L18.7792 11.1818C18.4013 12.0636 18.2123 12.5045 17.8366 12.7523C17.4609 13 16.9812 13 16.0218 13H5" stroke="#fff" strokeWidth="1.5" />
              </svg>
            </span>
            {carrito.length > 0 && (
              <span className="cliente-header-cart-badge">
                {carrito.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Navegación de vistas (mobile) */}
      <nav className="cliente-header-nav-container">
        <button
          className={`cliente-header-nav-link ${vistaActiva === 'productos' ? 'active' : ''}`}
          onClick={() => setVistaActiva('productos')}
        >
          Productos
        </button>
        <button
          className={`cliente-header-nav-link ${vistaActiva === 'promociones' ? 'active' : ''}`}
          onClick={() => setVistaActiva('promociones')}
        >
          Promociones
        </button>
      </nav>



      {/* Contenido Principal */}
      {vistaActiva === 'productos' ? (
        <>
          {loading ? (
            <div className="cliente-loading">
              <div className="cliente-loading-content">
                <div className="cliente-loading-spinner" />
                <p className="cliente-loading-text">
                  Cargando productos...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Contenido principal */}
              <div className="cliente-main-content">
                {/* Barra de herramientas */}
                <div className="cliente-toolbar">
                  <p className="cliente-toolbar-results">
                    {productosFiltrados.length === 0
                      ? 'Sin resultados'
                      : `${productosFiltrados.length} producto${productosFiltrados.length !== 1 ? 's' : ''}`
                    }
                  </p>
                </div>

                {/* Grid de productos */}
                <div className="cliente-products-grid">
                  {productosPaginados.map(producto => (
                    <div key={producto.id_producto} className="cliente-product-card">
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
                        {(() => {
                          const itemEnCarrito = obtenerItemEnCarrito(producto.id_producto);

                          if (itemEnCarrito) {
                            // Mostrar controles + y -
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                              <>
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
                              </>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  ))}

                  {productosFiltrados.length === 0 && (
                    <div className="cliente-empty-state">
                      <div className="cliente-empty-state-icon">🔍</div>
                      <p className="cliente-empty-state-text">
                        No se encontraron productos
                      </p>
                    </div>
                  )}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="cliente-pagination">
                    <button
                      className="cliente-pagination-btn"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >‹</button>
                    {getPageNumbers().map((page, i) =>
                      page === 'ellipsis' ? (
                        <span key={`e-${i}`} className="cliente-pagination-ellipsis">…</span>
                      ) : (
                        <button
                          key={page}
                          className={`cliente-pagination-btn ${currentPage === page ? 'active' : ''}`}
                          onClick={() => setCurrentPage(page as number)}
                        >{page}</button>
                      )
                    )}
                    <button
                      className="cliente-pagination-btn"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >›</button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <ClientePromociones
          busqueda={busqueda}
          agregarPromocionAlCarrito={agregarPromocionAlCarrito}
        />
      )}

      {/* Modal cantidad en gramos - modernizado */}
      {modalCantidad.isOpen && modalCantidad.producto && (
        <div onClick={cerrarModalCantidad} className="cliente-modal-overlay">
          <div onClick={(e) => e.stopPropagation()} className="cliente-modal-content">
            <h2 className="cliente-modal-title">
              {modalCantidad.producto.nombre}
            </h2>

            <p className="cliente-modal-subtitle">
              Precio: {formatPrice(modalCantidad.producto.precioventa * 100)} x 100gr
            </p>

            <div className="cliente-modal-form-group">
              <label className="cliente-modal-label">
                Cantidad en gramos:
              </label>
              <input
                type="number"
                value={cantidadGramos}
                onChange={(e) => setCantidadGramos(e.target.value)}
                placeholder="Ej: 250"
                min="1"
                className="cliente-modal-input"
                autoFocus
              />
            </div>

            {cantidadGramos && !isNaN(parseFloat(cantidadGramos)) && (
              <div className="cliente-modal-total-box">
                <span className="cliente-modal-total-label">
                  Total:
                </span>
                <span className="cliente-modal-total-value">
                  {formatPrice(parseFloat(cantidadGramos) * modalCantidad.producto.precioventa)}
                </span>
              </div>
            )}

            <div className="cliente-modal-actions">
              <button onClick={cerrarModalCantidad} className="cliente-modal-btn cancel">
                Cancelar
              </button>
              <button onClick={confirmarCantidadGramos} className="cliente-modal-btn confirm">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel hamburguesa de categorías */}
      {categoriasPanelOpen && (
        <>
          <div className="cliente-categorias-overlay" onClick={() => setCategoriasPanelOpen(false)} />
          <div className="cliente-categorias-drawer">
            <div className="cliente-categorias-drawer-header">
              <h2 className="cliente-categorias-drawer-title">Categorías</h2>
              <button
                className="cliente-categorias-drawer-close"
                onClick={() => setCategoriasPanelOpen(false)}
              >✕</button>
            </div>

            <div className="cliente-categorias-drawer-body">
              {categoriasRaiz.length === 0 && (
                <p style={{ color: '#6b7280', padding: '8px' }}>Sin categorías disponibles</p>
              )}
              {categoriasRaiz.map(padre => {
                const hijos = getHijosDeCategoria(padre.id_categoria);
                const estaExpanded = expandedParentIds.includes(padre.id_categoria);
                const tieneHijos = hijos.length > 0;
                return (
                  <div key={padre.id_categoria} className="cliente-categorias-item">
                    <button
                      className={`cliente-categorias-padre-btn ${!tieneHijos && categoriasSeleccionadas.includes(padre.id_categoria) ? 'selected' : ''}`}
                      onClick={() =>
                        tieneHijos
                          ? toggleExpandedParent(padre.id_categoria)
                          : toggleCategoria(padre.id_categoria)
                      }
                    >
                      <span className="cliente-categorias-padre-nombre">{padre.nombre}</span>
                      {tieneHijos ? (
                        <svg
                          className={`cliente-categorias-chevron ${estaExpanded ? 'expanded' : ''}`}
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {categoriasSeleccionadas.includes(padre.id_categoria)
                            ? <polyline points="20 6 9 17 4 12" />
                            : <rect x="3" y="3" width="18" height="18" rx="3" />
                          }
                        </svg>
                      )}
                    </button>
                    {tieneHijos && estaExpanded && (
                      <div className="cliente-categorias-hijos">
                        {hijos.map(hijo => (
                          <label key={hijo.id_categoria} className="cliente-categorias-hijo-item">
                            <input
                              type="checkbox"
                              checked={categoriasSeleccionadas.includes(hijo.id_categoria)}
                              onChange={() => toggleCategoria(hijo.id_categoria)}
                              className="cliente-filter-checkbox"
                            />
                            <span className="cliente-filter-label">{hijo.nombre}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="cliente-categorias-drawer-footer">
              <button className="cliente-filtros-modal-btn secondary" onClick={resetFilters}>
                Limpiar
              </button>
              <button className="cliente-filtros-modal-btn primary" onClick={() => setCategoriasPanelOpen(false)}>
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Panel lateral del carrito - modernizado */}
      {mostrarCarrito && (
        <>
          {/* Overlay */}
          <div onClick={cerrarCarrito} className="cliente-cart-overlay" />

          {/* Panel del carrito */}
          <div className="cliente-cart-panel">
            {/* Header del carrito */}
            <div className="cliente-cart-header">
              <div className="cliente-cart-header-info">
                <h2>Mi Carrito</h2>
                <p>
                  {carrito.length} {carrito.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <button onClick={cerrarCarrito} className="cliente-cart-close-btn">
                <span>x</span>
              </button>
            </div>

            {/* Items del carrito */}
            <div className="cliente-cart-items">
              {carrito.length === 0 ? (
                <div className="cliente-cart-empty">
                  <div className="cliente-cart-empty-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="70px" height="70px" viewBox="0 0 24 24" fill="none">
                      <path d="M2 3L2.26491 3.0883C3.58495 3.52832 4.24497 3.74832 4.62248 4.2721C5 4.79587 5 5.49159 5 6.88304V9.5C5 12.3284 5 13.7426 5.87868 14.6213C6.75736 15.5 8.17157 15.5 11 15.5H19" stroke="#222223" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z" stroke="#222223" strokeWidth="1.5" />
                      <path d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z" stroke="#222223" strokeWidth="1.5" />
                      <path d="M5 6H16.4504C18.5054 6 19.5328 6 19.9775 6.67426C20.4221 7.34853 20.0173 8.29294 19.2078 10.1818L18.7792 11.1818C18.4013 12.0636 18.2123 12.5045 17.8366 12.7523C17.4609 13 16.9812 13 16.0218 13H5" stroke="#222223" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <p className="cliente-cart-empty-text">
                    Tu carrito está vacío
                  </p>
                </div>
              ) : (
                <div className="cliente-cart-items-list">
                  {carrito.map(item => (
                    <div key={item.id} className="cliente-cart-item">
                      <div className="cliente-cart-item-header">
                        <h3 className="cliente-cart-item-title">
                          {item.nombre}
                        </h3>
                        <button onClick={() => eliminarDelCarrito(item.id)} className="cliente-cart-item-delete">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                          </svg>
                        </button>
                      </div>

                      <div className="cliente-cart-item-footer">
                        {/* Controles de cantidad */}
                        <div className="cliente-cart-item-controls">
                          <button
                            onClick={() => actualizarCantidad(item.id, item.cantidad - (item.unidadMedidaId === 1 ? 10 : 1))}
                            className="cliente-cart-item-btn"
                          >
                            −
                          </button>

                          <span className="cliente-cart-item-quantity">
                            {item.unidadMedidaId === 1
                              ? `${Math.round(item.cantidad)}gr`
                              : item.tipo === 'promocion'
                                ? `${item.cantidad} un`
                                : `${item.cantidad} un`
                            }
                          </span>

                          <button
                            onClick={() => actualizarCantidad(item.id, item.cantidad + (item.unidadMedidaId === 1 ? 10 : 1))}
                            className="cliente-cart-item-btn"
                          >
                            +
                          </button>
                        </div>

                        {/* Precio */}
                        <div className="cliente-cart-item-price">
                          {formatPrice(item.precio * item.cantidad)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Footer del carrito */}
              {carrito.length > 0 && (
                <div className="cliente-cart-footer">
                  <div className="cliente-cart-total">
                    <span className="cliente-cart-total-label">
                      Total:
                    </span>
                    <span className="cliente-cart-total-value">
                      {formatPrice(calcularTotal)}
                    </span>
                  </div>

                  <div className="cliente-cart-actions">
                    <button onClick={vaciarCarrito} className="cliente-cart-clear-btn">
                      Vaciar carrito
                    </button>

                    <button
                      onClick={enviarPedidoWhatsApp}
                      className="cliente-cart-checkout-btn"
                    >
                      Hacer pedido por WhatsApp
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M17.6 6.31999C16.8669 5.58141 15.9943 4.99596 15.033 4.59767C14.0716 4.19938 13.0406 3.99622 12 3.99999C10.6089 4.00135 9.24248 4.36819 8.03771 5.06377C6.83294 5.75935 5.83208 6.75926 5.13534 7.96335C4.4386 9.16745 4.07046 10.5335 4.06776 11.9246C4.06507 13.3158 4.42793 14.6832 5.12 15.89L4 20L8.2 18.9C9.35975 19.5452 10.6629 19.8891 11.99 19.9C14.0997 19.9001 16.124 19.0668 17.6222 17.5816C19.1205 16.0965 19.9715 14.0796 19.99 11.97C19.983 10.9173 19.7682 9.87634 19.3581 8.9068C18.948 7.93725 18.3505 7.05819 17.6 6.31999ZM12 18.53C10.8177 18.5308 9.65701 18.213 8.64 17.61L8.4 17.46L5.91 18.12L6.57 15.69L6.41 15.44C5.55925 14.0667 5.24174 12.429 5.51762 10.8372C5.7935 9.24545 6.64361 7.81015 7.9069 6.80322C9.1702 5.79628 10.7589 5.28765 12.3721 5.37368C13.9853 5.4597 15.511 6.13441 16.66 7.26999C17.916 8.49818 18.635 10.1735 18.66 11.93C18.6442 13.6859 17.9355 15.3645 16.6882 16.6006C15.441 17.8366 13.756 18.5301 12 18.53ZM15.61 13.59C15.41 13.49 14.44 13.01 14.26 12.95C14.08 12.89 13.94 12.85 13.81 13.05C13.6144 13.3181 13.404 13.5751 13.18 13.82C13.07 13.96 12.95 13.97 12.75 13.82C11.6097 13.3694 10.6597 12.5394 10.06 11.47C9.85 11.12 10.26 11.14 10.64 10.39C10.6681 10.3359 10.6827 10.2759 10.6827 10.215C10.6827 10.1541 10.6681 10.0941 10.64 10.04C10.64 9.93999 10.19 8.95999 10.03 8.56999C9.87 8.17999 9.71 8.23999 9.58 8.22999H9.19C9.08895 8.23154 8.9894 8.25465 8.898 8.29776C8.8066 8.34087 8.72546 8.403 8.66 8.47999C8.43562 8.69817 8.26061 8.96191 8.14676 9.25343C8.03291 9.54495 7.98287 9.85749 8 10.17C8.0627 10.9181 8.34443 11.6311 8.81 12.22C9.6622 13.4958 10.8301 14.5293 12.2 15.22C12.9185 15.6394 13.7535 15.8148 14.58 15.72C14.8552 15.6654 15.1159 15.5535 15.345 15.3915C15.5742 15.2296 15.7667 15.0212 15.91 14.78C16.0428 14.4856 16.0846 14.1583 16.03 13.84C15.94 13.74 15.81 13.69 15.61 13.59Z" fill="#fff" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Modal de datos de cliente */}
      <DatosClienteModal
        isOpen={modalDatosCliente}
        onClose={cerrarModalDatosCliente}
        onConfirm={confirmarPedidoCliente}
      />
    </div>
  );
};