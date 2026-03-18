import { supabase, handleAuthError } from '../../../core/config/supabase';
import { Producto, UnidadMedida, ProductoImagen } from '../../../core/types';

// Helper para convertir fecha sin desplazamiento de zona horaria
const parseDateLocal = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper para cargar imágenes de múltiples productos de forma eficiente
const cargarImagenesProductos = async (productos: Producto[]): Promise<Producto[]> => {
  if (productos.length === 0) return productos;
  
  const ids = productos.map(p => p.id_producto);
  
  const { data: imagenes, error } = await supabase
    .from('producto_imagen')
    .select('*')
    .in('id_producto', ids)
    .order('orden', { ascending: true });
  
  if (error) {
    console.warn('Error al cargar imágenes de productos:', error);
    // No lanzar error, solo continuar sin imágenes
    return productos;
  }
  
  // Agrupar imágenes por producto
  const imagenesPorProducto = new Map<number, ProductoImagen[]>();
  (imagenes || []).forEach((img: any) => {
    if (!imagenesPorProducto.has(img.id_producto)) {
      imagenesPorProducto.set(img.id_producto, []);
    }
    imagenesPorProducto.get(img.id_producto)!.push(img as ProductoImagen);
  });
  
  // Asignar imágenes a cada producto
  return productos.map(p => ({
    ...p,
    imagenes: imagenesPorProducto.get(p.id_producto) || [],
  }));
};


export async function getProductos() {
  const { data, error } = await supabase
    .from('producto')
    .select(`
    id_producto,
    nombre,
    descripcion,
    stock, 
    costo,
    precioventa,
    precio_promocion,
    promocion_activa,
    id_unidad_medida,
    unidad_medida (
      id_unidad_medida,
      nombre,
      abreviacion
    ),
    estado,
    vencimiento,
    imagen_path,
    destacado
  `)
  .order('nombre', { ascending: true })
  // PostgREST/Supabase may apply a default limit (often 25). Use range to
  // explicitly request more rows (0..999 = 1000 rows).
  .range(0, 999);
      
  if (error) {
    console.error('Error al obtener productos:', error);
    await handleAuthError(error);
    throw error;
  }
  if (!data) return [];

  const productos = (data as any[]).map((p) => ({
    id_producto: p.id_producto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stock: p.stock,
    costo: p.costo,
    precioventa: p.precioventa,
    precio_promocion: p.precio_promocion,
    promocion_activa: p.promocion_activa,
    id_unidad_medida: p.id_unidad_medida,
    unidad_medida: Array.isArray(p.unidad_medida)
      ? (p.unidad_medida[0] ?? null)
      : (p.unidad_medida ?? null),
    estado: p.estado,
    vencimiento: parseDateLocal(p.vencimiento),
    imagen_path: p.imagen_path,
    destacado: p.destacado,
  })) as Producto[];

  // Cargar imágenes de todos los productos
  return await cargarImagenesProductos(productos);
}
export async function getProductosActivos() {
  const { data, error } = await supabase
    .from('producto')
    .select(`
    id_producto,
    nombre,
    descripcion,
    stock,
    costo,
    precioventa,
    precio_promocion,
    promocion_activa,
    id_unidad_medida,
    unidad_medida (
      id_unidad_medida,
      nombre,
      abreviacion
    ),
    estado,
    vencimiento,
    imagen_path,
    destacado
  `).eq('estado', true)
  .order('destacado', { ascending: false })
  .range(0, 999);
      
  if (error) {
    console.error('Error al obtener productos:', error);
    await handleAuthError(error);
    throw error;
  }
  if (!data) return [];

  const productos = (data as any[]).map((p) => ({
    id_producto: p.id_producto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stock: p.stock,
    costo: p.costo,
    precioventa: p.precioventa,
    precio_promocion: p.precio_promocion,
    promocion_activa: p.promocion_activa,
    id_unidad_medida: p.id_unidad_medida,
    unidad_medida: Array.isArray(p.unidad_medida)
      ? (p.unidad_medida[0] ?? null)
      : (p.unidad_medida ?? null),
    estado: p.estado,
    vencimiento: parseDateLocal(p.vencimiento),
    imagen_path: p.imagen_path,
    destacado: p.destacado,
  })) as Producto[];

  // Cargar imágenes de todos los productos
  return await cargarImagenesProductos(productos);
}

