import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { getProductImageUrl } from '../../shared/services/storageService';
import { useProductos } from './context/ProductosContext';
import { Pagination } from '../../shared/components/Pagination';
import { ModalNuevoProducto } from './components/ModalNuevoProducto';
import { ModalActualizarStock } from './components/ModalActualizarStock';
import { getUnidadesMedidas } from './services/productoService';
import { useCategorias } from '../categorias/context/CategoriasContext';

export const ProductosPage: React.FC = () => {
  const {
    productos,
    productosTotal,
    productosPageNum,
    productosSearchQuery,
    PAGE_SIZE,
    loadProductosPage,
    handleBuscarProductos,
    modalNuevoProducto,
    openEditarProducto,
    handleToggleProductoEstado,
  } = useProductos();

  const { categorias } = useCategorias();
  const { data: unidadesMedida = [] } = useQuery({
    queryKey: queryKeys.unidadesMedida,
    queryFn: getUnidadesMedidas,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all');

  const debounced = useDebounce(searchTerm, 300);

  React.useEffect(() => {
    if (debounced !== productosSearchQuery) {
      handleBuscarProductos(debounced);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const totalProductos = productosTotal ?? productos.length;
  const stockBajo = productos.filter(p => p.stock < 10).length;

  const displayedProducts = React.useMemo(() => {
    return productos.filter(p => {
      if (statusFilter === 'active' && !p.estado) return false;
      if (statusFilter === 'inactive' && p.estado) return false;
      return true;
    });
  }, [productos, statusFilter]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">Administra tu catálogo de productos</p>
        </div>
        <button className="btn-primary" onClick={() => modalNuevoProducto.open()}>
          + Nuevo Producto
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card-minimal">
          <div className="stat-label">Total Productos</div>
          <div className="stat-value">{totalProductos}</div>
        </div>
        <div className="stat-card-minimal">
          <div className="stat-label">Stock Bajo</div>
          <div className="stat-value stat-warning">{stockBajo}</div>
        </div>
      </div>

      <div className="stats-grid" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            name="buscador"
            id="buscador"
            placeholder="Buscar productos por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '12px', width: '100%', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ padding: '10px', backgroundColor: '#f9f9f9', border: '1px solid #ddd', borderRadius: '4px', color: '#333' }}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>
      <Pagination
        currentPage={productosPageNum}
        totalItems={productosTotal}
        pageSize={PAGE_SIZE}
        onPageChange={loadProductosPage}
      />
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Imagen</th>
                <th>Nombre</th>
                <th>Precio de Costo</th>
                <th>Precio de Venta</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    No hay productos registrados
                  </td>
                </tr>
              ) : (
                displayedProducts.map(producto => {
                  // Obtener imagen principal o primera imagen disponible
                  const imagenMostrar = producto.imagenes?.find(img => img.es_principal) 
                    || producto.imagenes?.[0]
                    || (producto.imagen_path ? { imagen_path: producto.imagen_path } : null);
                  
                  return (
                  <tr key={producto.id_producto}>
                    <td>
                      {imagenMostrar ? (
                        <img
                          src={getProductImageUrl(imagenMostrar.imagen_path) || undefined}
                          alt={producto.nombre}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div style={{ width: '50px', height: '50px', backgroundColor: '#f0f0f0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#999' }}>
                          Sin imagen
                        </div>
                      )}
                    </td>
                    <td className="font-medium">{producto.nombre}</td>
                    <td className="text-muted">
                      ${producto.unidad_medida?.id_unidad_medida === 1 ? (producto.costo * 100).toFixed(2) : producto.costo.toFixed(2)}
                      {producto.unidad_medida?.id_unidad_medida === 1 ? ' x100gr' : ''}
                    </td>
                    <td className="text-muted">
                      ${producto.unidad_medida?.id_unidad_medida === 1 ? (producto.precioventa * 100).toFixed(2) : producto.precioventa.toFixed(2)}
                      {producto.unidad_medida?.id_unidad_medida === 1 ? ' x100gr' : ''}
                    </td>
                    <td className="text-muted">{producto.vencimiento ? new Date(producto.vencimiento).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${producto.estado ? 'active' : 'inactive'}`}>
                        {producto.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        className="btn-sm btn-secondary mr-2"
                        aria-label="Editar"
                        onClick={() => openEditarProducto(producto)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="icon-pencil"
                        >
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                          <path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.41l-2.34-2.34a1.003 1.003 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      {producto.estado ? (
                        <button
                          className="btn-sm btn-danger"
                          aria-label="Dar de baja"
                          onClick={() => handleToggleProductoEstado(producto.id_producto, producto.estado, producto.nombre)}
                          style={{ width: '40px', display: 'flex', justifyContent: 'center', height: '40px', border: '1px solid #ddd', padding: 10 }}
                        >
                          {/* Trash icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M10 11v6"></path>
                            <path d="M14 11v6"></path>
                          </svg>
                        </button>
                      ) : (
                        <button
                          className="btn-sm btn-primary"
                          aria-label="Dar de alta"
                          onClick={() => handleToggleProductoEstado(producto.id_producto, producto.estado, producto.nombre)}
                          style={{ width: '40px', display: 'flex', height: '40px', border: '1px solid #ddd', padding: 10 }}
                        >
                          {/* Arrow up icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 3C12.2652 3 12.5196 3.10536 12.7071 3.29289L19.7071 10.2929C20.0976 10.6834 20.0976 11.3166 19.7071 11.7071C19.3166 12.0976 18.6834 12.0976 18.2929 11.7071L13 6.41421V20C13 20.5523 12.5523 21 12 21C11.4477 21 11 20.5523 11 20V6.41421L5.70711 11.7071C5.31658 12.0976 4.68342 12.0976 4.29289 11.7071C3.90237 11.3166 3.90237 10.6834 4.29289 10.2929L11.2929 3.29289C11.4804 3.10536 11.7348 3 12 3Z" fill="#fff" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination
        currentPage={productosPageNum}
        totalItems={productosTotal}
        pageSize={PAGE_SIZE}
        onPageChange={loadProductosPage}
      />

      {/* Modales */}
      <ModalNuevoProducto 
        unidadesMedida={unidadesMedida}
        categorias={categorias}
      />
      <ModalActualizarStock />
    </div>
  );
};