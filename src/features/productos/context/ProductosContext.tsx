import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { Producto, ProductoImagen } from '../../../core/types';
import {
  getProductosPage,
  getProductosActivos,
  createProducto,
  updateProducto,
  updateProductoEstado,
  updateStockProducto,
} from '../services/productoService';
import { uploadProductImage } from '../../../shared/services/storageService';
import { 
  reemplazarImagenesProducto 
} from '../services/productoImagenService';
import { asignarCategoriasAProducto, getCategoriasDeProducto } from '../../categorias/services/categoriaService';
import { useModal } from '../../../shared/hooks/useModal';

/** ======================
 * TIPOS E INTERFACES
 * ====================== */

interface ProductoFormData {
  nombre: string;
  descripcion: string;
  stock: number;
  costo: number;
  precioventa: number;
  unidadMedida: number;
  estado: boolean;
  vencimiento?: Date | null;
  promocionActiva?: boolean;
  precioPromocion?: number | null;
}

interface ProductosContextValue {
  // Estado
  productos: Producto[];
  productosActivos: Producto[];
  productosPageNum: number;
  productosTotal: number;
  productosSearchQuery: string;
  PAGE_SIZE: number;
  productToEdit: Producto | null;
  categoriasDeProducto: number[];

  // Modales
  modalNuevoProducto: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };
  modalActualizarStock: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
  };

  // Operaciones de carga
  loadProductosPage: (page?: number, q?: string) => Promise<void>;
  recargarProductosActuales: () => Promise<void>;

  // Operaciones CRUD
  handleNuevoProducto: (
    producto: ProductoFormData,
    imagenes?: ProductoImagen[],
    categoriasIds?: number[]
  ) => Promise<void>;
  handleBuscarProductos: (texto: string) => Promise<void>;
  handleEditarProducto: (
    producto: ProductoFormData,
    imagenes?: ProductoImagen[],
    categoriasIds?: number[]
  ) => Promise<void>;
  openEditarProducto: (producto: Producto) => Promise<void>;
  handleToggleProductoEstado: (
    id_producto: number,
    currentEstado: boolean,
    nombre?: string
  ) => Promise<void>;
  handleActualizarStock: (productoId: number, cantidad: number) => Promise<void>;

  // Estados de loading (React Query mutations)
  isCreatingProducto: boolean;
  isEditingProducto: boolean;
  isUpdatingStock: boolean;

  // Setters internos (si otros componentes necesitan actualizar estado)
  setProductToEdit: (producto: Producto | null) => void;
  setCategoriasDeProducto: (categorias: number[]) => void;
}

const ProductosContext = createContext<ProductosContextValue | undefined>(undefined);

/** ======================
 * PROVIDER
 * ====================== */

interface ProductosProviderProps {
  children: ReactNode;
  showSuccess: (msg: string) => void;
  showError: (msg: string) => void;
  showWarning: (msg: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    variant?: 'danger' | 'warning' | 'info'
  ) => void;
}