export async function buscarProductos(q: string) {
  const qTrim = (q || '').trim();
  if (!qTrim) return getProductos();

  // Obtener IDs coincidentes con búsqueda sin tildes via RPC
  const { data: idsData, error: rpcError } = await supabase
    .rpc('buscar_productos_sin_tildes', { q: qTrim });

  if (rpcError) {
    console.error('Error en búsqueda sin tildes:', rpcError);
    await handleAuthError(rpcError);
    throw rpcError;
  }

  const ids = (idsData || []).map((r: any) => r.id_producto) as number[];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('producto')
    .select(`
    id_producto,
    nombre,
    descripcion,
    stock,
    costo,
    precioventa,
    id_unidad_medida,
    estado,
    vencimiento,
    imagen_path,
    destacado,
    unidad_medida (
      id_unidad_medida,
      nombre,
      abreviacion
    )
  `)
    .in('id_producto', ids)
  .order('nombre', { ascending: true })
  .range(0, 999);

  if (error) {
    console.error('Error al buscar productos:', error);
    await handleAuthError(error);
    throw error;
  }

  if (!data) return [];

  const productos = (data as any[]).map((p) => ({
    id_producto: p.id_producto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stock: p.stock,
    costo: p.costo,
    precioventa: p.precioventa,
    id_unidad_medida: p.id_unidad_medida,
    estado: p.estado,
    vencimiento: parseDateLocal(p.vencimiento),
    imagen_path: p.imagen_path,
    destacado: p.destacado,
    unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
  })) as Producto[];

  // Cargar imágenes de todos los productos
  return await cargarImagenesProductos(productos);
}

// Paginado: devuelve una página de productos y el total (count exacto)
export async function getProductosPage(page = 1, pageSize = 5, q = '') {
  const from = (page - 1) * pageSize;
  const to = page * pageSize - 1;

  const selectFields = `
    id_producto,
    nombre,
    descripcion,
    stock,
    costo,
    precioventa,
    precio_promocion,
    promocion_activa,
    id_unidad_medida,
    estado,
    vencimiento,
    imagen_path,
    destacado,
    unidad_medida ( id_unidad_medida, nombre, abreviacion )
  `;

  let query: any = supabase
    .from('producto')
    .select(selectFields, { count: 'exact' })
    .order('nombre', { ascending: true });

  if (q && q.trim()) {
    // Búsqueda accent-insensitive via RPC
    const { data: idsData, error: rpcError } = await supabase
      .rpc('buscar_productos_sin_tildes', { q: q.trim() });

    if (rpcError) {
      console.error('Error en búsqueda sin tildes:', rpcError);
      await handleAuthError(rpcError);
      throw rpcError;
    }

    const ids = (idsData || []).map((r: any) => r.id_producto) as number[];
    if (ids.length === 0) {
      return { productos: [], total: 0 };
    }
    query = query.in('id_producto', ids);
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error('Error al obtener página de productos:', error);
    await handleAuthError(error);
    throw error;
  }

  const productos = (data || []).map((p: any) => ({
    id_producto: p.id_producto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stock: p.stock,
    costo: p.costo, 
    precioventa: p.precioventa,
    precio_promocion: p.precio_promocion,
    promocion_activa: p.promocion_activa,
    id_unidad_medida: p.id_unidad_medida,
    estado: p.estado,
    unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
    vencimiento: parseDateLocal(p.vencimiento),
    imagen_path: p.imagen_path,
    destacado: p.destacado,
  })) as Producto[];

  // Cargar imágenes de todos los productos
  const productosConImagenes = await cargarImagenesProductos(productos);

  return { productos: productosConImagenes, total: (count ?? 0) as number };
}

export async function createProducto(producto: Omit<Producto, 'id_producto'>) {
  const { data, error } = await supabase
    .from('producto')
    .insert([producto])
    .select()
    .single();

  if (error) {
    console.error('Error al crear producto:', error);
    await handleAuthError(error);
    throw error;
  }

  return data as Producto;
}

export async function updateStockProducto(id_producto: number, nuevoStock: number) {
  // Prefer server-side transaction RPC if available
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_producto_stock_transaction', { p_id_producto: id_producto, p_nuevo_stock: nuevoStock });
    if (!rpcError && rpcData) {
      return rpcData as Producto;
    }
  } catch (e) {
    // fallthrough to client-side update
  }

  const { data, error } = await supabase
    .from('producto')
    .update({ stock: nuevoStock })
    .eq('id_producto', id_producto)
    .select()
    .single();

  if (error) {
    console.error('Error al actualizar stock:', error);
    await handleAuthError(error);
    throw error;
  }

  return data as Producto;
}



