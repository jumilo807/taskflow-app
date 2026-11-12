import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Search,
  Trash2,
  Edit3,
  LogOut,
  User,
  Lock,
  Mail,
  Calendar,
  AlertCircle,
  LayoutGrid,
  List,
  X,
  CheckSquare,
  Sparkles,
  ArrowRight,
  GripVertical,
  Flame,
  Target,
  TrendingUp,
  ListTodo,
  Zap,
  Info,
  PartyPopper
} from 'lucide-react';

// --- UTILIDADES DE FECHA (en hora local, no UTC) ---
const toLocalISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getRelativeDate = (daysOffset) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return toLocalISO(date);
};

const formatDue = (iso) => {
  if (iso === getRelativeDate(0)) return 'Hoy';
  if (iso === getRelativeDate(1)) return 'Mañana';
  if (iso === getRelativeDate(-1)) return 'Ayer';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

const loadFromStorage = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

// --- DATOS DE DEMOSTRACIÓN INICIALES ---
const DEMO_USER = {
  id: 'demo-user-1',
  name: 'Usuario Demo',
  email: 'demo@taskflow.app',
  password: 'password123'
};

const INITIAL_DEMO_TASKS = [
  {
    id: 'task-1',
    userId: 'demo-user-1',
    title: 'Diseñar arquitectura de base de datos',
    description: 'Definir tablas de usuarios, tareas, etiquetas y relaciones de clave foránea.',
    dueDate: getRelativeDate(1),
    priority: 'high',
    status: 'in_progress',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    userId: 'demo-user-1',
    title: 'Configurar repositorio y despliegue continuo',
    description: 'Subir código fuente a GitHub y vincular rama principal con Render.com.',
    dueDate: getRelativeDate(3),
    priority: 'medium',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task-3',
    userId: 'demo-user-1',
    title: 'Implementar validación de formularios',
    description: 'Verificar campos obligatorios y formato de correo electrónico en registro.',
    dueDate: getRelativeDate(-1),
    priority: 'low',
    status: 'completed',
    createdAt: new Date().toISOString()
  }
];

const PRIORITY_CONFIG = {
  high: {
    label: 'Alta',
    badge: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
    dot: 'bg-rose-400',
    bar: 'from-rose-500 to-pink-500',
    active: 'bg-rose-500/20 text-rose-200 ring-rose-400/60'
  },
  medium: {
    label: 'Media',
    badge: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    dot: 'bg-amber-400',
    bar: 'from-amber-400 to-orange-500',
    active: 'bg-amber-500/20 text-amber-200 ring-amber-400/60'
  },
  low: {
    label: 'Baja',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    dot: 'bg-emerald-400',
    bar: 'from-emerald-400 to-teal-500',
    active: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/60'
  }
};

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    icon: Circle,
    text: 'text-sky-300',
    chip: 'bg-sky-500/15 ring-sky-400/30',
    line: 'from-sky-400 to-cyan-400',
    drop: 'ring-sky-400/70 bg-sky-500/[0.06]',
    active: 'bg-sky-500/20 text-sky-200 ring-sky-400/60'
  },
  in_progress: {
    label: 'En progreso',
    icon: Clock,
    text: 'text-violet-300',
    chip: 'bg-violet-500/15 ring-violet-400/30',
    line: 'from-violet-400 to-fuchsia-500',
    drop: 'ring-violet-400/70 bg-violet-500/[0.06]',
    active: 'bg-violet-500/20 text-violet-200 ring-violet-400/60'
  },
  completed: {
    label: 'Completada',
    icon: CheckCircle2,
    text: 'text-emerald-300',
    chip: 'bg-emerald-500/15 ring-emerald-400/30',
    line: 'from-emerald-400 to-teal-400',
    drop: 'ring-emerald-400/70 bg-emerald-500/[0.06]',
    active: 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/60'
  }
};

const STATUS_ORDER = ['pending', 'in_progress', 'completed'];
const CONFETTI_COLORS = ['#a78bfa', '#f472b6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185'];