export const ProductosProvider: React.FC<ProductosProviderProps> = ({
  children,
  showSuccess,
  showError,
  showWarning,
  showConfirm,
}) => {
  // ============= ESTADO =============
  const PAGE_SIZE = 8;
  const queryClient = useQueryClient();
  const [productosPageNum, setProductosPageNum] = useState(1);
  const [productosSearchQuery, setProductosSearchQuery] = useState('');
  const [productToEdit, setProductToEdit] = useState<Producto | null>(null);
  const [categoriasDeProducto, setCategoriasDeProducto] = useState<number[]>([]);

  // Modales
  const modalNuevoProducto = useModal(false);
  const modalActualizarStock = useModal(false);

  // ============= QUERIES =============

  /**
   * Query para productos paginados
   */
  const productosQuery = useQuery({
    queryKey: [...queryKeys.productos, 'page', productosPageNum, productosSearchQuery],
    queryFn: async () => {
      const result = await getProductosPage(productosPageNum, PAGE_SIZE, productosSearchQuery);
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  /**
   * Query para productos activos (usado en modales)
   */
  const productosActivosQuery = useQuery({
    queryKey: queryKeys.productosActivos,
    queryFn: () => getProductosActivos(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // ============= MUTATIONS =============

  /**
   * Mutation para crear producto
   */
  const crearProductoMutation = useMutation({
    mutationFn: async ({
      producto,
      imagenes,
      categoriasIds,
    }: {
      producto: ProductoFormData;
      imagenes?: ProductoImagen[];
      categoriasIds?: number[];
    }) => {
      const createdProduct = await createProducto({
        nombre: producto.nombre,
        descripcion: producto.descripcion || null,
        stock: producto.stock,
        costo: producto.costo,
        precioventa: producto.precioventa,
        precio_promocion: producto.precioPromocion || null,
        promocion_activa: producto.promocionActiva || false,
        id_unidad_medida: producto.unidadMedida,
        estado: producto.estado,
        vencimiento: producto.vencimiento || undefined,
      });

      // Si hay imágenes, procesarlas
      if (imagenes && imagenes.length > 0 && createdProduct) {
        try {
          // Subir las imágenes que son base64 (nuevas)
          const imagenesParaGuardar = await Promise.all(
            imagenes.map(async (img, index) => {
              // Si la imagen es base64, subirla
              if (img.imagen_path.startsWith('data:')) {
                // Convertir base64 a file
                const res = await fetch(img.imagen_path);
                const blob = await res.blob();
                const file = new File([blob], `image-${index}.jpg`, { type: 'image/jpeg' });
                const path = await uploadProductImage(file, createdProduct.id_producto);
                return { imagen_path: path, es_principal: img.es_principal };
              }
              return { imagen_path: img.imagen_path, es_principal: img.es_principal };
            })
          );
          
          // Guardar las imágenes en la tabla producto_imagen
          await reemplazarImagenesProducto(createdProduct.id_producto, imagenesParaGuardar);
        } catch (imgErr) {
          showWarning('Producto creado pero no se pudieron subir todas las imágenes');
        }
      }

      // Asignar categorías si hay
      if (createdProduct && categoriasIds && categoriasIds.length > 0) {
        try {
          await asignarCategoriasAProducto(createdProduct.id_producto, categoriasIds);
        } catch (catErr) {
          showWarning('Producto creado pero no se pudieron asignar las categorías');
        }
      }

      return createdProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      queryClient.invalidateQueries({ queryKey: queryKeys.productosActivos });
      modalNuevoProducto.close();
      setProductToEdit(null);
      setCategoriasDeProducto([]);
      showSuccess('Producto agregado exitosamente');
    },
    onError: () => {
      showError('Error al agregar el producto');
    },
  });

  /**
   * Mutation para editar producto
   */
  const editarProductoMutation = useMutation({
    mutationFn: async ({
      producto,
      imagenes,
      categoriasIds,
    }: {
      producto: ProductoFormData;
      imagenes?: ProductoImagen[];
      categoriasIds?: number[];
    }) => {
      if (!productToEdit) throw new Error('No hay producto para editar');

      // Actualizar datos del producto
      const updated = await updateProducto(productToEdit.id_producto, {
        nombre: producto.nombre,
        descripcion: producto.descripcion || null,
        stock: producto.stock,
        costo: producto.costo,
        precioventa: producto.precioventa,
        precio_promocion: producto.precioPromocion || null,
        promocion_activa: producto.promocionActiva || false,
        id_unidad_medida: producto.unidadMedida,
        estado: producto.estado,
        vencimiento: producto.vencimiento || undefined,
      });

      if (!updated) {
        throw new Error('No se pudo actualizar el producto');
      }

      // Procesar imágenes si hay cambios
      if (imagenes !== undefined) {
        try {
          // Subir las imágenes que son base64 (nuevas)
          const imagenesParaGuardar = await Promise.all(
            imagenes.map(async (img, index) => {
              // Si la imagen es base64, subirla
              if (img.imagen_path.startsWith('data:')) {
                const res = await fetch(img.imagen_path);
                const blob = await res.blob();
                const file = new File([blob], `image-${index}.jpg`, { type: 'image/jpeg' });
                const path = await uploadProductImage(file, productToEdit.id_producto);
                return { imagen_path: path, es_principal: img.es_principal };
              }
              return { imagen_path: img.imagen_path, es_principal: img.es_principal };
            })
          );
          
          // Reemplazar todas las imágenes
          await reemplazarImagenesProducto(productToEdit.id_producto, imagenesParaGuardar);
        } catch (imgErr) {
          showWarning('Producto actualizado pero no se pudieron procesar todas las imágenes');
        }
      }

      // Actualizar categorías
      if (categoriasIds !== undefined) {
        try {
          await asignarCategoriasAProducto(productToEdit.id_producto, categoriasIds);
        } catch (catErr) {
          showWarning('Producto actualizado pero no se pudieron actualizar las categorías');
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      queryClient.invalidateQueries({ queryKey: queryKeys.productosActivos });
      modalNuevoProducto.close();
      setProductToEdit(null);
      setCategoriasDeProducto([]);
      showSuccess('Producto actualizado exitosamente');
    },
    onError: () => {
      showError('Error al actualizar el producto');
    },
  });

  /**
   * Mutation para actualizar stock
   */
  const actualizarStockMutation = useMutation({
    mutationFn: async ({ productoId, cantidad }: { productoId: number; cantidad: number }) => {
      // Buscar en productosActivos (todos los productos activos)
      const producto = productosActivosQuery.data?.find((p) => p.id_producto === productoId);
      if (!producto) throw new Error('Producto no encontrado');

      const nuevoStock = producto.stock + cantidad;
      const updated = await updateStockProducto(productoId, nuevoStock);

      return { updated, producto, nuevoStock };
    },
    onSuccess: ({ producto, nuevoStock }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      queryClient.invalidateQueries({ queryKey: queryKeys.productosActivos });
      modalActualizarStock.close();
      showSuccess(
        `Stock actualizado: ${producto.nombre} ahora tiene ${nuevoStock} unidades`
      );
    },
    onError: () => {
      showError('Error al actualizar el stock');
    },
  });

  /**
   * Mutation para toggle estado de producto
   */
  const toggleEstadoMutation = useMutation({
    mutationFn: async ({ id_producto, newEstado }: { id_producto: number; newEstado: boolean }) => {
      return await updateProductoEstado(id_producto, newEstado);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      queryClient.invalidateQueries({ queryKey: queryKeys.productosActivos });
      if (updated) {
        showSuccess(`Producto ${updated.nombre} actualizado correctamente`);
      }
    },
    onError: (err: any) => {
      const message =
        err?.message || err?.error || (typeof err === 'string' ? err : JSON.stringify(err));
      showError(message || 'No se pudo actualizar el estado del producto');
    },
  });

  // ============= OPERACIONES DE CARGA =============

  /**
   * Carga una página específica de productos con búsqueda opcional
   */
  const loadProductosPage = useCallback(
    async (page = 1, q = '') => {
      setProductosPageNum(page);
      setProductosSearchQuery(q);
      // React Query se encargará de recargar automáticamente
    },
    []
  );

  /**
   * Recarga la página actual de productos manteniendo paginación y búsqueda
   */
  const recargarProductosActuales = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
    await queryClient.invalidateQueries({ queryKey: queryKeys.productosActivos });
  }, [queryClient]);

  // ============= OPERACIONES CRUD =============

  /**
   * Crea un nuevo producto con imágenes y categorías opcionales
   */
  const handleNuevoProducto = useCallback(
    async (
      producto: ProductoFormData,
      imagenes?: ProductoImagen[],
      categoriasIds?: number[]
    ) => {
      await crearProductoMutation.mutateAsync({ producto, imagenes, categoriasIds });
    },
    [crearProductoMutation]
  );

  /**
   * Busca productos por texto
   */
  const handleBuscarProductos = useCallback(
    async (texto: string) => {
      setProductosPageNum(1);
      setProductosSearchQuery(texto);
      // React Query se encarga del refetch automático
    },
    []
  );

  /**
   * Edita un producto existente con imágenes y categorías
   */
  const handleEditarProducto = useCallback(
    async (
      producto: ProductoFormData,
      imagenes?: ProductoImagen[],
      categoriasIds?: number[]
    ) => {
      await editarProductoMutation.mutateAsync({ producto, imagenes, categoriasIds });
    },
    [editarProductoMutation]
  );

  /**
   * Abre el modal de edición con los datos del producto
   */
  const openEditarProducto = useCallback(
    async (producto: Producto) => {
      setProductToEdit(producto);
      // Cargar categorías del producto
      try {
        const categoriasData = await getCategoriasDeProducto(producto.id_producto);
        setCategoriasDeProducto(categoriasData.map((c: any) => c.id_categoria));
      } catch (err) {
        setCategoriasDeProducto([]);
      }
      modalNuevoProducto.open();
    },
    [modalNuevoProducto]
  );

  /**
   * Cierra el modal de nuevo/editar producto y limpia el estado
   */
  const closeModalNuevoProducto = useCallback(() => {
    setProductToEdit(null);
    setCategoriasDeProducto([]);
    modalNuevoProducto.close();
  }, [modalNuevoProducto]);

  /**
   * Activa/desactiva un producto con confirmación
   */
  const handleToggleProductoEstado = useCallback(
    async (id_producto: number, currentEstado: boolean, nombre?: string) => {
      showConfirm(
        currentEstado ? 'Dar de baja producto' : 'Dar de alta producto',
        `¿Seguro que quieres ${currentEstado ? 'dar de baja' : 'dar de alta'} el producto ${
          nombre ?? '#' + id_producto
        }?`,
        async () => {
          const updated = await toggleEstadoMutation.mutateAsync({
            id_producto,
            newEstado: !currentEstado,
          });
          if (!updated) {
            showError(`No se encontró el producto #${id_producto}`);
          }
        },
        'warning'
      );
    },
    [showConfirm, showError, toggleEstadoMutation]
  );

  /**
   * Actualiza el stock de un producto
   */
  const handleActualizarStock = useCallback(
    async (productoId: number, cantidad: number) => {
      await actualizarStockMutation.mutateAsync({ productoId, cantidad });
    },
    [actualizarStockMutation]
  );

  // ============= VALOR DEL CONTEXTO =============

  const value: ProductosContextValue = {
    // Estado (de React Query)
    productos: productosQuery.data?.productos || [],
    productosActivos: productosActivosQuery.data || [],
    productosPageNum,
    productosTotal: productosQuery.data?.total || 0,
    productosSearchQuery,
    PAGE_SIZE,
    productToEdit,
    categoriasDeProducto,

    // Modales (con reset de estado en el close)
    modalNuevoProducto: {
      isOpen: modalNuevoProducto.isOpen,
      open: modalNuevoProducto.open,
      close: closeModalNuevoProducto,
    },
    modalActualizarStock,

    // Operaciones de carga
    loadProductosPage,
    recargarProductosActuales,

    // Operaciones CRUD
    handleNuevoProducto,
    handleBuscarProductos,
    handleEditarProducto,
    openEditarProducto,
    handleToggleProductoEstado,
    handleActualizarStock,

    // Estados de loading (React Query)
    isCreatingProducto: crearProductoMutation.isPending,
    isEditingProducto: editarProductoMutation.isPending,
    isUpdatingStock: actualizarStockMutation.isPending,

    // Setters
    setProductToEdit,
    setCategoriasDeProducto,
  };

  return <ProductosContext.Provider value={value}>{children}</ProductosContext.Provider>;
};

/** ======================
 * HOOK
 * ====================== */

/**
 * Hook para acceder al contexto de productos
 * @example
 * const { productos, loadProductosPage, handleNuevoProducto } = useProductos();
 */
export const useProductos = (): ProductosContextValue => {
  const context = useContext(ProductosContext);
  if (!context) {
    throw new Error('useProductos debe usarse dentro de ProductosProvider');
  }
  return context;
};
