import React from 'react';
import { formatPrice, calculateCartTotal, formatCantidadConUnidad, getIncremento } from '../../../shared/utils';
import '../styles/carritopanel.css';

export interface ItemCarrito {
  id: string; // Identificador único: "producto-{id}" o "promocion-{id}"
  tipo: 'producto' | 'promocion';
  id_referencia: number; // id_producto o id_promocion
  nombre: string;
  precio: number;
  cantidad: number;
  imagen?: string;
  unidadMedidaId?: number;
  unidadMedidaNombre?: string;
}

interface CarritoPanelProps {
  carrito: ItemCarrito[];
  mostrarCarrito: boolean;
  onClose: () => void;
  onEliminar: (id: string) => void;
  onActualizarCantidad: (id: string, nuevaCantidad: number) => void;
  onVaciar: () => void;
  onEnviarWhatsApp: () => void;
}

export const CarritoPanel = React.memo<CarritoPanelProps>(({
  carrito,
  mostrarCarrito,
  onClose,
  onEliminar,
  onActualizarCantidad,
  onEnviarWhatsApp,
}) => {
  const total = calculateCartTotal(carrito);

  if (!mostrarCarrito) return null;

  return (
    <>
      <div className="cp-overlay" onClick={onClose} />
      <aside className="cp-drawer">
        {/* Header */}
        <div className="cp-header">
          <div className="cp-header-title-block">
            <h1 className="cp-title">Mi Carrito</h1>
            <div className="cp-subtitle">
              {carrito.length} {carrito.length === 1 ? 'producto' : 'productos'}
            </div>
          </div>
          <button className="cp-close-btn" onClick={onClose} aria-label="Cerrar carrito">
            x
          </button>
        </div>

        {/* Scrollable content */}
        <div className="cp-content">
          {/* Items */}
          <div className="cp-items">
            {carrito.length === 0 ? (
              <div className="cp-empty">
                <div className="cp-empty-icon">🛒</div>
                <p className="cp-empty-text">Tu carrito está vacío</p>
              </div>
            ) : (
              carrito.map(item => {
                const incremento = getIncremento(item.unidadMedidaId);
                return (
                  <div key={item.id} className="cp-item">
                    {item.imagen ? (
                      <img className="cp-item-image" src={item.imagen} alt={item.nombre} />
                    ) : (
                      <div className="cp-item-image cp-item-image-placeholder">
                        {item.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="cp-item-info">
                      <div className="cp-item-top">
                        <div className="cp-item-name-block">
                          <h2 className="cp-item-name">{item.nombre}</h2>
                          {item.tipo === 'promocion' && (
                            <span className="cp-item-badge">Promoción</span>
                          )}
                          {item.unidadMedidaNombre && item.tipo !== 'promocion' && (
                            <div className="cp-item-meta">{item.unidadMedidaNombre}</div>
                          )}
                        </div>
                        <button className="cp-remove-btn" onClick={() => onEliminar(item.id)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                          Eliminar
                        </button>

                      </div>

                      <div className="cp-item-actions">
                        <div className="cp-qty-control">
                          <button
                            className="cp-qty-btn"
                            onClick={() => onActualizarCantidad(item.id, item.cantidad - incremento)}
                            aria-label="Disminuir cantidad"
                          >
                            -
                          </button>
                          <div className="cp-qty-value">
                            {formatCantidadConUnidad(item.cantidad, item.unidadMedidaId, item.unidadMedidaNombre, item.tipo)}
                          </div>
                          <button
                            className="cp-qty-btn"
                            onClick={() => onActualizarCantidad(item.id, item.cantidad + incremento)}
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                        <div className="cp-item-price">
                          {formatPrice(item.precio * item.cantidad)}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {carrito.length > 0 && (
            <div className="cp-footer">
              <div className="cp-summary-card">
                <div className="cp-summary-row">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="cp-summary-row">
                  <span>Envío</span>
                  <span>A calcular</span>
                </div>
                <div className="cp-summary-row cp-summary-total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="cp-shipping-note">
                Finalizá tu compra para ver medios de pago y costo de envío.
              </div>

              <button className="cp-checkout-btn" onClick={onEnviarWhatsApp}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.6 6.32A7.85 7.85 0 0012 4a7.94 7.94 0 00-6.88 11.89L4 20l4.2-1.1a7.93 7.93 0 003.79.97 7.95 7.95 0 007.99-7.93 7.87 7.87 0 00-2.38-5.62zM12 18.53a6.58 6.58 0 01-3.36-.92l-.24-.14-2.49.66.66-2.43-.16-.25a6.6 6.6 0 0110.09-8.47 6.53 6.53 0 012 4.66 6.6 6.6 0 01-6.5 6.89z" />
                </svg>
                Hacer pedido por WhatsApp
              </button>

              <button className="cp-continue-link" onClick={onClose}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Seguir comprando
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
});
