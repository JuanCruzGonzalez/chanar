import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './core/styles/app.css';
import './core/styles/toast.css';
import { VentaConDetalles, UnidadMedida, Promocion, DetalleVentaInput, PromocionConDetalles, Gasto, Categoria } from './core/types';
import { getTodayISO } from './shared/utils';
import {
  createVenta,
  reactivarVenta,
  updateVentaBaja,
  getVentasPage,
} from './features/ventas/services/ventaService';
import {
  getProductosActivos,
  getUnidadesMedidas,
} from './features/productos/services/productoService';
import { getPromocionesActivas, getPromociones,updatePromocion, deletePromocion, getDetallePromocion } from './features/promociones/services/promocionService';
import { getGastos, createGasto, updateGasto, updateGastoEstado } from './features/gastos/services/gastoService';
import { getCategorias, createCategoria, updateCategoria, updateCategoriaEstado } from './features/categorias/services/categoriaService';
import ModalVerPromocion from './features/promociones/components/ModalVerPromocion';
import { Sidebar } from './shared/components/Sidebar';
import { VentasPage } from './features/ventas/VentasPage';
import { ProductosPage } from './features/productos/ProductosPage';
import { ProductosProvider } from './features/productos/context/ProductosContext';
import { StockPage } from './features/stock/StockPage';
import { PromocionesPage } from './features/promociones/PromocionesPage';
import { GastosPage } from './features/gastos/GastosPage';
import { CategoriasPage } from './features/categorias/CategoriasPage';
import { ModalNuevaVenta } from './features/ventas/components/ModalNuevaVenta';
import { ModalNuevoProducto } from './features/productos/components/ModalNuevoProducto';
import { ModalActualizarStock } from './features/productos/components/ModalActualizarStock';
import { ModalCrearPromocion } from './features/promociones/components/ModalCrearPromocion';
import { ModalGasto } from './features/gastos/components/ModalGasto';
import { ModalCategoria } from './features/categorias/components/ModalCategoria';
import { Toast, ConfirmModal } from './shared/components/ToastModal';
import { useToast, useConfirm } from './shared/hooks/useToast';
import { useDisableWheelOnNumberInputs } from './shared/hooks/useDisableWheelOnNumberInputs';
import { useModal } from './shared/hooks/useModal';
import { useAsync } from './shared/hooks/useAsync';
import { createPromocion } from './features/promociones/services/promocionService';