export default function App() {
  // --- ESTADO DE USUARIOS Y SESIÓN ---
  const [users, setUsers] = useState(() => loadFromStorage('taskflow_users', [DEMO_USER]));
  const [currentUser, setCurrentUser] = useState(() => loadFromStorage('taskflow_session', null));

  // --- ESTADO DE TAREAS ---
  const [tasks, setTasks] = useState(() => loadFromStorage('taskflow_tasks', INITIAL_DEMO_TASKS));

  // --- ESTADOS DE INTERFAZ Y FILTROS ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => loadFromStorage('taskflow_view', 'board'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [now, setNow] = useState(() => new Date());

  // Sincronización con LocalStorage
  useEffect(() => {
    localStorage.setItem('taskflow_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('taskflow_session', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('taskflow_session');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('taskflow_view', JSON.stringify(viewMode));
  }, [viewMode]);

  // Reloj en vivo para el saludo
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // --- NOTIFICACIONES (TOASTS) ---
  const pushToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  // --- CONFETI AL COMPLETAR ---
  const celebrate = useCallback((x, y) => {
    const id = `${Date.now()}-${Math.random()}`;
    setBursts((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1000);
  }, []);

  const openNewTask = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  // Atajos de teclado: N = nueva tarea, Esc = cerrar
  useEffect(() => {
    if (!currentUser) return undefined;
    const onKey = (e) => {
      const tag = e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingTask(null);
        setDeleteConfirmId(null);
      } else if (!typing && !isModalOpen && !deleteConfirmId && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNewTask();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentUser, isModalOpen, deleteConfirmId, openNewTask]);

  // --- TAREAS FILTRADAS DEL USUARIO ACTUAL ---
  const userTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter((t) => t.userId === currentUser.id);
  }, [tasks, currentUser]);

  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return userTasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [userTasks, searchQuery, statusFilter, priorityFilter]);

  const stats = useMemo(() => {
    const today = getRelativeDate(0);
    const total = userTasks.length;
    const completed = userTasks.filter((t) => t.status === 'completed').length;
    return {
      total,
      pending: userTasks.filter((t) => t.status === 'pending').length,
      inProgress: userTasks.filter((t) => t.status === 'in_progress').length,
      completed,
      overdue: userTasks.filter((t) => t.dueDate && t.dueDate < today && t.status !== 'completed').length,
      percent: total ? Math.round((completed / total) * 100) : 0
    };
  }, [userTasks]);

  // --- OPERACIONES CRUD DE TAREAS ---
  const handleSaveTask = (taskData) => {
    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? { ...t, ...taskData } : t)));
      pushToast('Cambios guardados');
    } else {
      const newTask = {
        ...taskData,
        id: `task-${Date.now()}`,
        userId: currentUser.id,
        createdAt: new Date().toISOString()
      };
      setTasks((prev) => [newTask, ...prev]);
      pushToast('Tarea creada');
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleChangeStatus = (taskId, newStatus, origin) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.status === newStatus) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    if (newStatus === 'completed') {
      if (origin) celebrate(origin.x, origin.y);
      pushToast('¡Tarea completada!', 'party');
    } else {
      pushToast(`Movida a "${STATUS_CONFIG[newStatus].label}"`, 'info');
    }
  };

  const handleToggleComplete = (taskId, origin) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;
    handleChangeStatus(taskId, current.status === 'completed' ? 'pending' : 'completed', origin);
  };

  const handleDeleteTask = (taskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setDeleteConfirmId(null);
    pushToast('Tarea eliminada', 'danger');
  };

  const handleDrop = (e, statusKey) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    setDragOverCol(null);
    setDraggingId(null);
    if (id) handleChangeStatus(id, statusKey, { x: e.clientX, y: e.clientY });
  };

  const cardHandlers = {
    onToggleComplete: handleToggleComplete,
    onChangeStatus: handleChangeStatus,
    onEdit: (t) => {
      setEditingTask(t);
      setIsModalOpen(true);
    },
    onDelete: (id) => setDeleteConfirmId(id),
    onDragStart: (id) => setDraggingId(id),
    onDragEnd: () => {
      setDraggingId(null);
      setDragOverCol(null);
    }
  };

  // Si no hay sesión activa, renderizar pantalla de Autenticación
  if (!currentUser) {
    return (
      <>
        <AuthScreen
          users={users}
          onRegister={(newUser) => {
            setUsers((prev) => [...prev, newUser]);
            setCurrentUser(newUser);
            pushToast(`¡Bienvenido, ${newUser.name.split(' ')[0]}!`, 'party');
          }}
          onLogin={(user) => {
            setCurrentUser(user);
            pushToast(`Hola de nuevo, ${user.name.split(' ')[0]}`, 'info');
          }}
        />
        <Toasts toasts={toasts} />
      </>
    );
  }

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = currentUser.name.split(' ')[0];
  const longDate = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const initials = currentUser.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative min-h-screen flex flex-col text-slate-100">
      <Background />

      {/* BARRA DE NAVEGACIÓN SUPERIOR */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="font-extrabold text-lg tracking-tight">
              Task<span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">Flow</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 ml-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/5 text-slate-300 ring-1 ring-white/10">
              <Zap className="w-3 h-3 text-amber-300" />
              Gestor Diario
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full bg-white/5 ring-1 ring-white/10">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center text-[11px] font-bold">
                {initials}
              </span>
              <span className="hidden sm:inline text-sm font-medium text-slate-200">{currentUser.name}</span>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-rose-300 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ENCABEZADO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 animate-fade-up">
          <div>
            <p className="text-sm font-medium text-slate-400 first-letter:uppercase">{longDate}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
              {greeting},{' '}
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                {firstName}
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              {stats.total === 0
                ? 'Empieza creando tu primera tarea.'
                : stats.completed === stats.total
                  ? '¡Todo listo por hoy! Excelente trabajo.'
                  : `Tienes ${stats.total - stats.completed} tarea${stats.total - stats.completed === 1 ? '' : 's'} por terminar${stats.overdue ? `, ${stats.overdue} vencida${stats.overdue === 1 ? '' : 's'}` : ''}.`}
            </p>
          </div>

          <button onClick={openNewTask} className="btn-primary group self-start md:self-auto">
            <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            Nueva Tarea
            <kbd className="hidden sm:inline ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20">N</kbd>
          </button>
        </div>

        {/* MÉTRICAS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <ProgressCard percent={stats.percent} completed={stats.completed} total={stats.total} />
          <StatCard label="Total" value={stats.total} icon={ListTodo} gradient="from-slate-400 to-slate-600" delay={60} />
          <StatCard label="Pendientes" value={stats.pending} icon={Target} gradient="from-sky-400 to-cyan-500" delay={120} />
          <StatCard label="En progreso" value={stats.inProgress} icon={TrendingUp} gradient="from-violet-500 to-fuchsia-500" delay={180} />
          <StatCard
            label="Vencidas"
            value={stats.overdue}
            icon={Flame}
            gradient="from-rose-500 to-orange-500"
            delay={240}
            highlight={stats.overdue > 0}
          />
        </div>

        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <div
          className="glass p-3 rounded-2xl mb-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center animate-fade-up"
          style={{ animationDelay: '200ms' }}
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tareas por título o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark pl-10 pr-9 py-2"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/10"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} count={stats.total}>
                Todas
              </FilterChip>
              {STATUS_ORDER.map((s) => (
                <FilterChip
                  key={s}
                  active={statusFilter === s}
                  activeClass={STATUS_CONFIG[s].active}
                  onClick={() => setStatusFilter(s)}
                  count={s === 'pending' ? stats.pending : s === 'in_progress' ? stats.inProgress : stats.completed}
                >
                  {STATUS_CONFIG[s].label}
                </FilterChip>
              ))}
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-medium bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-violet-400/60"
            >
              <option value="all">Todas las prioridades</option>
              <option value="high">Prioridad Alta</option>
              <option value="medium">Prioridad Media</option>
              <option value="low">Prioridad Baja</option>
            </select>

            <div className="relative flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 ml-auto lg:ml-0">
              <span
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-violet-500/80 to-fuchsia-500/80 shadow-md shadow-violet-500/20 transition-transform duration-300 ease-out"
                style={{ transform: viewMode === 'board' ? 'translateX(0)' : 'translateX(100%)' }}
              />
              {[
                { key: 'board', icon: LayoutGrid, label: 'Tablero' },
                { key: 'list', icon: List, label: 'Lista' }
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`relative z-10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                    viewMode === key ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Vista ${label}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* VISUALIZACIÓN DE TAREAS */}
        {filteredTasks.length === 0 ? (
          <div className="glass border-dashed rounded-3xl p-14 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center mx-auto mb-4 shadow-xl shadow-fuchsia-500/30 animate-float">
              <CheckSquare className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold">No se encontraron tareas</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              {userTasks.length === 0
                ? 'Aún no tienes tareas. Crea la primera y empieza a organizar tu día.'
                : 'Ninguna tarea coincide con los filtros o la búsqueda actual.'}
            </p>
            {userTasks.length === 0 && (
              <button onClick={openNewTask} className="btn-primary mt-5 text-sm">
                <Plus className="w-4 h-4" /> Crear tarea
              </button>
            )}
          </div>
        ) : viewMode === 'board' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {STATUS_ORDER.map((statusKey, colIdx) => {
              const config = STATUS_CONFIG[statusKey];
              const StatusIcon = config.icon;
              const columnTasks = filteredTasks.filter((t) => t.status === statusKey);
              const isOver = dragOverCol === statusKey;

              return (
                <section
                  key={statusKey}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverCol !== statusKey) setDragOverCol(statusKey);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null);
                  }}
                  onDrop={(e) => handleDrop(e, statusKey)}
                  className={`relative glass rounded-3xl p-3.5 min-h-[14rem] transition-all duration-300 animate-fade-up ${
                    isOver ? `ring-2 scale-[1.015] ${config.drop}` : ''
                  }`}
                  style={{ animationDelay: `${250 + colIdx * 90}ms` }}
                >
                  <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r ${config.line} opacity-70`} />
                  <div className="flex items-center justify-between px-2 py-1.5 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg ring-1 ${config.chip}`}>
                        <StatusIcon className={`w-4 h-4 ${config.text}`} />
                      </span>
                      <h2 className="font-bold text-sm text-slate-100">{config.label}</h2>
                    </div>
                    <span className="text-xs font-bold min-w-[1.75rem] text-center px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {columnTasks.map((task, i) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        index={i}
                        isDragging={draggingId === task.id}
                        {...cardHandlers}
                      />
                    ))}
                    {columnTasks.length === 0 && (
                      <div
                        className={`text-xs text-center py-8 rounded-2xl border-2 border-dashed transition-colors ${
                          isOver ? 'border-white/30 text-slate-300' : 'border-white/10 text-slate-500'
                        }`}
                      >
                        {draggingId ? 'Suelta aquí' : 'Sin tareas en esta columna'}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} isListView {...cardHandlers} />
            ))}
          </div>
        )}

        <p className="hidden lg:flex items-center justify-center gap-2 text-xs text-slate-500 mt-10">
          <Info className="w-3.5 h-3.5" />
          Arrastra las tarjetas entre columnas · <kbd className="px-1.5 rounded bg-white/10 text-slate-300">N</kbd> nueva
          tarea · <kbd className="px-1.5 rounded bg-white/10 text-slate-300">Esc</kbd> cerrar
        </p>
      </main>

      {/* MODAL CREAR / EDITAR TAREA */}
      {isModalOpen && (
        <TaskModal
          initialData={editingTask}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleSaveTask}
        />
      )}

      {/* MODAL CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirmId && (
        <Overlay onClose={() => setDeleteConfirmId(null)}>
          <div className="glass bg-slate-900/90 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 ring-1 ring-rose-500/30 text-rose-300 grid place-items-center mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">¿Eliminar tarea?</h3>
            <p className="text-sm text-slate-400 mt-1">
              Esta acción eliminará la tarea permanentemente y no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteTask(deleteConfirmId)}
                className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-rose-500 to-pink-600 hover:shadow-lg hover:shadow-rose-500/30 text-white rounded-xl transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </Overlay>
      )}

      <Toasts toasts={toasts} />
      {bursts.map((b) => (
        <ConfettiBurst key={b.id} x={b.x} y={b.y} />
      ))}
    </div>
  );
}

// --- COMPONENTE: FONDO ANIMADO ---
function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-950">
      <div className="absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-violet-600/30 blur-3xl animate-blob" />
      <div
        className="absolute top-1/4 -right-40 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/20 blur-3xl animate-blob"
        style={{ animationDelay: '-6s' }}
      />
      <div
        className="absolute -bottom-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-cyan-500/[0.15] blur-3xl animate-blob"
        style={{ animationDelay: '-12s' }}
      />
      <div className="absolute inset-0 bg-grid" />
    </div>
  );
}

function Logo({ size = 'md' }) {
  const cls = size === 'lg' ? 'p-2.5 rounded-2xl' : 'p-2 rounded-xl';
  const icon = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  return (
    <div
      className={`bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-fuchsia-500/30 ${cls}`}
    >
      <CheckSquare className={icon} />
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

function FilterChip({ active, onClick, children, count, activeClass = 'bg-white/15 text-white ring-white/30' }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs font-semibold px-3 py-1.5 rounded-full ring-1 transition-all duration-200 inline-flex items-center gap-1.5 ${
        active ? `${activeClass} scale-105` : 'ring-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      {children}
      <span className={`text-[10px] px-1.5 rounded-full ${active ? 'bg-white/20' : 'bg-white/5'}`}>{count}</span>
    </button>
  );
}

// --- COMPONENTE: NÚMERO ANIMADO ---
function AnimatedNumber({ value, duration = 700 }) {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{display}</>;
}

// --- COMPONENTE: TARJETA DE ESTADÍSTICAS ---
function StatCard({ label, value, icon: Icon, gradient, delay = 0, highlight = false }) {
  return (
    <div
      className={`group glass relative overflow-hidden p-4 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.07] hover:border-white/20 animate-fade-up ${
        highlight ? 'ring-1 ring-rose-500/40' : ''
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40`}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400">{label}</p>
        <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} shadow-md`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </span>
      </div>
      <p className="text-3xl font-extrabold mt-2 tabular-nums">
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

// --- COMPONENTE: ANILLO DE PROGRESO ---
function ProgressCard({ percent, completed, total }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="glass col-span-2 lg:col-span-1 p-4 rounded-2xl flex items-center gap-4 animate-fade-up">
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
          <defs>
            <linearGradient id="progressGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="50%" stopColor="#e879f9" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="7" />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="url(#progressGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * percent) / 100}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-extrabold tabular-nums">
          <span>
            <AnimatedNumber value={percent} />%
          </span>
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400">Progreso</p>
        <p className="text-sm font-bold mt-0.5">
          {completed} de {total} completadas
        </p>
      </div>
    </div>
  );
}

// --- COMPONENTE: TARJETA DE TAREA ---
function TaskCard({
  task,
  index = 0,
  isListView,
  isDragging,
  onToggleComplete,
  onChangeStatus,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd
}) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isCompleted = task.status === 'completed';
  const isOverdue = task.dueDate && task.dueDate < getRelativeDate(0) && !isCompleted;

  const originFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  return (
    <article
      draggable={!isListView}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      className={`group relative overflow-hidden rounded-2xl border bg-slate-900/60 backdrop-blur p-4 pl-5 transition-all duration-300 animate-fade-up hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-900/80 hover:shadow-xl hover:shadow-violet-950/50 ${
        isCompleted ? 'border-white/5 opacity-70' : 'border-white/10'
      } ${isDragging ? 'opacity-40 scale-95 rotate-1' : ''} ${
        isListView ? 'flex flex-col sm:flex-row sm:items-center justify-between gap-4' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{ animationDelay: `${Math.min(index, 10) * 60}ms` }}
    >
      <span className={`absolute left-0 top-0 h-full w-1 bg-gradient-to-b ${priority.bar}`} />

      <div className="flex items-start gap-3 flex-1 min-w-0">
        <button
          onClick={(e) => onToggleComplete(task.id, originFromEvent(e))}
          className={`mt-0.5 shrink-0 transition-all duration-200 hover:scale-110 ${
            isCompleted ? 'text-emerald-400 animate-pop' : 'text-slate-500 hover:text-violet-300'
          }`}
          title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completada'}
        >
          {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset inline-flex items-center gap-1.5 ${priority.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${priority.dot} ${task.priority === 'high' && !isCompleted ? 'animate-pulse' : ''}`} />
              {priority.label}
            </span>

            {task.dueDate && (
              <span
                className={`text-[11px] font-medium inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                  isOverdue ? 'bg-rose-500/15 text-rose-300 font-semibold' : 'bg-white/5 text-slate-400'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {formatDue(task.dueDate)}
                {isOverdue && ' · Vencida'}
              </span>
            )}
          </div>

          <h3
            className={`font-semibold text-sm break-words transition-colors ${
              isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 break-words">{task.description}</p>
          )}
        </div>

        {!isListView && (
          <GripVertical className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>

      {/* ACCIONES DE TARJETA */}
      <div
        className={`flex items-center justify-between gap-2 ${
          isListView ? 'sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5' : 'mt-3 pt-3 border-t border-white/5'
        }`}
      >
        <select
          value={task.status}
          onChange={(e) => onChangeStatus(task.id, e.target.value, originFromEvent(e))}
          className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-violet-400/60"
        >
          <option value="pending">Pendiente</option>
          <option value="in_progress">En progreso</option>
          <option value="completed">Completada</option>
        </select>

        <div className="flex items-center gap-1 sm:opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-slate-400 hover:text-violet-300 hover:bg-violet-500/10 rounded-lg transition-colors"
            title="Editar tarea"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Eliminar tarea"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