export async function updateProductoDestacado(id_producto: number, destacado: boolean) {
  // Try RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_producto_destacado', {
      p_id_producto: id_producto,
      p_destacado: destacado,
    });
    if (!rpcError && rpcData) {
      const p: any = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      return {
        id_producto: p.id_producto,
        nombre: p.nombre,
        descripcion: p.descripcion,
        stock: p.stock,
        costo: p.costo,
        precioventa: p.precioventa,
        id_unidad_medida: p.id_unidad_medida,
        estado: p.estado,
        destacado: p.destacado,
        unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
      } as Producto;
    }
  } catch (e) {
    console.error(e)
  }

  const { data, error } = await supabase
    .from('producto')
    .update({ destacado })
    .eq('id_producto', id_producto)
    .select(`id_producto,nombre,descripcion,stock,costo,precioventa,id_unidad_medida,estado,destacado,unidad_medida(id_unidad_medida,nombre,abreviacion)`)
    .maybeSingle();

  if (error) {
    console.error('Error al actualizar destacado de producto:', error);
    await handleAuthError(error);
    throw error;
  }

  if (!data) return null;

  const p: any = data;
  return {
    id_producto: p.id_producto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stock: p.stock,
    costo: p.costo,
    precioventa: p.precioventa,
    id_unidad_medida: p.id_unidad_medida,
    estado: p.estado,
    destacado: p.destacado,
    unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
  } as Producto;
}



export async function getUnidadesMedidas() {
  const { data, error } = await supabase
    .from('unidad_medida')
    .select(`
      *
    `)

  if (error) {
    console.error('❌ Error al obtener unidades de medida:', error);
    await handleAuthError(error);
    throw error;
  }

  if (!data) return [];

  return data as UnidadMedida[];
}

export async function updateProducto(
  id_producto: number,
  changes: Partial<{
    nombre: string;
    descripcion: string | null;
    stock: number;
    costo: number;
    precioventa: number;
    precio_promocion?: number | null;
    promocion_activa?: boolean;
    id_unidad_medida: number;
    estado: boolean;
    vencimiento?: Date | null;
    imagen_path?: string | null;
    destacado?: boolean;
  }>
) {
  // Try RPC transaction first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_producto_transaction', { p_id_producto: id_producto, p_changes: changes });
    if (!rpcError && rpcData) {
      const p: any = rpcData;
      return {
        id_producto: p.id_producto,
        nombre: p.nombre,
        descripcion: p.descripcion,
        stock: p.stock,
        costo: p.costo,
        precioventa: p.precioventa,
        precio_promocion: p.precio_promocion,
        promocion_activa: p.promocion_activa,
        id_unidad_medida: p.id_unidad_medida,
        estado: p.estado,
        vencimiento: parseDateLocal(p.vencimiento),
        imagen_path: p.imagen_path,
        unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
      } as Producto;
    }
  } catch (e) {
    // fallback to client-side update
  }

  const { data, error } = await supabase
    .from('producto')
    .update(changes)
    .eq('id_producto', id_producto)
    .select(
      `id_producto,nombre,descripcion,stock,costo,precioventa,precio_promocion,promocion_activa,id_unidad_medida,estado,vencimiento,imagen_path,unidad_medida(id_unidad_medida,nombre,abreviacion)`
    )
    .single();

  if (error) {
    console.error('Error al actualizar producto:', error);
    await handleAuthError(error);
    throw error;
  }

  if (!data) return null;

  const p: any = data;
  const producto = {
    id_producto: p.id_producto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stock: p.stock,
    costo: p.costo,
    precioventa: p.precioventa,
    precio_promocion: p.precio_promocion,
    promocion_activa: p.promocion_activa,
    id_unidad_medida: p.id_unidad_medida,
    estado: p.estado,
    vencimiento: parseDateLocal(p.vencimiento),
    imagen_path: p.imagen_path,
    unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
  } as Producto;

  return producto;
}

export async function updateProductoEstado(id_producto: number, activo: boolean) {
  // Try RPC transaction
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_producto_estado_transaction', { p_id_producto: id_producto, p_activo: activo });
    if (!rpcError && rpcData) {
      const p: any = rpcData;
      return {
        id_producto: p.id_producto,
        nombre: p.nombre,
        descripcion: p.descripcion,
        stock: p.stock,
        costo: p.costo,
        precioventa: p.precioventa,
        id_unidad_medida: p.id_unidad_medida,
        estado: p.estado,
        unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
      } as Producto;
    }
  } catch (e) {
    // fallback
  }

  const { data, error } = await supabase
    .from('producto')
    .update({ estado: activo })
    .eq('id_producto', id_producto)
    .select(
      `id_producto,nombre,descripcion,stock,costo,precioventa,id_unidad_medida,estado,unidad_medida(id_unidad_medida,nombre,abreviacion)`
    )
    .maybeSingle();

  if (error) {
    console.error('Error al actualizar estado de producto:', error);
    await handleAuthError(error);
    throw error;
  }

  if (!data) return null;

  const p: any = data;
  const producto = {
    id_producto: p.id_producto,
    nombre: p.nombre,
    descripcion: p.descripcion,
    stock: p.stock,
    costo: p.costo,
    precioventa: p.precioventa,
    id_unidad_medida: p.id_unidad_medida,
    estado: p.estado,
    unidad_medida: Array.isArray(p.unidad_medida) ? (p.unidad_medida[0] ?? null) : (p.unidad_medida ?? null),
  } as Producto;

  return producto;
}