function App() {
  const [activeSection, setActiveSection] = useState<'ventas' | 'productos' | 'stock' | 'promociones' | 'gastos' | 'categorias'>('ventas');
  const [ventas, setVentas] = useState<VentaConDetalles[]>([]);
  const [ventasPageNum, setVentasPageNum] = useState(1);
  const [ventasTotal, setVentasTotal] = useState(0);
  const VENTAS_PAGE_SIZE = 8;
  const [productosActivos, setProductosActivos] = useState<any[]>([]); // Para modales
  const [promocionesActivas, setPromocionesActivas] = useState<Promocion[]>([]);
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [promocionToEdit, setPromocionToEdit] = useState<PromocionConDetalles | null>(null);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadMedida[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [gastoToEdit, setGastoToEdit] = useState<Gasto | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaToEdit, setCategoriaToEdit] = useState<Categoria | null>(null);
  const modalCrearPromocion = useModal(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para modales
  const modalNuevaVenta = useModal(false);
  const modalGasto = useModal(false);
  const modalCategoria = useModal(false);

  // Hooks para toast y confirmación
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();
  const { confirm, showConfirm, hideConfirm } = useConfirm();

  // Deshabilitar comportamiento de la rueda sobre inputs number (global)
  useDisableWheelOnNumberInputs();

  useEffect(() => {
    cargarDatos();
  }, []);

  const initAsync = useAsync<void>();
  const crearVentaAsync = useAsync<any>();
  const crearPromocionAsync = useAsync<any>();
  const editarPromocionAsync = useAsync<any>();
  const eliminarPromocionAsync = useAsync<any>();
  const verPromocionAsync = useAsync<any>();
  const modalVerPromocion = useModal(false);
  const [promocionVista, setPromocionVista] = useState<Promocion | null>(null);
  const [promocionVistaDetalles, setPromocionVistaDetalles] = useState<any[]>([]);

  const cargarDatos = async () => {
    try {
      // start a watchdog timer in case the initial load hangs
      let timer: any | null = null;
      timer = setTimeout(() => {
        if (initAsync.loading) {
          initAsync.reset();
          setError('La carga tardó demasiado. Intenta recargar la página.');
        }
      }, 15000);

      await initAsync.execute(async () => {
        // Load first page of ventas and other data in parallel (productos handled by ProductosContext)
        const ventasPagePromise = getVentasPage(1, VENTAS_PAGE_SIZE, { baja: false });
        const othersPromise = Promise.all([
          getProductosActivos(),
          getUnidadesMedidas(),
          getPromocionesActivas(),
          getPromociones(),
          getGastos(),
          getCategorias(),
        ]);

        const [ventasPageResult, [productosActivosData, unidadesData, promocionesActivasData, promocionesData, gastosData, categoriasData]] = await Promise.all([
          ventasPagePromise,
          othersPromise,
        ]);

        setProductosActivos(productosActivosData || []); // Para modales
        setUnidadesMedida(unidadesData || []);
        setVentas(ventasPageResult.ventas || []);
        setVentasTotal(ventasPageResult.total || 0);
        setVentasPageNum(1);
        setPromocionesActivas(promocionesActivasData || []);
        setPromociones(promocionesData || []);
        setGastos(gastosData || []);
        setCategorias(categoriasData || []);
        setError(null);
      });
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    } catch (err) {
      setError('Error al cargar los datos: ' + (err as Error).message);
    }
  };

  // Load a specific page of productos (with optional search filter q)
  const handleToggleVentaFlag = (
    id_venta: number,
    field: 'estado' | 'baja',
    currentValue: boolean,
    label?: string
  ) => {
    const title =
      field === 'estado'
        ? currentValue
          ? 'Marcar como pendiente'
          : 'Marcar como pagada'
        : currentValue
          ? 'Dar de alta venta'
          : 'Dar de baja venta';

    const actionText =
      field === 'estado'
        ? currentValue
          ? 'pendiente'
          : 'pagada'
        : currentValue
          ? 'dar de alta'
          : 'dar de baja';

    showConfirm(
      title,
      `¿Seguro que quieres ${actionText} ${label ?? '#' + id_venta}?`,
      async () => {
        try {
          let updated;
          
          if (field === 'baja' && currentValue === true) {
            updated = await reactivarVenta(id_venta);
          }

          if (field === 'baja' && !currentValue === true) {
            updated = await updateVentaBaja(id_venta, !currentValue);
          }

          if (!updated) {
            showError(`No se encontró la venta #${id_venta}`);
            return;
          }

          await cargarDatos();
          showSuccess(`Venta ${updated.id_venta} actualizada correctamente`);
        } catch (err) {
          const e: any = err;
          const message =
            e?.message ||
            e?.error ||
            (typeof e === 'string' ? e : JSON.stringify(e));
          showError(message || `No se pudo actualizar el campo ${field} de la venta`);
        }
      },
      'warning'
    );
  };


  // Handlers para crear venta
  const handleNuevaVenta = async (items: DetalleVentaInput[], pagada: boolean) => {
    try {
      const fecha = getTodayISO();
      await crearVentaAsync.execute(() => createVenta(fecha, items, pagada));
      await cargarDatos();
      modalNuevaVenta.close();
      showSuccess('Venta registrada exitosamente');
    } catch (err) {
      showError('Error al registrar la venta');
    }
  };

  const handleCrearPromocion = async (
    payload: { name: string; precio: number | null; productos: { id_producto: number; cantidad: number }[]; estado: boolean },
    imageFile?: File | null
  ) => {
    try {
      if (promocionToEdit) {
        // Edit flow
        await editarPromocionAsync.execute(() => 
          updatePromocion(
            promocionToEdit.id_promocion, 
            payload.name, 
            payload.precio, 
            payload.productos, 
            payload.estado,
            imageFile,
            promocionToEdit.imagen_path
          )
        );
        setPromocionToEdit(null);
        showSuccess('Promoción actualizada correctamente');
      } else {
        await crearPromocionAsync.execute(() => 
          createPromocion(payload.name, payload.precio, payload.productos, payload.estado, imageFile)
        );
        showSuccess('Promoción creada correctamente');
      }
      await cargarDatos();
      modalCrearPromocion.close();
    } catch (err) {
      showError('Error al crear o actualizar la promoción');
    }
  };

  const handleEditarPromocion = async (promocion: Promocion) => {
    try {
      const detalles = await getDetallePromocion(promocion.id_promocion);
      const productosConCantidad = (detalles || []).map((d: any) => ({ id_producto: d.id_producto, cantidad: d.cantidad }));
      setPromocionToEdit({ ...promocion, productos: productosConCantidad });
      modalCrearPromocion.open();
    } catch (err) {
      showError('No se pudo cargar los detalles de la promoción');
    }
  };

  const handleChangePromocion = async (id_promocion: number, estado: boolean) => {
    showConfirm(
      estado ? 'Dar de alta promoción' : 'Dar de baja promoción',
      `¿Seguro que quieres ${estado ? 'dar de alta' : 'dar de baja'} la promoción #${id_promocion}?`,
      async () => {
        try {
          await eliminarPromocionAsync.execute(() => deletePromocion(id_promocion, estado));
          await cargarDatos();
          showSuccess(`Promoción ${estado ? 'dada de alta' : 'dada de baja'} correctamente`);
        } catch (err) {
          showError('No se pudo eliminar la promoción');
        }
      },
      estado ? 'info' : 'danger'
    );
  };

  const handleVerPromocion = async (promocion: Promocion) => {
    try {
      const detalles = await verPromocionAsync.execute(() => getDetallePromocion(promocion.id_promocion));
      setPromocionVista(promocion);
      setPromocionVistaDetalles(detalles || []);
      modalVerPromocion.open();
    } catch (err) {
      showError('No se pudieron cargar los detalles de la promoción');
    }
  };

  // NOTE: use handleToggleVentaFlag for toggling 'estado' as needed

  // Buscar ventas con filtros (fechas, estado y baja)
  const handleBuscarVentas = async (opts?: { desde?: string; hasta?: string; estado?: boolean; baja?: boolean }) => {
    try {
      // Ensure default is baja=false unless explicitly requested
      const safeOpts = { ...(opts || {}), baja: typeof opts?.baja === 'boolean' ? opts!.baja : false };
      // Use paginated API for search results (reset to page 1)
      const { ventas: pageRows, total } = await getVentasPage(1, VENTAS_PAGE_SIZE, safeOpts);
      setVentas(pageRows || []);
      setVentasTotal(total || 0);
      setVentasPageNum(1);
    } catch (err) {
      const e: any = err;
      const message = e?.message || e?.error || (typeof e === 'string' ? e : JSON.stringify(e));
      showError(message || 'Error buscando ventas');
    } finally {
    }
  };

  // Load a specific page of ventas (with optional filters)
  const loadVentasPage = async (page = 1, opts?: { desde?: string; hasta?: string; estado?: boolean; baja?: boolean }) => {
    try {
      const safeOpts = { ...(opts || {}), baja: typeof opts?.baja === 'boolean' ? opts!.baja : false };
      const { ventas: pageRows, total } = await getVentasPage(page, VENTAS_PAGE_SIZE, safeOpts);
      setVentas(pageRows || []);
      setVentasTotal(total || 0);
      setVentasPageNum(page);
    } catch (err) {
      showError('Error cargando ventas');
    }
  };

  // ============= HANDLERS GASTOS =============
  const crearGastoAsync = useAsync();
  const actualizarGastoAsync = useAsync();
  const toggleGastoEstadoAsync = useAsync();

  const handleNuevoGasto = () => {
    setGastoToEdit(null);
    modalGasto.open();
  };

  const handleEditarGasto = (gasto: Gasto) => {
    setGastoToEdit(gasto);
    modalGasto.open();
  };

  const handleSubmitGasto = async (costo: number, descripcion: string | null) => {
    try {
      if (gastoToEdit) {
        // Editar gasto existente
        await actualizarGastoAsync.execute(() => updateGasto(gastoToEdit.id_gasto, { costo, descripcion }));
        showSuccess('Gasto actualizado correctamente');
      } else {
        // Crear nuevo gasto
        await crearGastoAsync.execute(() => createGasto(costo, descripcion));
        showSuccess('Gasto creado correctamente');
      }
      modalGasto.close();
      const gastosData = await getGastos();
      setGastos(gastosData || []);
    } catch (err) {
      showError(gastoToEdit ? 'Error al actualizar el gasto' : 'Error al crear el gasto');
    }
  };

  const handleToggleGastoEstado = async (id_gasto: number, estadoActual: boolean, descripcion: string | null) => {
    const mensaje = estadoActual ? 'desactivar' : 'activar';
    const label = descripcion || `Gasto #${id_gasto}`;
    
    showConfirm(
      `¿${mensaje.charAt(0).toUpperCase() + mensaje.slice(1)} gasto?`,
      `¿Estás seguro de ${mensaje} "${label}"?`,
      async () => {
        try {
          await toggleGastoEstadoAsync.execute(() => updateGastoEstado(id_gasto, !estadoActual));
          const gastosData = await getGastos();
          setGastos(gastosData || []);
          showSuccess(`Gasto ${estadoActual ? 'desactivado' : 'activado'} correctamente`);
        } catch (err) {
          showError(`Error al ${mensaje} el gasto`);
        }
      },
      estadoActual ? 'danger' : 'info'
    );
  };

  // Handlers para categorías
  const crearCategoriaAsync = useAsync();
  const actualizarCategoriaAsync = useAsync();
  const toggleCategoriaEstadoAsync = useAsync();

  const handleNuevaCategoria = () => {
    setCategoriaToEdit(null);
    modalCategoria.open();
  };

  const handleEditarCategoria = (categoria: Categoria) => {
    setCategoriaToEdit(categoria);
    modalCategoria.open();
  };

  const handleSubmitCategoria = async (nombre: string) => {
    try {
      if (categoriaToEdit) {
        // Editar categoría existente
        await actualizarCategoriaAsync.execute(() => updateCategoria(categoriaToEdit.id_categoria, { nombre }));
        showSuccess('Categoría actualizada correctamente');
      } else {
        // Crear nueva categoría
        await crearCategoriaAsync.execute(() => createCategoria(nombre));
        showSuccess('Categoría creada correctamente');
      }
      modalCategoria.close();
      const categoriasData = await getCategorias();
      setCategorias(categoriasData || []);
    } catch (err) {
      showError(categoriaToEdit ? 'Error al actualizar la categoría' : 'Error al crear la categoría');
    }
  };

  const handleToggleCategoriaEstado = async (id_categoria: number, estadoActual: boolean, nombre: string) => {
    const mensaje = estadoActual ? 'desactivar' : 'activar';
    
    showConfirm(
      `¿${mensaje.charAt(0).toUpperCase() + mensaje.slice(1)} categoría?`,
      `¿Estás seguro de ${mensaje} "${nombre}"?`,
      async () => {
        try {
          await toggleCategoriaEstadoAsync.execute(() => updateCategoriaEstado(id_categoria, !estadoActual));
          const categoriasData = await getCategorias();
          setCategorias(categoriasData || []);
          showSuccess(`Categoría ${estadoActual ? 'desactivada' : 'activada'} correctamente`);
        } catch (err) {
          showError(`Error al ${mensaje} la categoría`);
        }
      },
      estadoActual ? 'danger' : 'info'
    );
  };

  if (initAsync.loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={cargarDatos}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProductosProvider
      showSuccess={showSuccess}
      showError={showError}
      showWarning={showWarning}
      showConfirm={showConfirm}
    >
      <div className="app-container">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <main className="main-content">
          {activeSection === 'ventas' && (
            <VentasPage
              ventas={ventas}
              gastos={gastos}
              total={ventasTotal}
              page={ventasPageNum}
              pageSize={VENTAS_PAGE_SIZE}
              onPageChange={(p, opts) => loadVentasPage(p, opts)}
              onNuevaVenta={modalNuevaVenta.open}
              onToggleVentaFlag={handleToggleVentaFlag}
              onSearch={handleBuscarVentas}
            />
          )}

          {activeSection === 'productos' && <ProductosPage />}

          {activeSection === 'stock' && <StockPage />}

          {activeSection === 'promociones' && (
            <PromocionesPage
              promociones={promociones}
              onNuevoPromocion={modalCrearPromocion.open}
              onEditPromocion={handleEditarPromocion}
              onChangePromocion={handleChangePromocion}
              onViewPromocion={handleVerPromocion}
            />
          )}
          {activeSection === 'gastos' && (
            <GastosPage
              gastos={gastos}
              onNuevoGasto={handleNuevoGasto}
              onEditarGasto={handleEditarGasto}
              onToggleEstado={handleToggleGastoEstado}
            />
          )}
          {activeSection === 'categorias' && (
            <CategoriasPage
              categorias={categorias}
              onNuevaCategoria={handleNuevaCategoria}
              onEditarCategoria={handleEditarCategoria}
              onToggleEstado={handleToggleCategoriaEstado}
            />
          )}
        </main>

        {/* Modales */}
        <ModalNuevaVenta
          isOpen={modalNuevaVenta.isOpen}
          onClose={modalNuevaVenta.close}
          productos={productosActivos}
          promociones={promocionesActivas}
          onSubmit={handleNuevaVenta}
          // Pasa las funciones de toast y confirm a los modales
          showToast={showSuccess}
          showError={showError}
          showWarning={showWarning}
          showConfirm={showConfirm}
          loading={crearVentaAsync.loading}
        />

        <ModalCrearPromocion
          isOpen={modalCrearPromocion.isOpen}
          onClose={modalCrearPromocion.close}
          productos={productosActivos}
          initialPromotion={promocionToEdit ? { ...promocionToEdit, productos: promocionToEdit.productos ?? [] } : undefined}
          onSubmit={handleCrearPromocion}
          showError={showError}
          showWarning={showWarning}
          loading={crearPromocionAsync.loading}
        />

        <ModalVerPromocion
          isOpen={modalVerPromocion.isOpen}
          onClose={() => { modalVerPromocion.close(); setPromocionVista(null); setPromocionVistaDetalles([]); }}
          promocion={promocionVista}
          detalles={promocionVistaDetalles}
          productosCatalogo={productosActivos}
        />

        <ModalNuevoProducto
          categorias={categorias}
          unidadesMedida={unidadesMedida}
        />

        <ModalActualizarStock />

        <ModalGasto
          isOpen={modalGasto.isOpen}
          onClose={() => { modalGasto.close(); setGastoToEdit(null); }}
          onSubmit={handleSubmitGasto}
          initialGasto={gastoToEdit}
          loading={gastoToEdit ? actualizarGastoAsync.loading : crearGastoAsync.loading}
        />

        <ModalCategoria
          isOpen={modalCategoria.isOpen}
          onClose={() => { modalCategoria.close(); setCategoriaToEdit(null); }}
          onSubmit={handleSubmitCategoria}
          initialCategoria={categoriaToEdit}
          loading={categoriaToEdit ? actualizarCategoriaAsync.loading : crearCategoriaAsync.loading}
        />

        {/* Toast Notification */}
        <Toast
          isOpen={toast.isOpen}
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />

        {/* Confirm Modal */}
        <ConfirmModal
          isOpen={confirm.isOpen}
          onClose={hideConfirm}
          onConfirm={confirm.onConfirm}
          title={confirm.title}
          message={confirm.message}
          type={confirm.type}
        />
        
        {/* Vercel Web Analytics */}
        <Analytics />
      </div>
    </ProductosProvider>
  );
}

export default App;