// --- COMPONENTE: MODAL CREAR/EDITAR TAREA ---
function TaskModal({ initialData, onClose, onSave }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || getRelativeDate(1));
  const [priority, setPriority] = useState(initialData?.priority || 'medium');
  const [status, setStatus] = useState(initialData?.status || 'pending');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título de la tarea es obligatorio.');
      return;
    }
    onSave({ title: title.trim(), description: description.trim(), dueDate, priority, status });
  };

  return (
    <Overlay onClose={onClose}>
      <div className="relative glass bg-slate-900/90 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-in overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            {initialData ? <Edit3 className="w-5 h-5 text-violet-300" /> : <Sparkles className="w-5 h-5 text-fuchsia-300" />}
            {initialData ? 'Editar Tarea' : 'Nueva Tarea'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Título *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="Ej. Preparar presentación semanal"
              className="input-dark"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Descripción</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales o pasos a seguir..."
              className="input-dark resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Fecha de vencimiento</label>
            <div className="flex flex-wrap gap-2">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-dark flex-1 min-w-[9rem]" />
              {[
                { label: 'Hoy', off: 0 },
                { label: 'Mañana', off: 1 },
                { label: '+1 sem', off: 7 }
              ].map(({ label, off }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setDueDate(getRelativeDate(off))}
                  className={`text-xs font-semibold px-3 rounded-xl ring-1 transition-all ${
                    dueDate === getRelativeDate(off)
                      ? 'bg-violet-500/20 text-violet-200 ring-violet-400/60'
                      : 'ring-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Prioridad</label>
            <div className="grid grid-cols-3 gap-2">
              {['low', 'medium', 'high'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 text-xs font-semibold rounded-xl ring-1 transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
                    priority === p ? `${PRIORITY_CONFIG[p].active} scale-[1.03]` : 'ring-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[p].dot}`} />
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Estado</label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_ORDER.map((s) => {
                const Icon = STATUS_CONFIG[s].icon;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-2 text-xs font-semibold rounded-xl ring-1 transition-all duration-200 inline-flex items-center justify-center gap-1.5 ${
                      status === s ? `${STATUS_CONFIG[s].active} scale-[1.03]` : 'ring-white/10 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {STATUS_CONFIG[s].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary text-sm px-5 py-2">
              {initialData ? 'Guardar Cambios' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </Overlay>
  );
}

// --- COMPONENTE: NOTIFICACIONES ---
function Toasts({ toasts }) {
  const styles = {
    success: { icon: CheckCircle2, cls: 'text-emerald-300', bar: 'bg-emerald-400' },
    party: { icon: PartyPopper, cls: 'text-fuchsia-300', bar: 'bg-gradient-to-r from-violet-400 to-pink-400' },
    info: { icon: Info, cls: 'text-sky-300', bar: 'bg-sky-400' },
    danger: { icon: Trash2, cls: 'text-rose-300', bar: 'bg-rose-400' }
  };
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-xs">
      {toasts.map((t) => {
        const s = styles[t.type] || styles.success;
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className="relative overflow-hidden glass bg-slate-900/90 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-toast-in"
          >
            <Icon className={`w-5 h-5 shrink-0 ${s.cls}`} />
            <p className="text-sm font-medium text-slate-100">{t.message}</p>
            <span className={`absolute bottom-0 left-0 h-0.5 w-full origin-left animate-shrink ${s.bar}`} />
          </div>
        );
      })}
    </div>
  );
}

// --- COMPONENTE: CONFETI ---
function ConfettiBurst({ x, y }) {
  const [pieces] = useState(() =>
    Array.from({ length: 24 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.5;
      const dist = 50 + Math.random() * 80;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 25,
        rot: Math.random() * 720 - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 5 + Math.random() * 5,
        round: Math.random() > 0.5
      };
    })
  );

  return (
    <div className="pointer-events-none fixed z-[80]" style={{ left: x, top: y }}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute block animate-confetti"
          style={{
            width: p.size,
            height: p.size,
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
            background: p.color,
            borderRadius: p.round ? '9999px' : '2px',
            '--x': `${p.dx}px`,
            '--y': `${p.dy}px`,
            '--r': `${p.rot}deg`
          }}
        />
      ))}
    </div>
  );
}

