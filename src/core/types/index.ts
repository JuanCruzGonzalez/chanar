export interface Producto {
  id_producto: number;
  nombre: string;
  descripcion: string | null;
  stock: number;
  costo: number;
  precioventa: number;
  precio_promocion?: number | null;
  promocion_activa?: boolean;
  id_unidad_medida: number;
  unidad_medida?: UnidadMedida;
  estado: boolean;
  vencimiento?: Date;
  imagen_path?: string | null; // Mantener por compatibilidad
  imagenes?: ProductoImagen[]; // Nuevo: múltiples imágenes}
  destacado: boolean;
}

export interface ProductoImagen {
  id_producto_imagen: number;
  id_producto: number;
  imagen_path: string;
  orden: number;
  es_principal: boolean;
  created_at?: string;
}

export interface UnidadMedida {
  id_unidad_medida: number;
  nombre: string;
  abreviacion: string;
}

export interface Promocion {
  id_promocion: number;
  name: string;
  precio: number | null;
  estado: boolean;
  imagen_path?: string | null;
}

export interface PromocionConDetalles extends Promocion {
  productos?: PromocionDetalleInput[];
}

export interface DetallePromocion {
  id_detalle_promocion: number;
  id_promocion: number;
  id_producto: number;
}

// Si la tabla detalle_promocion tiene cantidad, la modelamos aquí.
export interface DetallePromocionConCantidad {
  id_detalle_promocion: number;
  id_promocion: number;
  id_producto: number;
  cantidad: number;
}

// Detalle de promoción con información del producto embebida (para vista del cliente)
export interface DetallePromocionConProducto extends DetallePromocionConCantidad {
  producto: {
    id_producto: number;
    nombre: string;
    imagen_path?: string | null;
    id_unidad_medida?: number;
  };
}

// Promoción con detalles completos (incluyendo productos)
export interface PromocionConDetallesCompletos extends Promocion {
  productos: DetallePromocionConProducto[];
}

// Para crear/editar promociones necesitamos enviar id_producto + cantidad
export interface PromocionDetalleInput {
  id_producto: number;
  cantidad: number;
}

export interface Venta {
  id_venta: number;
  fecha: string;
  estado: boolean;
  baja: boolean;
}

export interface DetalleVenta {
  id_detalle_venta: number;
  id_producto: number;
  id_venta: number;
  cantidad: number;
  precio_unitario: number; // ✅ NUEVO
  producto?: Producto;
  promocion?: Promocion;
}

// Tipos para crear ventas: puede ser un item de producto o una referencia a promocion
export interface DetalleVentaProductoInput {
  id_producto: number;
  cantidad: number;
  precioUnitario?: number;
}

export interface DetalleVentaPromocionInput {
  id_promocion: number;
  cantidad: number;
  // precioUnitario should be number or undefined to match createVenta param expectations
  precioUnitario?: number | undefined;
}

export type DetalleVentaInput = DetalleVentaProductoInput | DetalleVentaPromocionInput;

export interface VentaConDetalles extends Venta {
  detalle_venta: (DetalleVenta & { producto?: Producto; promocion?: Promocion })[];
}

export interface Gasto {
  id_gasto: number;
  costo: number;
  descripcion: string | null;
  estado: boolean;
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
  estado: boolean;
  id_categoria_padre?: number | null;
}

export interface CategoriaConHijos extends Categoria {
  hijos?: CategoriaConHijos[];
}

export interface CategoriaProducto {
  id_categoria_producto: number;
  id_categoria: number;
  id_producto: number;
}

// =============================================
// PEDIDOS
// =============================================

export type EstadoPedido = 'RECIBIDO' | 'ACEPTADO' | 'ENTREGADO' | 'CANCELADO';
export type MetodoPagoPedido = 'efectivo' | 'transferencia' | 'mercadopago';

export interface Pedido {
  id_pedido: number;
  fecha_pedido: string;
  estado: EstadoPedido;
  id_venta: number | null;
  
  // Datos del cliente
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string | null;
  
  // Detalles del pedido
  total: number;
  metodo_pago: MetodoPagoPedido | null;
  notas: string | null;
  
  // Auditoría
  created_at: string;
  updated_at: string;
}

export interface PedidoDetalle {
  id_pedido_detalle: number;
  id_pedido: number;
  tipo: 'producto' | 'promocion';
  id_producto: number | null;
  id_promocion: number | null;
  cantidad: number;
  precio_unitario: number;
}

export interface PedidoDetalleConInfo extends PedidoDetalle {
  producto?: Producto;
  promocion?: Promocion;
}

export interface PedidoConDetalles extends Pedido {
  detalles: PedidoDetalleConInfo[];
}

// Para crear pedido desde el cliente
export interface CrearPedidoInput {
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_direccion: string | null;
  metodo_pago: MetodoPagoPedido | null;
  notas: string | null;
  items: {
    tipo: 'producto' | 'promocion';
    id: number;
    cantidad: number;
    precio_unitario: number;
  }[];
}
