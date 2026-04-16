/**
 * Store global de la aplicación con Zustand.
 * Centraliza el estado de tareas, catálogos, usuarios, equipos,
 * la tarea seleccionada, el estado del sidebar y el sistema de toasts.
 */

import { create } from 'zustand';

const useStore = create((set) => ({
  /* --------------------------------------------------
     Tareas
  -------------------------------------------------- */
  tareas: [],

  setTareas: (tareas) => set({ tareas }),

  addTarea: (tarea) =>
    set((state) => ({
      tareas: [...state.tareas, tarea],
    })),

  updateTarea: (id, data) =>
    set((state) => ({
      tareas: state.tareas.map((t) =>
        t.idTarea === id ? { ...t, ...data } : t
      ),
    })),

  deleteTarea: (id) =>
    set((state) => ({
      tareas: state.tareas.filter((t) => t.idTarea !== id),
    })),

  /* --------------------------------------------------
     Catálogos de Estatus y Prioridad
  -------------------------------------------------- */
  estatuses: [],
  setEstatuses: (estatuses) => set({ estatuses }),

  prioridades: [],
  setPrioridades: (prioridades) => set({ prioridades }),

  /* --------------------------------------------------
     Usuarios
  -------------------------------------------------- */
  usuarios: [],
  setUsuarios: (usuarios) => set({ usuarios }),

  /* --------------------------------------------------
     Equipos
  -------------------------------------------------- */
  equipos: [],
  setEquipos: (equipos) => set({ equipos }),

  /* --------------------------------------------------
     Tarea seleccionada (panel de detalle / modal)
  -------------------------------------------------- */
  selectedTask: null,
  setSelectedTask: (tarea) => set({ selectedTask: tarea }),

  /* --------------------------------------------------
     Sidebar
  -------------------------------------------------- */
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  /* --------------------------------------------------
     Sistema de Toasts
  -------------------------------------------------- */
  toasts: [],

  /**
   * Agrega un toast a la cola.
   * @param {{ id: string, message: string, type: 'success'|'error'|'info'|'warning', action?: { label: string, onClick: () => void }, duration?: number }} toast
   */
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, toast],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export default useStore;