// --- COMPONENTE: PANTALLA DE REGISTRO Y LOGIN ---
function AuthScreen({ users, onRegister, onLogin }) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  const fail = (msg) => {
    setError(msg);
    setShake((n) => n + 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim() || (isRegisterMode && !name.trim())) {
      fail('Por favor completa todos los campos.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fail('Ingresa un correo electrónico válido.');
      return;
    }

    if (isRegisterMode) {
      if (password.length < 6) {
        fail('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (exists) {
        fail('Este correo electrónico ya está registrado.');
        return;
      }
      onRegister({
        id: `user-${Date.now()}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password
      });
    } else {
      const found = users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
      );
      if (!found) {
        fail('Credenciales incorrectas. Verifica tu correo y contraseña.');
        return;
      }
      onLogin(found);
    }
  };

  const features = [
    { icon: LayoutGrid, text: 'Tablero Kanban con arrastrar y soltar' },
    { icon: TrendingUp, text: 'Progreso y métricas en tiempo real' },
    { icon: Flame, text: 'Prioridades y alertas de vencimiento' }
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 text-slate-100">
      <Background />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-10 items-center">
        {/* Lado izquierdo: presentación */}
        <div className="hidden lg:block animate-fade-up">
          <div className="flex items-center gap-3 mb-8">
            <Logo size="lg" />
            <span className="font-extrabold text-2xl tracking-tight">TaskFlow</span>
          </div>
          <h2 className="text-5xl font-extrabold leading-tight tracking-tight">
            Organiza tu día
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient-x">
              con fluidez.
            </span>
          </h2>
          <p className="text-slate-400 mt-4 max-w-md">
            Planea, prioriza y completa tus tareas en un espacio de trabajo rápido y visual.
          </p>
          <ul className="mt-8 space-y-3">
            {features.map(({ icon: Icon, text }, i) => (
              <li
                key={text}
                className="flex items-center gap-3 text-sm text-slate-300 animate-fade-up"
                style={{ animationDelay: `${200 + i * 120}ms` }}
              >
                <span className="p-2 rounded-xl bg-white/5 ring-1 ring-white/10">
                  <Icon className="w-4 h-4 text-fuchsia-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Lado derecho: formulario */}
        <div
          key={shake}
          className={`glass bg-slate-900/60 max-w-md w-full mx-auto rounded-3xl shadow-2xl p-8 ${
            shake ? 'animate-shake' : 'animate-scale-in'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <Logo />
            <span className="font-extrabold text-xl">TaskFlow</span>
          </div>

          {/* Pestañas login / registro */}
          <div className="relative grid grid-cols-2 p-1 mb-6 rounded-xl bg-white/5 ring-1 ring-white/10">
            <span
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-lg shadow-fuchsia-500/20 transition-transform duration-300 ease-out"
              style={{ transform: isRegisterMode ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {[
              { label: 'Iniciar sesión', reg: false },
              { label: 'Registrarse', reg: true }
            ].map(({ label, reg }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setIsRegisterMode(reg);
                  setError('');
                }}
                className={`relative z-10 py-2 text-xs font-bold rounded-lg transition-colors ${
                  isRegisterMode === reg ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-extrabold">{isRegisterMode ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
          <p className="text-sm text-slate-400 mt-1 mb-6">
            {isRegisterMode
              ? 'Regístrate para comenzar a organizar tus tareas diarias.'
              : 'Inicia sesión para acceder a tu espacio de trabajo.'}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div className="animate-fade-up">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nombre completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre"
                    className="input-dark pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Correo electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="input-dark pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-dark pl-10"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary group w-full">
              {isRegisterMode ? 'Registrarme' : 'Iniciar Sesión'}
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <span className="flex-1 h-px bg-white/10" />
            <span className="text-[11px] uppercase tracking-wider text-slate-500">o</span>
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={() => onLogin(DEMO_USER)}
            className="group w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 ring-1 ring-white/10 hover:ring-fuchsia-400/40 text-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-fuchsia-300 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-125" />
            Entrar rápido con Cuenta Demo
          </button>
        </div>
      </div>
    </div>
  );
}
