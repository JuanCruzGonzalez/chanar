import React, { useState, useRef, useEffect } from 'react';
import { useProductos } from '../context/ProductosContext';

interface ModalActualizarStockProps { }

export const ModalActualizarStock = React.memo<ModalActualizarStockProps>(() => {
  const {
    modalActualizarStock,
    productosActivos,
    handleActualizarStock,
    isUpdatingStock,
  } = useProductos();

  const isOpen = modalActualizarStock.isOpen;
  const onClose = modalActualizarStock.close;
  const loading = isUpdatingStock;


  const [busqueda, setBusqueda] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const productosFiltrados = productosActivos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ).slice(0, 10);

  const productoSeleccionado = productosActivos.find(p => p.id_producto === parseInt(productoId));

  const handleSelectProducto = (producto: { id_producto: number; nombre: string }) => {
    setProductoId(String(producto.id_producto));
    setBusqueda(producto.nombre);
    setShowDropdown(false);
  };

  const handleSubmit = () => {
    if (!productoId || !cantidad) {
      return;
    }
    handleActualizarStock(parseInt(productoId), parseInt(cantidad));
    setProductoId('');
    setCantidad('');
    setBusqueda('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-minimal" onClick={e => e.stopPropagation()}>
        <div className="modal-minimal-header">
          <h2>Actualizar Stock</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-minimal-body">
          <div className="form-group" ref={searchRef} style={{position: 'relative'}}>
            <label>Buscar producto</label>
            <input
              type="text"
              value={busqueda}
              onChange={e => {
                setBusqueda(e.target.value);
                setShowDropdown(true);
                setProductoId('');
              }}
              placeholder="Buscar por nombre..."
              autoComplete="off"
              disabled={loading}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown && busqueda && productosFiltrados.length > 0 && (
              <div className="dropdown-list" style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #ddd', maxHeight: 200, overflowY: 'auto', width: '100%' }}>
                {productosFiltrados.map(p => (
                  <div
                    key={p.id_producto}
                    onClick={() => handleSelectProducto(p)}
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
          {productoSeleccionado && (
            <>
              <div className="form-group">
                <label>Stock actual</label>
                <input
                  type="text"
                  value={productoSeleccionado.stock}
                  readOnly
                  className="readonly"
                />
              </div>
              <div className="form-group">
                <label>Cantidad a agregar</label>
                <input
                  type="number"
                  value={cantidad}
                  onChange={e => setCantidad(e.target.value)}
                  min="1"
                  placeholder="0"
                  disabled={loading}
                />
              </div>
            </>
          )}
        </div>
        <div className="modal-minimal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !productoSeleccionado || !cantidad}>{loading ? 'Actualizando...' : 'Actualizar'}</button>
        </div>
      </div>
    </div>
  );
});
