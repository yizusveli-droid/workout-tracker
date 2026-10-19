'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Play,
  Pause,
  Plus,
  Check,
  Trophy,
  Clock,
  Trash2,
  X,
  Search,
  Dumbbell,
  Save,
  Loader2,
  Sparkles,
  ArrowUp,
  ArrowDown,
  History,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Edit3,
  PlusCircle,
  Home,
  Flame,
  Layers,
  Activity,
  FolderPlus,
  LogOut,
  Pencil,
  ClipboardList,
  Calculator,
  Download,
  RefreshCw,
  MessageSquare,
  Volume2,
  Link2,
  AlertTriangle,
  RotateCcw,
  BarChart2,
  Target,
  CornerDownRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ANATOMICAL_EXERCISES, CatalogExercise } from '@/data/exercises'

type SetType = 'normal' | 'dropset' | 'restpause' | 'failure'

interface ExerciseSet {
  id: string
  setNumber: number
  weight: number
  reps: number
  rir: number
  isCompleted: boolean
  isPr: boolean
  setType?: SetType
  parentSetId?: string // Enlace a la serie madre
}

interface WorkoutExercise {
  id: string
  exerciseId: string
  name: string
  targetMuscle: string
  secondaryMuscle?: string
  anatomicalImageUrl: string
  previousBest?: string
  note?: string
  supersetGroup?: string
  sets: ExerciseSet[]
}

interface PastWorkout {
  id: string
  name: string
  total_volume_kg: number
  completed_at: string
}

interface RoutineTemplateItem {
  exerciseId: string
  setsCount: number
  defaultWeight: number
  defaultReps: number
  defaultRir: number
  note?: string
  previousBest?: string
  supersetGroup?: string
}

interface ProgramDay {
  id: string
  dayBadge: string
  title: string
  subtitle: string
  estimatedDuration: string
  items: RoutineTemplateItem[]
}

interface WorkoutProgram {
  id: string
  name: string
  description?: string
  days: ProgramDay[]
}

interface ActiveWorkoutBackup {
  workoutName: string
  sessionSeconds: number
  exercises: WorkoutExercise[]
  lastSavedTimestamp: number
}

function playBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()

    const playTone = (freq: number, delayMs: number, durationSec: number) => {
      setTimeout(() => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, ctx.currentTime)
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + durationSec)
      }, delayMs)
    }

    playTone(880, 0, 0.18)
    playTone(880, 240, 0.25)

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 250])
    }
  } catch (e) {
    console.warn('AudioContext no disponible:', e)
  }
}

function MuscleIconPlaceholder({ targetMuscle }: { targetMuscle: string }) {
  return (
    <div className="w-full h-full bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col items-center justify-center p-1.5 text-center select-none">
      <div className="w-7 h-7 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mb-1">
        <Dumbbell className="w-3.5 h-3.5" />
      </div>
      <span className="text-[9px] font-extrabold uppercase tracking-tight text-lime-400 truncate max-w-full">
        {targetMuscle || 'General'}
      </span>
      <span className="text-[7px] text-neutral-500 font-mono">Lámina 2D</span>
    </div>
  )
}

function AnatomicalImage({
  src,
  alt,
  targetMuscle,
  className = 'w-full h-full object-contain',
}: {
  src: string
  alt: string
  targetMuscle: string
  className?: string
}) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (!src || src.trim() === '' || hasError) {
    return <MuscleIconPlaceholder targetMuscle={targetMuscle} />
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  )
}

const MUSCLE_FILTER_OPTIONS = [
  'Todos',
  'Espalda',
  'Pecho',
  'Hombros',
  'Brazos',
  'Cuádriceps',
  'Isquiosurales',
  'Glúteos',
  'Gemelos',
  'Abdomen',
]

const DEFAULT_5_DAY_PROGRAM: WorkoutProgram = {
  id: 'prog-5-dias-base',
  name: 'Mi División de 5 Días',
  description: 'Torso A, Pierna, Torso B, Pierna y Brazos',
  days: [
    {
      id: 'd1-torso-a',
      dayBadge: 'Día 1',
      title: 'Torso A (Fuerza e Hipertrofia)',
      subtitle: 'Espalda dominante, banca pesada, laterales y brazos',
      estimatedDuration: '60 min',
      items: [
        { exerciseId: 'ex-1', setsCount: 3, defaultWeight: 10, defaultReps: 8, defaultRir: 1, note: 'Pausa 1s arriba' },
        { exerciseId: 'ex-20', setsCount: 3, defaultWeight: 80, defaultReps: 8, defaultRir: 1, note: 'Retracción firme' },
        { exerciseId: 'ex-4', setsCount: 3, defaultWeight: 65, defaultReps: 10, defaultRir: 1, note: 'Remo T' },
        { exerciseId: 'ex-35', setsCount: 3, defaultWeight: 12, defaultReps: 12, defaultRir: 1, note: 'Laterales' },
        { exerciseId: 'ex-48', setsCount: 2, defaultWeight: 32.5, defaultReps: 10, defaultRir: 1, note: 'Predicador', supersetGroup: 'A' },
        { exerciseId: 'ex-58', setsCount: 2, defaultWeight: 25, defaultReps: 12, defaultRir: 1, note: 'Overhead', supersetGroup: 'A' },
      ],
    },
    {
      id: 'd2-pierna-a',
      dayBadge: 'Día 2',
      title: 'Pierna (Cuádriceps y Posterior)',
      subtitle: 'Sentadilla trasera, peso muerto rumano y prensa 45°',
      estimatedDuration: '65 min',
      items: [
        { exerciseId: 'ex-68', setsCount: 3, defaultWeight: 100, defaultReps: 8, defaultRir: 2, note: 'Profunda' },
        { exerciseId: 'ex-78', setsCount: 3, defaultWeight: 90, defaultReps: 8, defaultRir: 2, note: 'Cadera atrás' },
        { exerciseId: 'ex-71', setsCount: 3, defaultWeight: 180, defaultReps: 10, defaultRir: 1, note: 'Prensa 45°' },
        { exerciseId: 'ex-81', setsCount: 3, defaultWeight: 55, defaultReps: 12, defaultRir: 1, note: 'Femoral sentado' },
        { exerciseId: 'ex-93', setsCount: 3, defaultWeight: 70, defaultReps: 15, defaultRir: 1, note: 'Gemelos' },
      ],
    },
    {
      id: 'd3-torso-b',
      dayBadge: 'Día 3',
      title: 'Torso B (Densidad y Amplitud)',
      subtitle: 'Press inclinado mancuernas, jalón al pecho y deltoides posterior',
      estimatedDuration: '60 min',
      items: [
        { exerciseId: 'ex-21', setsCount: 3, defaultWeight: 30, defaultReps: 10, defaultRir: 1, note: 'Inclinado 30°' },
        { exerciseId: 'ex-6', setsCount: 3, defaultWeight: 65, defaultReps: 10, defaultRir: 1, note: 'Jalón polea' },
        { exerciseId: 'ex-12', setsCount: 3, defaultWeight: 60, defaultReps: 10, defaultRir: 1, note: 'Remo Gironda' },
        { exerciseId: 'ex-43', setsCount: 3, defaultWeight: 30, defaultReps: 15, defaultRir: 1, note: 'Face pull' },
        { exerciseId: 'ex-52', setsCount: 2, defaultWeight: 16, defaultReps: 10, defaultRir: 1, note: 'Martillo', supersetGroup: 'B' },
        { exerciseId: 'ex-59', setsCount: 2, defaultWeight: 30, defaultReps: 12, defaultRir: 1, note: 'Cuerda tríceps', supersetGroup: 'B' },
      ],
    },
    {
      id: 'd4-pierna-b',
      dayBadge: 'Día 4',
      title: 'Pierna (Glúteo y Unilateral)',
      subtitle: 'Hip Thrust pesado, sentadillas búlgaras y extensiones',
      estimatedDuration: '60 min',
      items: [
        { exerciseId: 'ex-86', setsCount: 3, defaultWeight: 120, defaultReps: 10, defaultRir: 1, note: 'Bloqueo 1s' },
        { exerciseId: 'ex-73', setsCount: 3, defaultWeight: 22, defaultReps: 10, defaultRir: 1, note: 'Búlgaras' },
        { exerciseId: 'ex-72', setsCount: 3, defaultWeight: 60, defaultReps: 12, defaultRir: 1, note: 'Sillón cuádriceps' },
        { exerciseId: 'ex-81', setsCount: 3, defaultWeight: 50, defaultReps: 12, defaultRir: 1, note: 'Femoral sentado' },
      ],
    },
    {
      id: 'd5-brazos',
      dayBadge: 'Día 5',
      title: 'Brazos y Hombros (Aislamiento)',
      subtitle: 'Bíceps estiramiento, tríceps tras nuca y laterales al fallo',
      estimatedDuration: '55 min',
      items: [
        { exerciseId: 'ex-48', setsCount: 3, defaultWeight: 32.5, defaultReps: 10, defaultRir: 1, note: 'Scott Z', supersetGroup: 'A' },
        { exerciseId: 'ex-58', setsCount: 2, defaultWeight: 25, defaultReps: 12, defaultRir: 1, note: 'Overhead', supersetGroup: 'A' },
        { exerciseId: 'ex-51', setsCount: 3, defaultWeight: 14, defaultReps: 10, defaultRir: 1, note: 'Curl 60°', supersetGroup: 'B' },
        { exerciseId: 'ex-61', setsCount: 3, defaultWeight: 30, defaultReps: 10, defaultRir: 1, note: 'Press francés', supersetGroup: 'B' },
        { exerciseId: 'ex-35', setsCount: 4, defaultWeight: 12, defaultReps: 15, defaultRir: 0, note: 'Laterales RIR 0' },
      ],
    },
  ],
}

export default function ActiveWorkoutPage() {
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authIsRegister, setAuthIsRegister] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

  const [activeTab, setActiveTab] = useState<'home' | 'workout' | 'routines' | 'history' | 'library'>('home')
  const [bodyWeightKg, setBodyWeightKg] = useState<number>(80)

  const [catalog, setCatalog] = useState<CatalogExercise[]>(ANATOMICAL_EXERCISES)
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState('Todos')
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [selectedPreview, setSelectedPreview] = useState<CatalogExercise | null>(null)

  const [isNewExerciseModalOpen, setIsNewExerciseModalOpen] = useState(false)
  const [newExName, setNewExName] = useState('')
  const [newExMuscle, setNewExMuscle] = useState('Pecho')
  const [newExSecondary, setNewExSecondary] = useState('')
  const [newExEquipment, setNewExEquipment] = useState('Barra')
  const [newExUrl, setNewExUrl] = useState('')

  const [programsList, setProgramsList] = useState<WorkoutProgram[]>([DEFAULT_5_DAY_PROGRAM])
  const [selectedProgramId, setSelectedProgramId] = useState<string>(DEFAULT_5_DAY_PROGRAM.id)
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0)

  const [isCreatingProgram, setIsCreatingProgram] = useState(false)
  const [newProgramName, setNewProgramName] = useState('')
  const [newProgramDesc, setNewProgramDesc] = useState('')

  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [modalDayBadge, setModalDayBadge] = useState('Día 1')
  const [modalDayTitle, setModalDayTitle] = useState('')
  const [modalDaySubtitle, setModalDaySubtitle] = useState('')
  const [modalItems, setModalItems] = useState<RoutineTemplateItem[]>([])
  const [modalMuscleFilter, setModalMuscleFilter] = useState('Todos')
  const [modalSearchQuery, setModalSearchQuery] = useState('')

  const [isAddLiveExerciseOpen, setIsAddLiveExerciseOpen] = useState(false)
  const [liveSearchQuery, setLiveSearchQuery] = useState('')
  const [liveMuscleFilter, setLiveMuscleFilter] = useState('Todos')

  const [substitutingExerciseId, setSubstitutingExerciseId] = useState<string | null>(null)

  const [editingWorkout, setEditingWorkout] = useState<PastWorkout | null>(null)
  const [editingGroupedExercises, setEditingGroupedExercises] = useState<{ exerciseId: string; exerciseName: string; sets: any[] }[]>([])
  const [isSavingHistoryEdit, setIsSavingHistoryEdit] = useState(false)
  const [isAddingExerciseToHistory, setIsAddingExerciseToHistory] = useState(false)
  const [historySearchQuery, setHistorySearchQuery] = useState('')

  const [workoutName, setWorkoutName] = useState('Torso A (Fuerza e Hipertrofia)')
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isSessionRunning, setIsSessionRunning] = useState(false)

  const [interruptedWorkout, setInterruptedWorkout] = useState<ActiveWorkoutBackup | null>(null)
  const [isInterruptedModalOpen, setIsInterruptedModalOpen] = useState(false)

  // Calendario semanal
  const [selectedDateKey, setSelectedDateKey] = useState<string>('')
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0)

  const [restSeconds, setRestSeconds] = useState<number | null>(null)
  const [isRestActive, setIsRestActive] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [historyList, setHistoryList] = useState<PastWorkout[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [workoutSetsDetails, setWorkoutSetsDetails] = useState<Record<string, any[]>>({})
  const [isLoadingSets, setIsLoadingSets] = useState(false)
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const historyLoadedRef = useRef(false)

  // Calculadora 1RM bidireccional
  const [calcWeight, setCalcWeight] = useState<number>(80)
  const [calcReps, setCalcReps] = useState<number>(8)
  const [targetRepsGoal, setTargetRepsGoal] = useState<number>(10)

  const [exercises, setExercises] = useState<WorkoutExercise[]>([])

  useEffect(() => {
    setSelectedDateKey(new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    try {
      const customSaved = localStorage.getItem('user_custom_library_exercises')
      if (customSaved) {
        const parsed: CatalogExercise[] = JSON.parse(customSaved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ids = new Set(ANATOMICAL_EXERCISES.map((e) => e.id))
          const filtered = parsed.filter((e) => !ids.has(e.id))
          setCatalog([...filtered, ...ANATOMICAL_EXERCISES])
        }
      }
    } catch (e) {
      console.warn('Error leyendo biblioteca personalizada:', e)
    }
  }, [])

  // La pestaña Entrenar inicia limpia (sin rutina precargada)

  useEffect(() => {
    try {
      const backupRaw = localStorage.getItem('active_workout_backup')
      if (backupRaw) {
        const parsed: ActiveWorkoutBackup = JSON.parse(backupRaw)
        const hasCompletedSets = parsed.exercises?.some((ex) => ex.sets.some((s) => s.isCompleted))
        if (parsed.sessionSeconds > 0 || hasCompletedSets) {
          setInterruptedWorkout(parsed)
          setIsInterruptedModalOpen(true)
        }
      }
    } catch (e) {
      console.warn('Error al verificar sesión respaldada:', e)
    }
  }, [])

  useEffect(() => {
    const hasAnyCompleted = exercises.some((ex) => ex.sets.some((s) => s.isCompleted))
    if (isSessionRunning || hasAnyCompleted) {
      const backupData: ActiveWorkoutBackup = {
        workoutName,
        sessionSeconds,
        exercises,
        lastSavedTimestamp: Date.now(),
      }
      try {
        localStorage.setItem('active_workout_backup', JSON.stringify(backupData))
      } catch (e) {
        console.warn('Error guardando respaldo de sesión en tiempo real:', e)
      }
    }
  }, [exercises, sessionSeconds, workoutName, isSessionRunning])

  const handleResumeWorkout = () => {
    if (!interruptedWorkout) return
    setWorkoutName(interruptedWorkout.workoutName || 'Sesión en Vivo')
    setSessionSeconds(interruptedWorkout.sessionSeconds || 0)
    setExercises(interruptedWorkout.exercises || [])
    setIsSessionRunning(true)
    setIsInterruptedModalOpen(false)
    setActiveTab('workout')
  }

  const handleDiscardBackup = () => {
    localStorage.removeItem('active_workout_backup')
    setInterruptedWorkout(null)
    setIsInterruptedModalOpen(false)
  }

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem('user_workout_programs_v7') ||
        localStorage.getItem('user_workout_programs_v6') ||
        localStorage.getItem('user_workout_programs_v5') ||
        localStorage.getItem('user_workout_programs_v4')

      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed[0]?.days
            ? parsed
            : [
                DEFAULT_5_DAY_PROGRAM,
                {
                  id: 'prog-custom-recuperado',
                  name: 'Mis Rutinas Creadas',
                  description: 'Rutinas recuperadas de la sesión anterior',
                  days: parsed.map((item: any, idx: number) => ({
                    id: item.id || `day-rec-${idx}`,
                    dayBadge: item.dayBadge || `Día ${idx + 1}`,
                    title: item.title || item.name || `Día ${idx + 1}`,
                    subtitle: item.subtitle || '',
                    estimatedDuration: item.estimatedDuration || '60 min',
                    items: item.items || [],
                  })),
                },
              ]

          setProgramsList(formatted)
          setSelectedProgramId(formatted[formatted.length - 1].id)
          localStorage.setItem('user_workout_programs_v7', JSON.stringify(formatted))
        }
      }
    } catch (e) {
      console.warn('Error recuperando programas:', e)
    }
  }, [])

  const savePrograms = (newList: WorkoutProgram[]) => {
    setProgramsList(newList)
    try {
      localStorage.setItem('user_workout_programs_v7', JSON.stringify(newList))
    } catch (e) {
      console.warn('Error guardando programas:', e)
    }
  }

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
      setAuthLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthSubmitting(true)
    const supabase = createClient()
    if (!supabase) {
      setAuthError('Supabase no configurado')
      setAuthSubmitting(false)
      return
    }

    try {
      if (authIsRegister) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        })
        if (error) throw error
        setUser(data.user)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        })
        if (error) throw error
        setUser(data.user)
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error al autenticar')
    } finally {
      setAuthSubmitting(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
      setUser(null)
    }
  }

  const loadHistory = async (force = false) => {
    if (!user) return
    if (historyLoadedRef.current && !force) return
    setIsLoadingHistory(true)
    try {
      const supabase = createClient()
      if (!supabase) return
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50)

      if (data && !error) {
        setHistoryList(data)
        historyLoadedRef.current = true

        const workoutIds = data.map((w: any) => w.id)
        if (workoutIds.length > 0) {
          const { data: allSets } = await supabase
            .from('workout_sets')
            .select('*')
            .in('workout_id', workoutIds)

          if (allSets) {
            const mappedSets: Record<string, any[]> = {}
            allSets.forEach((s: any) => {
              if (!mappedSets[s.workout_id]) mappedSets[s.workout_id] = []
              mappedSets[s.workout_id].push(s)
            })
            setWorkoutSetsDetails((prev) => ({ ...prev, ...mappedSets }))
          }
        }
      }
    } catch (err) {
      console.warn('Aviso cargando historial:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadHistory()
    }
  }, [user])

  const toggleWorkoutDetails = async (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null)
      return
    }
    setExpandedWorkoutId(workoutId)

    if (workoutSetsDetails[workoutId] && workoutSetsDetails[workoutId].length > 0) return

    setIsLoadingSets(true)
    try {
      const supabase = createClient()
      if (!supabase) return
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('workout_id', workoutId)
        .order('set_number', { ascending: true })

      if (data && !error && data.length > 0) {
        setWorkoutSetsDetails((prev) => ({ ...prev, [workoutId]: data }))
      } else {
        const localBackup = localStorage.getItem(`workout_sets_${workoutId}`)
        if (localBackup) {
          setWorkoutSetsDetails((prev) => ({ ...prev, [workoutId]: JSON.parse(localBackup) }))
        }
      }
    } catch (err) {
      console.warn('Error cargando series:', err)
      const localBackup = localStorage.getItem(`workout_sets_${workoutId}`)
      if (localBackup) {
        setWorkoutSetsDetails((prev) => ({ ...prev, [workoutId]: JSON.parse(localBackup) }))
      }
    } finally {
      setIsLoadingSets(false)
    }
  }

  const deleteWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Estás seguro de que deseas eliminar esta sesión del historial?')) return

    try {
      const supabase = createClient()
      if (supabase) {
        await supabase.from('workout_sets').delete().eq('workout_id', workoutId)
        await supabase.from('workouts').delete().eq('id', workoutId)
      }
      setHistoryList((prev) => prev.filter((w) => w.id !== workoutId))
      localStorage.removeItem(`workout_sets_${workoutId}`)
      if (expandedWorkoutId === workoutId) setExpandedWorkoutId(null)
    } catch (err) {
      console.warn('Error eliminando sesión:', err)
    }
  }

  const openEditWorkoutModal = async (workout: PastWorkout, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingWorkout(workout)
    setIsAddingExerciseToHistory(false)
    setHistorySearchQuery('')

    let sets = workoutSetsDetails[workout.id]
    if (!sets || sets.length === 0) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data } = await supabase
            .from('workout_sets')
            .select('*')
            .eq('workout_id', workout.id)
            .order('set_number', { ascending: true })
          if (data && data.length > 0) sets = data
        }
      } catch (err) {
        console.warn('Error cargando series para editar:', err)
      }
    }

    const rawList = sets || []
    const groups: { exerciseId: string; exerciseName: string; sets: any[] }[] = []
    rawList.forEach((s) => {
      const exInfo =
        catalog.find((c: CatalogExercise) => c.id === s.exercise_id || c.name === s.exercise_id) ||
        ANATOMICAL_EXERCISES.find((c: CatalogExercise) => c.id === s.exercise_id)
      const name = exInfo ? exInfo.name : s.exercise_id || 'Ejercicio Registrado'

      let grp = groups.find((g) => g.exerciseId === s.exercise_id)
      if (!grp) {
        grp = { exerciseId: s.exercise_id, exerciseName: name, sets: [] }
        groups.push(grp)
      }
      grp.sets.push({ ...s })
    })

    setEditingGroupedExercises(groups)
  }

  const moveHistoryExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= editingGroupedExercises.length) return
    const reordered = [...editingGroupedExercises]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp
    setEditingGroupedExercises(reordered)
  }

  const removeHistoryExerciseGroup = (index: number) => {
    setEditingGroupedExercises((prev) => prev.filter((_, i) => i !== index))
  }

  const addSetToHistoryGroup = (groupIndex: number) => {
    setEditingGroupedExercises((prev) =>
      prev.map((grp, idx) => {
        if (idx !== groupIndex) return grp
        const lastSet = grp.sets[grp.sets.length - 1]
        const newSet = {
          id: `new-${Date.now()}-${grp.sets.length + 1}`,
          workout_id: editingWorkout?.id,
          exercise_id: grp.exerciseId,
          set_number: grp.sets.length + 1,
          weight_kg: lastSet ? lastSet.weight_kg : 40,
          reps: lastSet ? lastSet.reps : 10,
          rir: 1,
          is_pr: false,
        }
        return { ...grp, sets: [...grp.sets, newSet] }
      })
    )
  }

  const removeSetFromHistoryGroup = (groupIndex: number, setIndex: number) => {
    setEditingGroupedExercises((prev) =>
      prev.map((grp, idx) => {
        if (idx !== groupIndex) return grp
        const filtered = grp.sets
          .filter((_, sI) => sI !== setIndex)
          .map((s, newIdx) => ({ ...s, set_number: newIdx + 1 }))
        return { ...grp, sets: filtered }
      })
    )
  }

  const updateHistorySetValue = (
    groupIndex: number,
    setIndex: number,
    field: 'weight_kg' | 'reps' | 'rir',
    val: number
  ) => {
    setEditingGroupedExercises((prev) =>
      prev.map((grp, gI) => {
        if (gI !== groupIndex) return grp
        return {
          ...grp,
          sets: grp.sets.map((s, sI) => (sI === setIndex ? { ...s, [field]: val } : s)),
        }
      })
    )
  }

  const handleAddExerciseToHistorySession = (catEx: CatalogExercise) => {
    if (!editingWorkout) return
    const newGroup = {
      exerciseId: catEx.id,
      exerciseName: catEx.name,
      sets: [
        { id: `new-${Date.now()}-1`, workout_id: editingWorkout.id, exercise_id: catEx.id, set_number: 1, weight_kg: 30, reps: 10, rir: 2, is_pr: false },
        { id: `new-${Date.now()}-2`, workout_id: editingWorkout.id, exercise_id: catEx.id, set_number: 2, weight_kg: 30, reps: 10, rir: 1, is_pr: false },
        { id: `new-${Date.now()}-3`, workout_id: editingWorkout.id, exercise_id: catEx.id, set_number: 3, weight_kg: 30, reps: 10, rir: 1, is_pr: false },
      ],
    }
    setEditingGroupedExercises((prev) => [...prev, newGroup])
    setIsAddingExerciseToHistory(false)
  }

  const handleSaveWorkoutEdit = async () => {
    if (!editingWorkout) return
    setIsSavingHistoryEdit(true)

    try {
      const flattenedSets = editingGroupedExercises.flatMap((grp) => grp.sets)
      const totalVolume = flattenedSets.reduce(
        (acc, s) => acc + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0),
        0
      )

      const supabase = createClient()
      if (supabase) {
        await supabase
          .from('workouts')
          .update({
            name: editingWorkout.name,
            total_volume_kg: totalVolume,
          })
          .eq('id', editingWorkout.id)

        await supabase.from('workout_sets').delete().eq('workout_id', editingWorkout.id)

        const setsToInsert = flattenedSets.map((s, idx) => ({
          workout_id: editingWorkout.id,
          exercise_id: s.exercise_id,
          set_number: s.set_number || idx + 1,
          weight_kg: Number(s.weight_kg) || 0,
          reps: Number(s.reps) || 0,
          rir: Number(s.rir) || 0,
          is_pr: Boolean(s.is_pr),
        }))

        if (setsToInsert.length > 0) {
          await supabase.from('workout_sets').insert(setsToInsert)
        }
      }

      setHistoryList((prev) =>
        prev.map((w) =>
          w.id === editingWorkout.id
            ? { ...w, name: editingWorkout.name, total_volume_kg: totalVolume }
            : w
        )
      )
      setWorkoutSetsDetails((prev) => ({
        ...prev,
        [editingWorkout.id]: flattenedSets,
      }))
      localStorage.setItem(`workout_sets_${editingWorkout.id}`, JSON.stringify(flattenedSets))

      setEditingWorkout(null)
    } catch (err) {
      console.warn('Error guardando cambios en sesión:', err)
      alert('Error al guardar los cambios.')
    } finally {
      setIsSavingHistoryEdit(false)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionRunning) {
      interval = setInterval(() => setSessionSeconds((prev) => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionRunning])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRestActive && restSeconds !== null && restSeconds > 0) {
      interval = setInterval(() => {
        setRestSeconds((prev) => {
          if (prev === 1) {
            playBeepSound()
            setIsRestActive(false)
            return 0
          }
          return prev ? prev - 1 : 0
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRestActive, restSeconds])

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const calculate1RM = (weight: number, reps: number) => {
    if (weight <= 0 || reps <= 0) return 0
    if (reps === 1) return weight
    return Math.round(weight * (1 + reps / 30))
  }

  const estimated1RMCalc = useMemo(() => {
    return calculate1RM(calcWeight, calcReps)
  }, [calcWeight, calcReps])

  const targetWeightForReps = useMemo(() => {
    if (estimated1RMCalc <= 0 || targetRepsGoal <= 0) return 0
    if (targetRepsGoal === 1) return estimated1RMCalc
    const target = estimated1RMCalc / (1 + targetRepsGoal / 30)
    return Math.round(target * 2) / 2
  }, [estimated1RMCalc, targetRepsGoal])

  // Lógica de completar serie y activación de descanso (considerando sub-series drop/rest-pause)
  const toggleSetComplete = (exerciseId: string, setId: string) => {
    if (!isSessionRunning) setIsSessionRunning(true)

    setExercises((prev) => {
      const currentEx = prev.find((e) => e.id === exerciseId)
      if (!currentEx) return prev

      const targetSet = currentEx.sets.find((s) => s.id === setId)
      const willBeCompleted = targetSet ? !targetSet.isCompleted : false

      // Si es una serie madre que tiene un drop set encadenado sin completar, NO lanzar descanso aún
      const hasUnfinishedChildren = currentEx.sets.some(
        (s) => s.parentSetId === setId && !s.isCompleted
      )

      let shouldTriggerRest = willBeCompleted && !hasUnfinishedChildren

      if (currentEx.supersetGroup && shouldTriggerRest) {
        const groupExercises = prev.filter((e) => e.supersetGroup === currentEx.supersetGroup)
        const totalSetsInGroup = groupExercises.reduce((acc, e) => acc + e.sets.length, 0)
        const completedSetsCount = groupExercises.reduce((acc, e) => {
          return (
            acc +
            e.sets.filter((s) => (s.id === setId ? willBeCompleted : s.isCompleted)).length
          )
        }, 0)

        if (completedSetsCount < totalSetsInGroup) {
          shouldTriggerRest = false
        }
      }

      if (shouldTriggerRest) {
        setRestSeconds(90)
        setIsRestActive(true)
      }

      return prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map((set) => {
            if (set.id !== setId) return set
            return { ...set, isCompleted: !set.isCompleted }
          }),
        }
      })
    })
  }

  const updateSetValue = (
    exerciseId: string,
    setId: string,
    field: 'weight' | 'reps' | 'rir',
    value: number
  ) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
        }
      })
    )
  }

  const cycleSetType = (exerciseId: string, setId: string) => {
    const types: SetType[] = ['normal', 'dropset', 'restpause', 'failure']
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map((s) => {
            if (s.id !== setId) return s
            const currentIndex = types.indexOf(s.setType || 'normal')
            const nextType = types[(currentIndex + 1) % types.length]
            return { ...s, setType: nextType }
          }),
        }
      })
    )
  }

  // AÑADIR SUB-SERIE ENCADENADA (DROP SET / REST-PAUSE)
  const addChainedSubSet = (exerciseId: string, parentSet: ExerciseSet, type: 'dropset' | 'restpause') => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex

        const parentIndex = ex.sets.findIndex((s) => s.id === parentSet.id)
        if (parentIndex === -1) return ex

        // Reducir peso sugerido si es drop set (ej. -25% o -2.5kg)
        const suggestedWeight =
          type === 'dropset'
            ? Math.max(1, Math.round((parentSet.weight * 0.7) * 2) / 2)
            : parentSet.weight

        const newSubSet: ExerciseSet = {
          id: `subset-${Date.now()}`,
          setNumber: parentSet.setNumber, // Mismo número base
          weight: suggestedWeight,
          reps: type === 'dropset' ? Math.max(4, parentSet.reps - 2) : 5,
          rir: 0, // Generalmente al fallo
          isCompleted: false,
          isPr: false,
          setType: type,
          parentSetId: parentSet.id,
        }

        const updatedSets = [...ex.sets]
        // Insertar justo debajo de la serie madre o de sus drops hermanos
        let insertIndex = parentIndex + 1
        while (
          insertIndex < updatedSets.length &&
          updatedSets[insertIndex].parentSetId === parentSet.id
        ) {
          insertIndex++
        }

        updatedSets.splice(insertIndex, 0, newSubSet)
        return { ...ex, sets: updatedSets }
      })
    )
  }

  const updateExerciseNote = (exerciseId: string, noteText: string) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, note: noteText } : ex))
    )
  }

  const toggleSupersetGroup = (exerciseId: string) => {
    const groups = ['', 'A', 'B', 'C']
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const currentIndex = groups.indexOf(ex.supersetGroup || '')
        const nextGroup = groups[(currentIndex + 1) % groups.length]
        return { ...ex, supersetGroup: nextGroup }
      })
    )
  }

  const addSetToExercise = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const rootSets = ex.sets.filter((s) => !s.parentSetId)
        const lastRoot = rootSets[rootSets.length - 1]

        const newSet: ExerciseSet = {
          id: Date.now().toString(),
          setNumber: rootSets.length + 1,
          weight: lastRoot ? lastRoot.weight : 40,
          reps: lastRoot ? lastRoot.reps : 10,
          rir: 1,
          isCompleted: false,
          isPr: false,
          setType: 'normal' as const,
        }
        return { ...ex, sets: [...ex.sets, newSet] }
      })
    )
  }

  const removeSetFromExercise = (exerciseId: string, setId: string, setNumber?: number) => {
    const confirmMsg = setNumber !== undefined
      ? `¿Estás seguro de eliminar la serie #${setNumber}?`
      : '¿Estás seguro de eliminar esta serie?'
    if (!confirm(confirmMsg)) return
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId || ex.sets.length <= 1) return ex

        const filtered = ex.sets.filter((s) => s.id !== setId && s.parentSetId !== setId)

        let currentRootNumber = 0
        const renumbered = filtered.map((s) => {
          if (!s.parentSetId) {
            currentRootNumber++
            return { ...s, setNumber: currentRootNumber }
          }
          return s
        })

        return { ...ex, sets: renumbered }
      })
    )
  }

  const removeExerciseWithConfirm = (exerciseId: string, exerciseName: string) => {
    if (confirm(`¿Estás seguro de quitar "${exerciseName}" de esta sesión?`)) {
      setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId))
    }
  }

  const moveLiveExercise = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= exercises.length) return
    const reordered = [...exercises]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp
    setExercises(reordered)
  }

  const moveModalItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= modalItems.length) return
    const reordered = [...modalItems]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp
    setModalItems(reordered)
  }

  const handleSubstituteExercise = (replacementEx: CatalogExercise) => {
    if (!substitutingExerciseId) return

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== substitutingExerciseId) return ex
        return {
          ...ex,
          exerciseId: replacementEx.id,
          name: replacementEx.name,
          targetMuscle: replacementEx.target_muscle,
          secondaryMuscle: replacementEx.secondary_muscle,
          anatomicalImageUrl: replacementEx.anatomical_image_url || '',
          note: ex.note ? `${ex.note} (Sustituido)` : 'Sustituido en sesión',
        }
      })
    )
    setSubstitutingExerciseId(null)
  }

  const handleAddExerciseToLiveWorkout = (catEx: CatalogExercise) => {
    const newEx: WorkoutExercise = {
      id: `wex-live-${Date.now()}`,
      exerciseId: catEx.id,
      name: catEx.name,
      targetMuscle: catEx.target_muscle,
      secondaryMuscle: catEx.secondary_muscle,
      anatomicalImageUrl: catEx.anatomical_image_url || '',
      previousBest: 'Registrar peso',
      note: 'Añadido extra en sesión',
      sets: [
        { id: `s-live-1`, setNumber: 1, weight: 30, reps: 10, rir: 2, isCompleted: false, isPr: false, setType: 'normal' as const },
        { id: `s-live-2`, setNumber: 2, weight: 30, reps: 10, rir: 1, isCompleted: false, isPr: false, setType: 'normal' as const },
        { id: `s-live-3`, setNumber: 3, weight: 30, reps: 10, rir: 1, isCompleted: false, isPr: false, setType: 'normal' as const },
      ],
    }
    setExercises((prev) => [...prev, newEx])
    setIsAddLiveExerciseOpen(false)
  }

  const handleCreateCustomCatalogExercise = () => {
    if (!newExName.trim()) {
      alert('Ingresa el nombre del ejercicio.')
      return
    }

    const created: CatalogExercise = {
      id: `custom-ex-${Date.now()}`,
      name: newExName.trim(),
      target_muscle: newExMuscle,
      secondary_muscle: newExSecondary.trim() || 'Sinergistas',
      equipment: newExEquipment,
      anatomical_image_url: newExUrl.trim() || '',
    }

    const updated = [created, ...catalog]
    setCatalog(updated)

    try {
      const stored = localStorage.getItem('user_custom_library_exercises')
      const parsed = stored ? JSON.parse(stored) : []
      localStorage.setItem(
        'user_custom_library_exercises',
        JSON.stringify([created, ...parsed])
      )
    } catch (e) {
      console.warn('Error guardando en almacenamiento local:', e)
    }

    setIsNewExerciseModalOpen(false)
    setNewExName('')
    setNewExSecondary('')
    setNewExUrl('')
  }

  const handleStartDay = (day: ProgramDay) => {
    const builtExercises: WorkoutExercise[] = day.items.map((item, idx) => {
      const catEx = catalog.find((c: CatalogExercise) => c.id === item.exerciseId) || catalog[0]

      const sets: ExerciseSet[] = Array.from({ length: item.setsCount }).map((_, sIdx) => ({
        id: `set-${Date.now()}-${idx}-${sIdx}`,
        setNumber: sIdx + 1,
        weight: item.defaultWeight,
        reps: item.defaultReps,
        rir: item.defaultRir,
        isCompleted: false,
        isPr: sIdx === item.setsCount - 1,
        setType: 'normal' as const,
      }))

      return {
        id: `wex-${Date.now()}-${idx}`,
        exerciseId: catEx.id,
        name: catEx.name,
        targetMuscle: catEx.target_muscle,
        secondaryMuscle: catEx.secondary_muscle,
        anatomicalImageUrl: catEx.anatomical_image_url || '',
        previousBest: item.previousBest || `${item.defaultWeight} kg × ${item.defaultReps}`,
        note: item.note || '',
        supersetGroup: item.supersetGroup || '',
        sets,
      }
    })

    setWorkoutName(day.title)
    setExercises(builtExercises)
    setSessionSeconds(0)
    setIsSessionRunning(true)
    setActiveTab('workout')
  }

  const downloadRoutinePlan = () => {
    if (!currentProgram) return
    let textContent = `=====================================\n`
    textContent += `PLAN DE ENTRENAMIENTO: ${currentProgram.name.toUpperCase()}\n`
    textContent += `${currentProgram.description || ''}\n`
    textContent += `=====================================\n\n`

    currentProgram.days.forEach((day) => {
      textContent += `[${day.dayBadge}] ${day.title} (${day.estimatedDuration})\n`
      if (day.subtitle) textContent += `Objetivo: ${day.subtitle}\n`
      textContent += `-------------------------------------\n`
      day.items.forEach((item, iIdx) => {
        const ex = catalog.find((c: CatalogExercise) => c.id === item.exerciseId)
        textContent += `${iIdx + 1}. ${ex?.name || item.exerciseId}\n`
        textContent += `   Series: ${item.setsCount} | Reps: ${item.defaultReps} | Peso: ${item.defaultWeight} kg\n`
        if (item.supersetGroup) textContent += `   SuperSerie: Grupo ${item.supersetGroup}\n`
        if (item.note) textContent += `   Nota: ${item.note}\n`
      })
      textContent += `\n`
    })

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentProgram.name.replace(/\s+/g, '_')}_rutina.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCreateProgram = () => {
    if (!newProgramName.trim()) {
      alert('Ingresa el nombre del programa.')
      return
    }

    const newProg: WorkoutProgram = {
      id: `prog-${Date.now()}`,
      name: newProgramName.trim(),
      description: newProgramDesc.trim() || 'Programa personalizado con días divididos',
      days: [],
    }

    const updated = [...programsList, newProg]
    savePrograms(updated)
    setSelectedProgramId(newProg.id)
    setActiveDayIndex(0)
    setIsCreatingProgram(false)
    setNewProgramName('')
    setNewProgramDesc('')
  }

  const openCreateDayModal = () => {
    setEditingDayId(null)
    setModalDayBadge(`Día ${currentProgram?.days.length ? currentProgram.days.length + 1 : 1}`)
    setModalDayTitle('')
    setModalDaySubtitle('')
    setModalItems([])
    setModalMuscleFilter('Todos')
    setModalSearchQuery('')
    setIsDayModalOpen(true)
  }

  const openEditDayModal = (day: ProgramDay) => {
    setEditingDayId(day.id)
    setModalDayBadge(day.dayBadge)
    setModalDayTitle(day.title)
    setModalDaySubtitle(day.subtitle)
    setModalItems(JSON.parse(JSON.stringify(day.items)))
    setModalMuscleFilter('Todos')
    setModalSearchQuery('')
    setIsDayModalOpen(true)
  }

  const handleDeleteDay = (dayId: string) => {
    if (!confirm('¿Seguro que deseas eliminar este día?')) return

    const updated = programsList.map((prog) => {
      if (prog.id === selectedProgramId) {
        return {
          ...prog,
          days: prog.days.filter((d) => d.id !== dayId),
        }
      }
      return prog
    })

    savePrograms(updated)
    setActiveDayIndex(0)
  }

  const toggleModalExercise = (exId: string) => {
    const exists = modalItems.find((i) => i.exerciseId === exId)
    if (exists) {
      setModalItems(modalItems.filter((i) => i.exerciseId !== exId))
    } else {
      setModalItems([
        ...modalItems,
        {
          exerciseId: exId,
          setsCount: 3,
          defaultReps: 10,
          defaultWeight: 40,
          defaultRir: 1,
          note: '',
          supersetGroup: '',
        },
      ])
    }
  }

  const updateModalItemField = (
    exId: string,
    field: 'setsCount' | 'defaultReps' | 'defaultWeight',
    val: number
  ) => {
    setModalItems(
      modalItems.map((item) =>
        item.exerciseId === exId ? { ...item, [field]: val } : item
      )
    )
  }

  const toggleModalItemSuperset = (exId: string) => {
    const groups = ['', 'A', 'B', 'C']
    setModalItems(
      modalItems.map((item) => {
        if (item.exerciseId !== exId) return item
        const curIdx = groups.indexOf(item.supersetGroup || '')
        const next = groups[(curIdx + 1) % groups.length]
        return { ...item, supersetGroup: next }
      })
    )
  }

  const handleSaveDay = () => {
    if (!modalDayTitle.trim() || modalItems.length === 0) {
      alert('Ingresa el nombre del día y selecciona al menos 1 ejercicio.')
      return
    }

    const updated = programsList.map((prog) => {
      if (prog.id === selectedProgramId) {
        if (editingDayId) {
          return {
            ...prog,
            days: prog.days.map((d) =>
              d.id === editingDayId
                ? {
                    ...d,
                    dayBadge: modalDayBadge.trim(),
                    title: modalDayTitle.trim(),
                    subtitle: modalDaySubtitle.trim() || `${modalItems.length} ejercicios`,
                    items: modalItems,
                  }
                : d
            ),
          }
        } else {
          const newDay: ProgramDay = {
            id: `day-${Date.now()}`,
            dayBadge: modalDayBadge.trim() || `Día ${prog.days.length + 1}`,
            title: modalDayTitle.trim(),
            subtitle: modalDaySubtitle.trim() || `${modalItems.length} ejercicios`,
            estimatedDuration: '60 min',
            items: modalItems,
          }
          return {
            ...prog,
            days: [...prog.days, newDay],
          }
        }
      }
      return prog
    })

    savePrograms(updated)
    setIsDayModalOpen(false)
  }

  // Estadísticas del entrenamiento activo:
  // - Tonelaje: suma TODO (series madre + sub-series drop/rest-pause).
  // - Series efectivas: solo cuenta las series MADRE para no inflar la fatiga del semáforo.
  const workoutStats = useMemo(() => {
    let totalVolume = 0
    let totalCompletedSets = 0
    exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.isCompleted) {
          totalVolume += set.weight * set.reps
          if (!set.parentSetId) {
            totalCompletedSets += 1
          }
        }
      })
    })
    return { totalVolume, totalCompletedSets }
  }, [exercises])

  // Lunes a Domingo de la semana seleccionada
  const weekDays = useMemo(() => {
    if (!selectedDateKey) return []
    const [y, m, d] = selectedDateKey.split('-').map(Number)
    const base = new Date(y, m - 1, d)
    base.setDate(base.getDate() + currentWeekOffset * 7)

    const dayOfWeek = base.getDay()
    const diffToMonday = base.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    const monday = new Date(base.setDate(diffToMonday))

    const days = []
    const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday)
      cur.setDate(monday.getDate() + i)
      const yr = cur.getFullYear()
      const mo = String(cur.getMonth() + 1).padStart(2, '0')
      const dt = String(cur.getDate()).padStart(2, '0')
      days.push({
        name: dayNames[i],
        dayNumber: cur.getDate(),
        dateKey: `${yr}-${mo}-${dt}`,
      })
    }
    return days
  }, [selectedDateKey, currentWeekOffset])

  const currentMonthLabel = useMemo(() => {
    if (weekDays.length === 0) return ''
    const [y, m, d] = weekDays[0].dateKey.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()
  }, [weekDays])

  const workoutDatesSet = useMemo(() => {
    const s = new Set<string>()
    historyList.forEach((w) => {
      if (w.completed_at) {
        s.add(w.completed_at.split('T')[0])
      }
    })
    return s
  }, [historyList])

  const weekStart = weekDays[0]?.dateKey
  const weekEnd = weekDays[6]?.dateKey

  const weekWorkouts = useMemo(() => {
    if (!weekStart || !weekEnd) return []
    return historyList.filter((w) => {
      if (!w.completed_at) return false
      const dKey = w.completed_at.split('T')[0]
      return dKey >= weekStart && dKey <= weekEnd
    })
  }, [historyList, weekStart, weekEnd])

  const selectedDayWorkouts = useMemo(() => {
    if (!selectedDateKey) return []
    return historyList.filter((w) => w.completed_at && w.completed_at.split('T')[0] === selectedDateKey)
  }, [historyList, selectedDateKey])

  // SEMÁFORO DE VOLUMEN SEMANAL POR GRUPO MUSCULAR (SIN RIR)
  const muscleVolumeAnalytics = useMemo(() => {
    const muscleMap: Record<string, { totalSets: number; target: number }> = {
      Espalda: { totalSets: 0, target: 16 },
      Pecho: { totalSets: 0, target: 14 },
      Cuádriceps: { totalSets: 0, target: 14 },
      Isquiosurales: { totalSets: 0, target: 12 },
      Hombros: { totalSets: 0, target: 14 },
      Brazos: { totalSets: 0, target: 14 },
      Glúteos: { totalSets: 0, target: 12 },
    }

    let weekVolume = 0
    let totalWeekSets = 0

    weekWorkouts.forEach((w) => {
      weekVolume += Number(w.total_volume_kg) || 0
      const sets = workoutSetsDetails[w.id] || []

      sets.forEach((s) => {
        totalWeekSets++
        const ex =
          catalog.find((c: CatalogExercise) => c.id === s.exercise_id || c.name === s.exercise_id) ||
          ANATOMICAL_EXERCISES.find((c: CatalogExercise) => c.id === s.exercise_id)

        if (ex) {
          const muscle = ex.target_muscle
          let key = ''
          if (muscle.includes('Espalda')) key = 'Espalda'
          else if (muscle.includes('Pecho')) key = 'Pecho'
          else if (muscle.includes('Cuádriceps') || muscle.includes('Cuadriceps')) key = 'Cuádriceps'
          else if (muscle.includes('Isquio') || muscle.includes('Femoral')) key = 'Isquiosurales'
          else if (muscle.includes('Hombro')) key = 'Hombros'
          else if (muscle.includes('Bíceps') || muscle.includes('Tríceps') || muscle.includes('Brazo')) key = 'Brazos'
          else if (muscle.includes('Glúteo')) key = 'Glúteos'

          if (key && muscleMap[key]) {
            muscleMap[key].totalSets++
          }
        }
      })
    })

    const musclesList = Object.entries(muscleMap).map(([muscleName, data]) => {
      const sets = data.totalSets
      const target = data.target
      const pct = Math.min(100, Math.round((sets / target) * 100))

      let status = 'SIN ENTRENAR'
      let badge = 'bg-neutral-800 text-neutral-400 border-neutral-700'
      let text = '0 series esta semana. Se reinicia cada lunes.'
      let barColor = 'bg-neutral-800'

      if (sets >= 19) {
        status = 'MÁXIMO / POSIBLE SOBRECARGA'
        badge = 'bg-red-500/20 text-red-400 border-red-500/40'
        text = 'Límite recuperable semanal alcanzado (MRV). Considera no añadir más series.'
        barColor = 'bg-red-500'
      } else if (sets >= 9) {
        status = 'VOLUMEN ÓPTIMO'
        badge = 'bg-lime-400/20 text-lime-400 border-lime-400/40'
        text = 'Rango ideal de hipertrofia muscular (10 a 18 series por semana).'
        barColor = 'bg-lime-400'
      } else if (sets >= 1) {
        status = 'MANTENIMIENTO'
        badge = 'bg-blue-500/20 text-blue-400 border-blue-500/40'
        text = 'Volumen bajo/mantenimiento. Tienes margen para meter más series efectivas.'
        barColor = 'bg-blue-400'
      }

      return {
        muscleName,
        sets,
        target,
        pct,
        status,
        badge,
        text,
        barColor,
      }
    })

    return {
      weekVolume,
      totalWeekSets,
      musclesList,
    }
  }, [weekWorkouts, workoutSetsDetails, catalog])

  const currentProgram = useMemo(() => {
    return programsList.find((p) => p.id === selectedProgramId) || programsList[0]
  }, [programsList, selectedProgramId])

  const currentDay = useMemo(() => {
    if (!currentProgram || currentProgram.days.length === 0) return null
    return currentProgram.days[activeDayIndex] || currentProgram.days[0]
  }, [currentProgram, activeDayIndex])

  const filteredModalExercises = useMemo(() => {
    return catalog.filter((ex: CatalogExercise) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
        ex.target_muscle.toLowerCase().includes(modalSearchQuery.toLowerCase())
      const matchesMuscle =
        modalMuscleFilter === 'Todos' ||
        ex.target_muscle.toLowerCase().includes(modalMuscleFilter.toLowerCase())
      return matchesSearch && matchesMuscle
    })
  }, [catalog, modalSearchQuery, modalMuscleFilter])

  const filteredLibraryExercises = useMemo(() => {
    return catalog.filter((ex: CatalogExercise) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
        ex.target_muscle.toLowerCase().includes(librarySearchQuery.toLowerCase())
      const matchesMuscle =
        libraryMuscleFilter === 'Todos' ||
        ex.target_muscle.toLowerCase().includes(libraryMuscleFilter.toLowerCase())
      return matchesSearch && matchesMuscle
    })
  }, [catalog, librarySearchQuery, libraryMuscleFilter])

  const filteredLiveExercises = useMemo(() => {
    return catalog.filter((ex: CatalogExercise) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(liveSearchQuery.toLowerCase()) ||
        ex.target_muscle.toLowerCase().includes(liveSearchQuery.toLowerCase())
      const matchesMuscle =
        liveMuscleFilter === 'Todos' ||
        ex.target_muscle.toLowerCase().includes(liveMuscleFilter.toLowerCase())
      return matchesSearch && matchesMuscle
    })
  }, [catalog, liveSearchQuery, liveMuscleFilter])

  const filteredHistoryExercises = useMemo(() => {
    return catalog.filter(
      (ex: CatalogExercise) =>
        ex.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        ex.target_muscle.toLowerCase().includes(historySearchQuery.toLowerCase())
    )
  }, [catalog, historySearchQuery])

  const groupedWorkoutSets = useMemo(() => {
    if (!expandedWorkoutId || !workoutSetsDetails[expandedWorkoutId]) return []
    const rawSets = workoutSetsDetails[expandedWorkoutId]

    const groups: { exerciseName: string; exerciseInfo?: CatalogExercise; sets: any[] }[] = []

    rawSets.forEach((s) => {
      const exInfo =
        catalog.find(
          (c: CatalogExercise) =>
            c.id === s.exercise_id ||
            c.name.toLowerCase() === (s.exercise_id || '').toLowerCase()
        ) ||
        ANATOMICAL_EXERCISES.find(
          (c: CatalogExercise) =>
            c.id === s.exercise_id ||
            c.name.toLowerCase() === (s.exercise_id || '').toLowerCase()
        )

      const name = exInfo ? exInfo.name : s.exercise_id || 'Ejercicio Registrado'

      let grp = groups.find((g) => g.exerciseName === name)
      if (!grp) {
        grp = { exerciseName: name, exerciseInfo: exInfo, sets: [] }
        groups.push(grp)
      }
      grp.sets.push(s)
    })

    return groups
  }, [expandedWorkoutId, workoutSetsDetails, catalog])

  const handleSaveWorkout = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const supabase = createClient()
      if (!supabase || !user) {
        alert('Debes iniciar sesión para guardar tus datos.')
        setIsSaving(false)
        return
      }

      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          name: workoutName.trim() || 'Sesión de Entrenamiento',
          total_volume_kg: workoutStats.totalVolume,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (workoutError) {
        alert('Error en Supabase: ' + workoutError.message)
        setIsSaving(false)
        return
      }

      if (workout?.id) {
        const setsToInsert = exercises.flatMap((ex) =>
          ex.sets
            .filter((s) => s.isCompleted)
            .map((s, idx) => ({
              workout_id: workout.id,
              exercise_id: String(ex.exerciseId),
              set_number: idx + 1,
              weight_kg: s.weight,
              reps: s.reps,
              rir: s.rir,
              is_pr: s.isPr,
              set_type: s.setType || 'normal',
            }))
        )

        if (setsToInsert.length > 0) {
          await supabase.from('workout_sets').insert(setsToInsert)
          localStorage.setItem(`workout_sets_${workout.id}`, JSON.stringify(setsToInsert))
          setWorkoutSetsDetails((prev) => ({ ...prev, [workout.id]: setsToInsert }))
        }
      }

      localStorage.removeItem('active_workout_backup')
      setInterruptedWorkout(null)

      setSaveSuccess(true)
      await loadHistory(true)
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 max-w-md mx-auto pb-28">
      {/* ================= 1. INICIO ================= */}
      {activeTab === 'home' && (
        <div className="space-y-4">
          <header className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Tracker Personal
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                Panel Principal
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 hover:text-red-400 transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-3 py-1 text-right">
                <span className="text-[9px] uppercase font-bold text-neutral-400 block">Peso</span>
                <div className="flex items-center justify-end gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={bodyWeightKg === 0 ? '' : bodyWeightKg}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value
                      if (/^\d*\.?\d*$/.test(val)) {
                        setBodyWeightKg(val === '' ? 0 : Number(val))
                      }
                    }}
                    className="w-12 bg-transparent text-right font-mono font-extrabold text-sm text-lime-400 focus:outline-none"
                  />
                  <span className="text-xs font-bold text-neutral-400">kg</span>
                </div>
              </div>
            </div>
          </header>

          {/* ================= CALENDARIO SEMANAL INTERACTIVO ================= */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3.5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                className="p-1.5 bg-neutral-950 border border-neutral-800 hover:border-lime-400 text-neutral-400 hover:text-white rounded-xl transition"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-neutral-400 block">
                  {currentWeekOffset === 0 ? 'Semana Actual (L - D)' : currentWeekOffset === -1 ? 'Semana Pasada' : `Hace ${Math.abs(currentWeekOffset)} semanas`}
                </span>
                <span className="text-xs font-extrabold text-lime-400">{currentMonthLabel}</span>
              </div>

              <button
                onClick={() => setCurrentWeekOffset((prev) => Math.min(0, prev + 1))}
                disabled={currentWeekOffset >= 0}
                className="p-1.5 bg-neutral-950 border border-neutral-800 hover:border-lime-400 text-neutral-400 hover:text-white disabled:opacity-30 rounded-xl transition"
                title="Semana siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {weekDays.map((item) => {
                const isSelected = selectedDateKey === item.dateKey
                const hasWorkout = workoutDatesSet.has(item.dateKey)

                return (
                  <button
                    key={item.dateKey}
                    onClick={() => setSelectedDateKey(item.dateKey)}
                    className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition border ${
                      isSelected
                        ? 'bg-lime-400 text-neutral-950 border-lime-400 font-extrabold shadow-md'
                        : 'bg-neutral-950/70 border-neutral-800/80 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold opacity-80">{item.name}</span>
                    <span className="text-sm font-extrabold font-mono mt-0.5">{item.dayNumber}</span>
                    <div
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        hasWorkout ? (isSelected ? 'bg-neutral-950' : 'bg-lime-400') : 'bg-transparent'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            {/* VISTA DINÁMICA DEL DÍA SELECCIONADO EN EL CALENDARIO */}
            <div className="pt-2 border-t border-neutral-800/80">
              {selectedDayWorkouts.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                    Entrenamiento del {selectedDateKey}:
                  </span>
                  {selectedDayWorkouts.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => {
                        setActiveTab('history')
                        toggleWorkoutDetails(w.id)
                      }}
                      className="bg-neutral-950 p-2.5 rounded-2xl border border-lime-400/40 hover:border-lime-400 flex items-center justify-between cursor-pointer transition shadow-md"
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-lime-400" />
                          {w.name}
                        </div>
                        <span className="text-[10px] text-lime-400 font-mono font-bold block mt-0.5">
                          Volumen: {w.total_volume_kg} kg
                        </span>
                      </div>
                      <button className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 text-xs font-bold text-neutral-200 rounded-xl flex items-center gap-1">
                        Ver Detalles <ChevronRight className="w-3 h-3 text-lime-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-neutral-500 text-xs">
                  Sin entrenamientos registrados el {selectedDateKey || 'este día'} (Descanso).
                </div>
              )}
            </div>
          </div>

          {/* BANNER DE ENTRENAMIENTO INTERRUMPIDO */}
          {interruptedWorkout && (
            <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3.5 space-y-2.5 shadow-xl">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400 block">
                    Sesión no terminada
                  </span>
                  <h4 className="text-xs font-bold text-white truncate">{interruptedWorkout.workoutName}</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Tiempo: {formatTime(interruptedWorkout.sessionSeconds)} • {interruptedWorkout.exercises?.reduce((acc, ex) => acc + ex.sets.filter(s => s.isCompleted && !s.parentSetId).length, 0)} series listas
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleResumeWorkout}
                  className="flex-1 py-2 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reanudar Sesión
                </button>
                <button
                  onClick={handleDiscardBackup}
                  className="px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 text-xs font-bold rounded-xl transition"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Banner sesión activa */}
          {(!interruptedWorkout && (sessionSeconds > 0 || workoutStats.totalCompletedSets > 0)) && (
            <div
              onClick={() => setActiveTab('workout')}
              className="bg-lime-400/10 border border-lime-400/40 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:bg-lime-400/15 transition shadow-lg"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-lime-400 block">
                    Sesión activa • {formatTime(sessionSeconds)}
                  </span>
                  <h3 className="text-xs font-bold text-white truncate max-w-[200px]">{workoutName}</h3>
                </div>
              </div>
              <button className="px-2.5 py-1 bg-lime-400 text-neutral-950 font-bold text-xs rounded-xl">
                Continuar →
              </button>
            </div>
          )}

          {/* ================= SEMÁFORO DE VOLUMEN SEMANAL POR GRUPO MUSCULAR ================= */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-lime-400/10 text-lime-400 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-neutral-400 block">
                    Semáforo de Volumen Semanal
                  </span>
                  <h3 className="text-sm font-extrabold text-white">Series Efectivas (Lunes a Domingo)</h3>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold text-neutral-400">
                Se reinicia los lunes
              </span>
            </div>

            <div className="space-y-3">
              {muscleVolumeAnalytics.musclesList.map((m) => (
                <div key={m.muscleName} className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {m.muscleName}
                      <span className="text-[11px] font-mono text-lime-400 font-extrabold">
                        {m.sets} / {m.target} series
                      </span>
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${m.badge}`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full transition-all duration-500 ${m.barColor}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-neutral-400 leading-tight">{m.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ================= CALCULADORA DE 1RM BIDIRECCIONAL ================= */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-lime-400" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Calculadora 1RM y Peso según Reps
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Fórmula Epley</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">Peso Levantado (kg)</label>
                <input
                  type="number"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 font-mono text-sm text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">Reps Logradas</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={calcReps}
                  onChange={(e) => setCalcReps(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 font-mono text-sm text-white focus:outline-none focus:border-lime-400"
                />
              </div>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-2xl border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-500 block">Tu 1RM Estimado</span>
                <span className="text-xl font-extrabold font-mono text-lime-400">{estimated1RMCalc} kg</span>
              </div>

              <div className="text-right text-[10px] font-mono space-y-0.5">
                <div className="text-neutral-300">90%: <span className="text-white font-bold">{Math.round(estimated1RMCalc * 0.9)} kg</span></div>
                <div className="text-neutral-400">80%: <span className="text-white font-bold">{Math.round(estimated1RMCalc * 0.8)} kg</span></div>
                <div className="text-neutral-500">70%: <span className="text-white font-bold">{Math.round(estimated1RMCalc * 0.7)} kg</span></div>
              </div>
            </div>

            <div className="bg-neutral-950/80 p-3 rounded-2xl border border-lime-400/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-extrabold text-lime-400 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" /> Peso sugerido por Reps Objetivo:
                </span>
                <select
                  value={targetRepsGoal}
                  onChange={(e) => setTargetRepsGoal(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-700 text-white font-bold text-xs rounded-lg px-2 py-1 focus:border-lime-400"
                >
                  {[3, 5, 6, 8, 10, 12, 15, 20].map((num) => (
                    <option key={num} value={num}>Para {num} reps</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-300">
                  Para completar <span className="font-bold text-white">{targetRepsGoal} repeticiones</span> debes cargar:
                </span>
                <span className="text-lg font-mono font-extrabold text-lime-400 bg-lime-400/10 px-2.5 py-0.5 rounded-xl border border-lime-400/30">
                  {targetWeightForReps} kg
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. RUTINAS ================= */}
      {activeTab === 'routines' && (
        <div className="space-y-4">
          <header className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold">
                Gestor de Programas
              </span>
              <h1 className="text-xl font-extrabold text-white">Mis Rutinas</h1>
            </div>

            <button
              onClick={() => setIsCreatingProgram(true)}
              className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-md transition"
            >
              <FolderPlus className="w-3.5 h-3.5" /> + Nueva Rutina
            </button>
          </header>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {programsList.map((prog) => (
              <button
                key={prog.id}
                onClick={() => {
                  setSelectedProgramId(prog.id)
                  setActiveDayIndex(0)
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  selectedProgramId === prog.id
                    ? 'bg-lime-400 text-neutral-950 border-lime-400 shadow-md'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {prog.name} ({prog.days.length} días)
              </button>
            ))}
          </div>

          {currentProgram && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div>
                  <h2 className="text-base font-extrabold text-white">{currentProgram.name}</h2>
                  <p className="text-[11px] text-neutral-400">{currentProgram.description}</p>
                </div>

                <button
                  onClick={openCreateDayModal}
                  className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 hover:border-lime-400 text-lime-400 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" /> Añadir Día
                </button>
              </div>

              {currentProgram.days.length > 0 ? (
                <>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {currentProgram.days.map((day, idx) => (
                      <button
                        key={day.id}
                        onClick={() => setActiveDayIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition border ${
                          activeDayIndex === idx
                            ? 'bg-neutral-950 border-lime-400 text-lime-400'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {day.dayBadge}
                      </button>
                    ))}
                  </div>

                  {currentDay && (
                    <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30">
                              {currentDay.dayBadge}
                            </span>
                            <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-lime-400" /> {currentDay.estimatedDuration}
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-white mt-1.5">{currentDay.title}</h3>
                          <p className="text-[11px] text-neutral-400">{currentDay.subtitle}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditDayModal(currentDay)}
                            className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
                            title="Editar y ordenar ejercicios"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDay(currentDay.id)}
                            className="p-1.5 bg-neutral-900 hover:bg-red-950 text-neutral-500 hover:text-red-400 rounded-lg transition"
                            title="Eliminar este día"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-neutral-800/80">
                        {currentDay.items.map((item, idx) => {
                          const exInfo = catalog.find((c: CatalogExercise) => c.id === item.exerciseId) || catalog[0]

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedPreview(exInfo)}
                              className={`flex items-center justify-between bg-neutral-900 border p-2 rounded-xl cursor-pointer ${
                                item.supersetGroup ? 'border-l-4 border-l-lime-400 border-neutral-800' : 'border-neutral-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-11 rounded-lg bg-neutral-950 border border-neutral-800 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                                  <AnatomicalImage
                                    src={exInfo.anatomical_image_url || ''}
                                    alt={exInfo.name}
                                    targetMuscle={exInfo.target_muscle}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                    {idx + 1}. {exInfo.name}
                                    {item.supersetGroup && (
                                      <span className="text-[9px] uppercase font-mono px-1 rounded bg-lime-400/20 text-lime-400">
                                        SuperSerie {item.supersetGroup}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-lime-400 truncate">
                                    {exInfo.target_muscle}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0 ml-2">
                                <span className="text-xs font-mono font-bold text-white block">
                                  {item.setsCount} × {item.defaultReps}
                                </span>
                                <span className="text-[10px] font-mono text-neutral-400">
                                  {item.defaultWeight} kg
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <button
                        onClick={() => handleStartDay(currentDay)}
                        className="w-full mt-2 py-3 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4 fill-neutral-950" /> Iniciar {currentDay.title}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6 bg-neutral-950 rounded-2xl p-4">
                  <p className="text-xs text-neutral-400">Esta rutina no tiene días configurados.</p>
                  <button
                    onClick={openCreateDayModal}
                    className="mt-2 text-xs text-lime-400 font-bold underline"
                  >
                    + Añadir el primer día
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= 3. ENTRENAR CON SUB-SERIES ENCADENADAS ================= */}
      {activeTab === 'workout' && (
        <div>
          {!isSessionRunning && exercises.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl">
                <Dumbbell className="w-10 h-10 text-lime-400 animate-pulse" />
              </div>

              <div className="space-y-1.5 px-4">
                <h2 className="text-lg font-extrabold text-white">No hay ninguna sesión activa</h2>
                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                  Selecciona una rutina para comenzar o inicia un entrenamiento libre.
                </p>
              </div>

              <div className="w-full space-y-3 pt-4">
                <button
                  onClick={() => setActiveTab('routines')}
                  className="w-full py-3.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <ClipboardList className="w-4 h-4" /> Elegir Rutina para Entrenar
                </button>

                <button
                  onClick={() => {
                    setWorkoutName('Entrenamiento Libre')
                    setExercises([])
                    setSessionSeconds(0)
                    setIsSessionRunning(true)
                  }}
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-lime-400 text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-lime-400" /> Comenzar Entrenamiento Libre
                </button>
              </div>
            </div>
          ) : (
            <div>
              <header className="border-b border-neutral-800 pb-3.5 mb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold block">
                  Sesión en vivo • {workoutStats.totalVolume} kg
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="text"
                    value={workoutName}
                    onChange={(e) => setWorkoutName(e.target.value)}
                    className="bg-transparent text-lg font-extrabold text-neutral-100 focus:outline-none focus:border-b focus:border-lime-400 w-full truncate"
                  />
                  <Edit3 className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl font-mono text-sm font-semibold text-lime-400">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(sessionSeconds)}
                </div>
                <button
                  onClick={() => setIsSessionRunning(!isSessionRunning)}
                  className={`p-2 border rounded-xl transition ${
                    isSessionRunning
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-lime-400 border-lime-400 text-neutral-950 font-bold'
                  }`}
                  title={isSessionRunning ? 'Pausar' : 'Iniciar'}
                >
                  {isSessionRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-neutral-950" />}
                </button>
                <button
                  onClick={() => {
                    setIsSessionRunning(false)
                    setIsSummaryOpen(true)
                  }}
                  className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs rounded-xl transition"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-4">
            {exercises.map((ex, index) => {
              const best1RM = Math.max(...ex.sets.map((s) => calculate1RM(s.weight, s.reps)), 0)
              const hasSuperset = Boolean(ex.supersetGroup)

              return (
                <section
                  key={ex.id}
                  className={`bg-neutral-900 border rounded-2xl p-4 shadow-xl transition ${
                    hasSuperset ? 'border-l-4 border-l-lime-400 border-neutral-800' : 'border-neutral-800/80'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setSelectedPreview(catalog.find((c: CatalogExercise) => c.id === ex.exerciseId) || null)}
                        className="relative w-18 h-20 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 cursor-pointer shadow-md flex items-center justify-center p-1"
                      >
                        <AnatomicalImage
                          src={ex.anatomicalImageUrl}
                          alt={ex.name}
                          targetMuscle={ex.targetMuscle}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          {hasSuperset && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-lime-400 text-neutral-950 font-mono">
                              BISERIE {ex.supersetGroup}
                            </span>
                          )}
                          <h2 className="text-base font-bold text-white leading-tight">{ex.name}</h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-lime-400 border border-neutral-700/60">
                            {ex.targetMuscle}
                          </span>
                          {best1RM > 0 && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-300 border border-neutral-800">
                              1RM: {best1RM} kg
                            </span>
                          )}
                          <button
                            onClick={() => toggleSupersetGroup(ex.id)}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 flex items-center gap-1"
                            title="Vincular a superserie A, B, C..."
                          >
                            <Link2 className="w-3 h-3 text-lime-400" />
                            {ex.supersetGroup ? `Biserie ${ex.supersetGroup}` : '+ Biserie'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSubstitutingExerciseId(ex.id)}
                        className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 text-lime-400 border border-neutral-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                        title="Sustituir por otro ejercicio solo en esta sesión"
                      >
                        <RefreshCw className="w-3 h-3" /> Sustituir
                      </button>
                      <button
                        onClick={() => moveLiveExercise(index, 'up')}
                        disabled={index === 0}
                        className="p-1 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 text-neutral-400 rounded-lg transition"
                        title="Subir"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveLiveExercise(index, 'down')}
                        disabled={index === exercises.length - 1}
                        className="p-1 bg-neutral-950 hover:bg-neutral-800 disabled:opacity-30 text-neutral-400 rounded-lg transition"
                        title="Bajar"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeExerciseWithConfirm(ex.id, ex.name)}
                        className="p-1 bg-neutral-950 hover:bg-red-950/60 text-neutral-500 hover:text-red-400 rounded-lg transition ml-1"
                        title="Quitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2 py-1 rounded-lg border border-neutral-800/60">
                      <MessageSquare className="w-3 h-3 text-lime-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="+ Añadir nota (ej. biserie con laterales, molestia, máquina ocupada...)"
                        value={ex.note || ''}
                        onChange={(e) => updateExerciseNote(ex.id, e.target.value)}
                        className="w-full bg-transparent text-[11px] text-neutral-300 focus:text-white placeholder-neutral-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 text-[10px] text-neutral-400 uppercase font-semibold mb-1 px-1 text-center">
                    <span className="col-span-2 text-left">Serie</span>
                    <span className="col-span-3">Kg</span>
                    <span className="col-span-3">Reps</span>
                    <span className="col-span-2">RIR</span>
                    <span className="col-span-2 text-right">Listo</span>
                  </div>

                  <div className="space-y-1.5">
                    {ex.sets.map((set) => {
                      const isChild = Boolean(set.parentSetId)

                      return (
                        <div key={set.id} className="space-y-1">
                          <div
                            className={`grid grid-cols-12 items-center gap-2 p-2 rounded-xl transition ${
                              isChild
                                ? 'ml-4 bg-neutral-950/80 border-l-2 border-l-orange-500/70 border-y border-r border-neutral-800'
                                : set.isCompleted
                                ? 'bg-neutral-950/60 border border-neutral-800 opacity-80'
                                : 'bg-neutral-800/60 border border-neutral-700/60'
                            }`}
                          >
                            <div className="col-span-2 flex flex-col justify-center">
                              <div className="flex items-center gap-1 font-bold text-xs text-neutral-300">
                                {isChild && <CornerDownRight className="w-3 h-3 text-orange-400 shrink-0" />}
                                <span className="font-bold text-xs text-neutral-300">{isChild ? `#${set.setNumber}A` : `#${set.setNumber}`}</span>
                                {set.isPr && <Trophy className="w-3 h-3 text-yellow-400 inline" />}
                              </div>
                              <button
                                type="button"
                                onClick={() => cycleSetType(ex.id, set.id)}
                                className={`text-[8px] uppercase font-mono px-1 py-0.5 rounded text-left mt-0.5 truncate ${
                                  set.setType === 'dropset'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : set.setType === 'restpause'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : set.setType === 'failure'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                              >
                                {set.setType === 'dropset'
                                  ? 'Drop'
                                  : set.setType === 'restpause'
                                  ? 'R-Pause'
                                  : set.setType === 'failure'
                                  ? 'Fallo'
                                  : 'Normal'}
                              </button>
                            </div>

                            <div className="col-span-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                disabled={set.isCompleted}
                                value={set.weight === 0 ? '' : set.weight}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (/^\d*\.?\d*$/.test(val)) {
                                    updateSetValue(ex.id, set.id, 'weight', val === '' ? 0 : Number(val))
                                  }
                                }}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-lime-400"
                              />
                            </div>

                            <div className="col-span-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                disabled={set.isCompleted}
                                value={set.reps === 0 ? '' : set.reps}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (/^\d*$/.test(val)) {
                                    updateSetValue(ex.id, set.id, 'reps', val === '' ? 0 : Number(val))
                                  }
                                }}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-lime-400"
                              />
                            </div>

                            <div className="col-span-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                disabled={set.isCompleted}
                                value={set.rir}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const val = e.target.value
                                  if (/^\d*$/.test(val)) {
                                    updateSetValue(ex.id, set.id, 'rir', val === '' ? 0 : Number(val))
                                  }
                                }}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-lime-400"
                              />
                            </div>

                            <div className="col-span-2 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => removeSetFromExercise(ex.id, set.id, set.setNumber)}
                              className="p-1.5 text-neutral-500 hover:text-red-400 transition"
                              title="Eliminar serie"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleSetComplete(ex.id, set.id)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                                set.isCompleted ? 'bg-lime-400 text-neutral-950 font-bold shadow-md' : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              <Check className="w-5 h-5 stroke-[2.5]" />
                            </button>
                          </div>
                          </div>

                          {/* BOTONES PARA ENLAZAR DROP SET O REST PAUSE DIRECTO BAJO LA SERIE MADRE */}
                          {!isChild && (
                            <div className="flex justify-end gap-1 px-1">
                              <button
                                type="button"
                                onClick={() => addChainedSubSet(ex.id, set, 'dropset')}
                                className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1 transition"
                                title="Encadenar bajada de peso sin descanso"
                              >
                                <CornerDownRight className="w-2.5 h-2.5" /> + Drop Set
                              </button>
                              <button
                                type="button"
                                onClick={() => addChainedSubSet(ex.id, set, 'restpause')}
                                className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 transition"
                                title="Encadenar micropausa de 15s con el mismo peso"
                              >
                                <CornerDownRight className="w-2.5 h-2.5" /> + Rest-Pause
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => addSetToExercise(ex.id)}
                    className="mt-2.5 w-full py-2 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 flex items-center justify-center gap-1 text-xs font-semibold text-neutral-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir Serie Principal
                  </button>
                </section>
              )
            })}

            <button
              onClick={() => setIsAddLiveExerciseOpen(true)}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 border-2 border-dashed border-lime-400/40 hover:border-lime-400 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-lime-400 transition shadow-lg"
            >
              <Dumbbell className="w-4 h-4" /> + Añadir / Recuperar Ejercicio a esta Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )}

      {/* ================= 4. HISTORIAL ================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <header className="border-b border-neutral-800 pb-4 mb-4">
            <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold">Registros Personales</span>
            <h1 className="text-xl font-extrabold text-neutral-100">Historial de Sesiones</h1>
          </header>

          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-lime-400 mb-2" />
              Cargando tus registros...
            </div>
          ) : historyList.length > 0 ? (
            <div className="space-y-3">
              {historyList.map((item) => {
                const isExpanded = expandedWorkoutId === item.id

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleWorkoutDetails(item.id)}
                    className={`bg-neutral-900 border rounded-2xl p-4 shadow-lg cursor-pointer transition ${
                      isExpanded ? 'border-lime-400/50' : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-lime-400" />
                          <span className="text-xs text-neutral-400">
                            {new Date(item.completed_at).toLocaleDateString('es-ES', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block">Volumen</span>
                          <span className="text-base font-extrabold font-mono text-lime-400">{item.total_volume_kg || 0} kg</span>
                        </div>

                        <button
                          onClick={(e) => openEditWorkoutModal(item, e)}
                          className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
                          title="Editar sesión completa y ejercicios"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={(e) => deleteWorkout(item.id, e)}
                          className="p-1.5 bg-neutral-950 hover:bg-red-950/60 text-neutral-500 hover:text-red-400 rounded-lg transition"
                          title="Eliminar sesión"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <ChevronRight
                          className={`w-4 h-4 text-neutral-400 transition-transform ${
                            isExpanded ? 'rotate-90 text-lime-400' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-3.5 border-t border-neutral-800 space-y-3.5">
                        {isLoadingSets && groupedWorkoutSets.length === 0 ? (
                          <div className="py-2 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-400" /> Cargando desglose...
                          </div>
                        ) : groupedWorkoutSets.length > 0 ? (
                          groupedWorkoutSets.map((grp, gIdx) => (
                            <div key={gIdx} className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800/80 space-y-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-9 rounded-lg bg-neutral-900 border border-neutral-800 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                                  <AnatomicalImage
                                    src={grp.exerciseInfo?.anatomical_image_url || ''}
                                    alt={grp.exerciseName}
                                    targetMuscle={grp.exerciseInfo?.target_muscle || 'General'}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-white">{grp.exerciseName}</h4>
                                  {grp.exerciseInfo && (
                                    <span className="text-[10px] text-lime-400 font-semibold">{grp.exerciseInfo.target_muscle}</span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="grid grid-cols-12 text-[9px] text-neutral-500 uppercase font-bold px-2 text-center">
                                  <span className="col-span-3 text-left">Serie</span>
                                  <span className="col-span-4">Carga</span>
                                  <span className="col-span-3">Reps</span>
                                  <span className="col-span-2 text-right">RIR</span>
                                </div>

                                {grp.sets.map((s: any, sIdx: number) => (
                                  <div
                                    key={s.id || sIdx}
                                    className="grid grid-cols-12 items-center bg-neutral-900 px-2 py-1.5 rounded-lg text-xs font-mono text-center"
                                  >
                                    <span className="col-span-3 text-left text-neutral-300 font-sans font-bold flex items-center gap-1">
                                      #{s.set_number || sIdx + 1}
                                      {s.set_type === 'dropset' && (
                                        <span className="text-[8px] uppercase font-mono px-1 py-0.5 rounded bg-orange-500/20 text-orange-400">
                                          DROP
                                        </span>
                                      )}
                                      {s.set_type === 'restpause' && (
                                        <span className="text-[8px] uppercase font-mono px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                          RP
                                        </span>
                                      )}
                                      {s.set_type === 'failure' && (
                                        <span className="text-[8px] uppercase font-mono px-1 py-0.5 rounded bg-red-500/20 text-red-400">
                                          FALLO
                                        </span>
                                      )}
                                      {s.is_pr && <Trophy className="w-3 h-3 text-yellow-400 inline" />}
                                    </span>
                                    <span className="col-span-4 text-lime-400 font-bold">{s.weight_kg} kg</span>
                                    <span className="col-span-3 text-white font-bold">{s.reps} reps</span>
                                    <span className="col-span-2 text-right text-neutral-400">RIR {s.rir ?? '-'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-2 text-center text-xs text-neutral-500">No hay series registradas en esta sesión.</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6">
              <History className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-neutral-300">No hay sesiones aún</h3>
            </div>
          )}
        </div>
      )}

      {/* ================= 5. BIBLIOTECA ================= */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <header className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold">Enciclopedia Completa</span>
              <h1 className="text-xl font-extrabold text-neutral-100">Biblioteca ({catalog.length})</h1>
            </div>

            <button
              onClick={() => setIsNewExerciseModalOpen(true)}
              className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md transition"
            >
              <PlusCircle className="w-3.5 h-3.5" /> + Crear
            </button>
          </header>

          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                placeholder="Buscar por ejercicio o músculo..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {MUSCLE_FILTER_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => setLibraryMuscleFilter(m)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                    libraryMuscleFilter === m
                      ? 'bg-lime-400 text-neutral-950 border-lime-400'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredLibraryExercises.map((item: CatalogExercise) => (
              <div key={item.id} className="w-full p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setSelectedPreview(item)}>
                  <div className="w-14 h-16 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                    <AnatomicalImage src={item.anatomical_image_url || ''} alt={item.name} targetMuscle={item.target_muscle} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">{item.name}</div>
                    <div className="text-xs text-lime-400">{item.target_muscle} • {item.equipment}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL DE RECUPERACIÓN DE SESIÓN (AUTOGUARDADO) ================= */}
      {isInterruptedModalOpen && interruptedWorkout && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6 animate-spin" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-extrabold text-white">¿Reanudar sesión en curso?</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Se detectó una sesión previa sin terminar:
              </p>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 mt-2.5 text-xs font-bold text-lime-400">
                {interruptedWorkout.workoutName} • {formatTime(interruptedWorkout.sessionSeconds)}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleResumeWorkout}
                className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 stroke-[3]" /> Sí, reanudar entrenamiento
              </button>
              <button
                onClick={handleDiscardBackup}
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition"
              >
                Descartar y empezar de cero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR SESIÓN PASADA ================= */}
      {editingWorkout && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-lime-400" /> Editar Sesión Completa
              </h3>
              <button onClick={() => setEditingWorkout(null)} className="p-1 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-3.5 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">Nombre de la Sesión</label>
                <input
                  type="text"
                  value={editingWorkout.name}
                  onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400 font-bold"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setIsAddingExerciseToHistory(!isAddingExerciseToHistory)}
                  className="w-full py-2 bg-neutral-950 border border-dashed border-lime-400/50 hover:border-lime-400 text-lime-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" /> + Añadir Ejercicio a esta sesión
                </button>
              </div>

              {isAddingExerciseToHistory && (
                <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar ejercicio..."
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {filteredHistoryExercises.slice(0, 15).map((catEx: CatalogExercise) => (
                      <div
                        key={catEx.id}
                        onClick={() => handleAddExerciseToHistorySession(catEx)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex justify-between items-center cursor-pointer text-xs"
                      >
                        <span className="font-bold text-white truncate max-w-[190px]">{catEx.name}</span>
                        <Plus className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-400 block">
                  Ejercicios en esta sesión ({editingGroupedExercises.length})
                </span>

                {editingGroupedExercises.map((grp, gIdx) => (
                  <div key={grp.exerciseId || gIdx} className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 space-y-2">
                    <div className="flex justify-between items-center border-b border-neutral-800/60 pb-1.5">
                      <div className="truncate pr-1">
                        <span className="text-xs font-bold text-white block truncate">
                          {gIdx + 1}. {grp.exerciseName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveHistoryExercise(gIdx, 'up')}
                          disabled={gIdx === 0}
                          className="p-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 rounded"
                          title="Subir posición"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveHistoryExercise(gIdx, 'down')}
                          disabled={gIdx === editingGroupedExercises.length - 1}
                          className="p-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 rounded"
                          title="Bajar posición"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeHistoryExerciseGroup(gIdx)}
                          className="p-1 bg-neutral-900 hover:bg-red-950/60 text-neutral-500 hover:text-red-400 rounded ml-1"
                          title="Quitar este ejercicio completo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {grp.sets.map((s, sIdx) => (
                        <div key={s.id || sIdx} className="grid grid-cols-12 items-center gap-1.5 bg-neutral-900/90 p-1.5 rounded-xl border border-neutral-800">
                          <span className="col-span-2 text-center font-bold text-xs text-neutral-300 font-mono">
                            #{s.set_number || sIdx + 1}
                          </span>

                          <div className="col-span-3">
                            <input
                              type="number"
                              value={s.weight_kg}
                              onChange={(e) => updateHistorySetValue(gIdx, sIdx, 'weight_kg', Number(e.target.value))}
                              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1 text-center font-bold text-lime-400 text-xs focus:border-lime-400"
                            />
                          </div>

                          <div className="col-span-3">
                            <input
                              type="number"
                              value={s.reps}
                              onChange={(e) => updateHistorySetValue(gIdx, sIdx, 'reps', Number(e.target.value))}
                              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1 text-center font-bold text-white text-xs focus:border-lime-400"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              value={s.rir}
                              onChange={(e) => updateHistorySetValue(gIdx, sIdx, 'rir', Number(e.target.value))}
                              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1 text-center font-bold text-neutral-400 text-xs focus:border-lime-400"
                            />
                          </div>

                          <div className="col-span-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeSetFromHistoryGroup(gIdx, sIdx)}
                              className="text-neutral-500 hover:text-red-400 p-1"
                              title="Borrar serie"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addSetToHistoryGroup(gIdx)}
                      className="w-full py-1.5 rounded-lg border border-dashed border-neutral-700 hover:border-neutral-500 text-[10px] font-bold text-neutral-300 flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Añadir Serie a {grp.exerciseName}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex gap-2">
              <button
                onClick={handleSaveWorkoutEdit}
                disabled={isSavingHistoryEdit}
                className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {isSavingHistoryEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
              </button>
              <button
                onClick={() => setEditingWorkout(null)}
                className="px-4 py-2.5 bg-neutral-800 text-neutral-300 text-xs rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SUSTITUIR EJERCICIO EN VIVO ================= */}
      {substitutingExerciseId && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-lime-400" /> Sustituir por:
              </h3>
              <button onClick={() => setSubstitutingExerciseId(null)} className="p-1 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={liveSearchQuery}
                  onChange={(e) => setLiveSearchQuery(e.target.value)}
                  placeholder="Buscar ejercicio de reemplazo..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {MUSCLE_FILTER_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setLiveMuscleFilter(m)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition border ${
                      liveMuscleFilter === m
                        ? 'bg-lime-400 text-neutral-950 border-lime-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredLiveExercises.map((catEx: CatalogExercise) => (
                <div
                  key={catEx.id}
                  onClick={() => handleSubstituteExercise(catEx)}
                  className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:border-lime-400/60 flex items-center justify-between cursor-pointer transition text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-white block truncate">{catEx.name}</span>
                    <span className="text-[10px] text-lime-400">{catEx.target_muscle} • {catEx.equipment}</span>
                  </div>
                  <Check className="w-4 h-4 text-lime-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: AÑADIR EJERCICIO AL ENTRENAMIENTO EN VIVO ================= */}
      {isAddLiveExerciseOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-lime-400" /> Añadir Ejercicio a Sesión
              </h3>
              <button onClick={() => setIsAddLiveExerciseOpen(false)} className="p-1 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={liveSearchQuery}
                  onChange={(e) => setLiveSearchQuery(e.target.value)}
                  placeholder="Buscar ejercicio..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {MUSCLE_FILTER_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setLiveMuscleFilter(m)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition border ${
                      liveMuscleFilter === m
                        ? 'bg-lime-400 text-neutral-950 border-lime-400'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredLiveExercises.map((catEx: CatalogExercise) => (
                <div
                  key={catEx.id}
                  onClick={() => handleAddExerciseToLiveWorkout(catEx)}
                  className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:border-lime-400/60 flex items-center justify-between cursor-pointer transition text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-bold text-white block truncate">{catEx.name}</span>
                    <span className="text-[10px] text-lime-400">{catEx.target_muscle}</span>
                  </div>
                  <Plus className="w-4 h-4 text-lime-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREAR EJERCICIO PROPIO ================= */}
      {isNewExerciseModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-lime-400" /> Registrar Nuevo Ejercicio
              </h3>
              <button onClick={() => setIsNewExerciseModalOpen(false)} className="p-1 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Nombre del Ejercicio *</label>
              <input
                type="text"
                placeholder="Ej. Press inclinado con pausa..."
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-neutral-400 block mb-1">Músculo Principal</label>
                <select
                  value={newExMuscle}
                  onChange={(e) => setNewExMuscle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                >
                  {MUSCLE_FILTER_OPTIONS.filter((m) => m !== 'Todos').map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-400 block mb-1">Equipo</label>
                <select
                  value={newExEquipment}
                  onChange={(e) => setNewExEquipment(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
                >
                  <option value="Barra">Barra</option>
                  <option value="Mancuerna">Mancuerna</option>
                  <option value="Polea">Polea</option>
                  <option value="Máquina">Máquina</option>
                  <option value="Corporal / Lastre">Corporal / Lastre</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Músculos Secundarios (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Deltoides anterior, Tríceps..."
                value={newExSecondary}
                onChange={(e) => setNewExSecondary(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">URL de GIF o Imagen (Opcional)</label>
              <input
                type="text"
                placeholder="https://... o dejar en blanco"
                value={newExUrl}
                onChange={(e) => setNewExUrl(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleCreateCustomCatalogExercise}
                className="flex-1 py-2.5 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs rounded-xl transition"
              >
                Guardar Ejercicio
              </button>
              <button
                onClick={() => setIsNewExerciseModalOpen(false)}
                className="px-4 py-2.5 bg-neutral-800 text-neutral-300 text-xs rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR / ORDENAR DÍA DE LA RUTINA ================= */}
      {isDayModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lime-400" />
                {editingDayId ? 'Editar y Ordenar Día' : 'Añadir Día'}
              </h3>
              <button
                onClick={() => setIsDayModalOpen(false)}
                className="p-1 bg-neutral-950 rounded-lg text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-3 space-y-3 flex-1 pr-1">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">Etiqueta</label>
                  <input
                    type="text"
                    value={modalDayBadge}
                    onChange={(e) => setModalDayBadge(e.target.value)}
                    placeholder="Día 1"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-neutral-400 block mb-1">Nombre del Día *</label>
                  <input
                    type="text"
                    value={modalDayTitle}
                    onChange={(e) => setModalDayTitle(e.target.value)}
                    placeholder="Ej. Torso A, Pierna..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-neutral-400 block mb-1">Subtítulo / Músculos</label>
                <input
                  type="text"
                  value={modalDaySubtitle}
                  onChange={(e) => setModalDaySubtitle(e.target.value)}
                  placeholder="Ej. Espalda, Pecho y Brazos"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
                />
              </div>

              {modalItems.length > 0 && (
                <div className="space-y-2 bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                  <span className="text-[11px] font-bold text-lime-400 uppercase tracking-wider block">
                    Orden y Series ({modalItems.length} ejercicios):
                  </span>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {modalItems.map((item, mIdx) => {
                      const ex = catalog.find((c: CatalogExercise) => c.id === item.exerciseId)
                      return (
                        <div key={item.exerciseId} className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800/80 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white truncate max-w-[140px]">
                              {mIdx + 1}. {ex?.name || item.exerciseId}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleModalItemSuperset(item.exerciseId)}
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                  item.supersetGroup
                                    ? 'bg-lime-400 text-neutral-950 font-bold'
                                    : 'bg-neutral-950 text-neutral-500'
                                }`}
                                title="Vincular superserie"
                              >
                                {item.supersetGroup ? `Biserie ${item.supersetGroup}` : '+ Biserie'}
                              </button>
                              <button
                                type="button"
                                onClick={() => moveModalItem(mIdx, 'up')}
                                disabled={mIdx === 0}
                                className="p-1 bg-neutral-950 text-neutral-400 disabled:opacity-30 rounded"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveModalItem(mIdx, 'down')}
                                disabled={mIdx === modalItems.length - 1}
                                className="p-1 bg-neutral-950 text-neutral-400 disabled:opacity-30 rounded"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleModalExercise(item.exerciseId)}
                                className="text-neutral-500 hover:text-red-400 ml-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-neutral-400">
                            <div>
                              <span className="block mb-0.5">Series</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={item.setsCount}
                                onChange={(e) =>
                                  updateModalItemField(item.exerciseId, 'setsCount', Number(e.target.value))
                                }
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1 text-center font-bold text-white text-xs focus:border-lime-400"
                              />
                            </div>
                            <div>
                              <span className="block mb-0.5">Reps</span>
                              <input
                                type="number"
                                min="1"
                                value={item.defaultReps}
                                onChange={(e) =>
                                  updateModalItemField(item.exerciseId, 'defaultReps', Number(e.target.value))
                                }
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1 text-center font-bold text-white text-xs focus:border-lime-400"
                              />
                            </div>
                            <div>
                              <span className="block mb-0.5">Kg Inicial</span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={item.defaultWeight}
                                onChange={(e) =>
                                  updateModalItemField(item.exerciseId, 'defaultWeight', Number(e.target.value))
                                }
                                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg py-1 text-center font-bold text-lime-400 text-xs focus:border-lime-400"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-neutral-300 block">
                  Añadir ejercicios del catálogo:
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder="Buscar por ejercicio o músculo..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-lime-400"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                  {MUSCLE_FILTER_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModalMuscleFilter(m)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition border ${
                        modalMuscleFilter === m
                          ? 'bg-lime-400 text-neutral-950 border-lime-400'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredModalExercises.map((ex: CatalogExercise) => {
                  const isSelected = modalItems.some((i) => i.exerciseId === ex.id)
                  return (
                    <div
                      key={ex.id}
                      onClick={() => toggleModalExercise(ex.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                        isSelected
                          ? 'bg-lime-400/15 border-lime-400/60 text-white'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-bold block truncate">{ex.name}</span>
                        <span className="text-[10px] text-lime-400">{ex.target_muscle}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-lime-400 border-lime-400 text-neutral-950' : 'border-neutral-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex gap-2">
              <button
                onClick={handleSaveDay}
                className="flex-1 py-2.5 bg-lime-400 text-neutral-950 font-bold text-xs rounded-xl"
              >
                {editingDayId ? 'Guardar Cambios' : 'Añadir Día'}
              </button>
              <button
                onClick={() => setIsDayModalOpen(false)}
                className="px-4 py-2.5 bg-neutral-800 text-neutral-300 text-xs rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREAR PROGRAMA ================= */}
      {isCreatingProgram && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-lime-400" /> Crear Nueva Rutina
              </h3>
              <button onClick={() => setIsCreatingProgram(false)} className="p-1 bg-neutral-950 rounded-lg text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Nombre del Programa / Rutina *</label>
              <input
                type="text"
                placeholder="Ej. Hipertrofia Octubre..."
                value={newProgramName}
                onChange={(e) => setNewProgramName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Descripción corta (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. 5 días divididos"
                value={newProgramDesc}
                onChange={(e) => setNewProgramDesc(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleCreateProgram}
                className="flex-1 py-2.5 bg-lime-400 text-neutral-950 font-bold text-xs rounded-xl"
              >
                Crear Rutina
              </button>
              <button
                onClick={() => setIsCreatingProgram(false)}
                className="px-4 py-2.5 bg-neutral-800 text-neutral-300 text-xs rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DESCANSO FLOTANTE CON AVISO SONORO ================= */}
      {isRestActive && restSeconds !== null && (
        <aside className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-neutral-900/95 border border-neutral-800 p-3.5 rounded-2xl flex items-center justify-between shadow-2xl z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                Descanso
              </span>
              <span className="text-2xl font-mono font-bold text-lime-400">
                {formatTime(restSeconds)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setRestSeconds((prev) => (prev ? prev + 30 : 30))}
              className="px-3 py-1.5 bg-neutral-800 text-xs font-semibold rounded-lg text-neutral-200"
            >
              +30s
            </button>
            <button
              onClick={() => setIsRestActive(false)}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg"
            >
              Saltar
            </button>
          </div>
        </aside>
      )}

      {/* ================= BARRA DE NAVEGACIÓN INFERIOR (5 PESTAÑAS) ================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-950/95 border-t border-neutral-800/80 flex justify-around py-3 z-40">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Inicio</span>
        </button>

        <button onClick={() => setActiveTab('routines')} className={`flex flex-col items-center gap-1 ${activeTab === 'routines' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px]">Rutinas</span>
        </button>

        <button onClick={() => setActiveTab('workout')} className={`flex flex-col items-center gap-1 ${activeTab === 'workout' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <Dumbbell className="w-5 h-5" />
          <span className="text-[10px]">Entrenar</span>
        </button>

        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <History className="w-5 h-5" />
          <span className="text-[10px]">Historial</span>
        </button>

        <button onClick={() => setActiveTab('library')} className={`flex flex-col items-center gap-1 ${activeTab === 'library' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Biblioteca</span>
        </button>
      </nav>

      {/* ================= MODAL: VISOR DE LÁMINA ================= */}
      {selectedPreview && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative">
            <button onClick={() => setSelectedPreview(null)} className="absolute top-4 right-4 p-1.5 bg-neutral-950 rounded-xl text-neutral-400">
              <X className="w-4 h-4" />
            </button>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-lime-400 inline-block mb-1.5">
              {selectedPreview.target_muscle}
            </span>
            <h3 className="text-lg font-bold text-white mb-3">{selectedPreview.name}</h3>
            <div className="w-full h-64 rounded-2xl bg-neutral-950 border border-neutral-800 p-2 overflow-hidden mb-4 flex items-center justify-center shadow-lg">
              <AnatomicalImage src={selectedPreview.anatomical_image_url || ''} alt={selectedPreview.name} targetMuscle={selectedPreview.target_muscle} className="w-full h-full object-contain" />
            </div>
            <button onClick={() => setSelectedPreview(null)} className="w-full py-2.5 bg-neutral-800 text-white text-xs font-semibold rounded-xl">
              Cerrar visor
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL DE RESUMEN ================= */}
      {isSummaryOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl">
            <Trophy className="w-12 h-12 text-lime-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">¡Entrenamiento Finalizado!</h3>
            <p className="text-xs text-neutral-400 mb-6">Volumen total: {workoutStats.totalVolume} kg en {formatTime(sessionSeconds)}</p>

            {saveSuccess && (
              <div className="p-3 bg-lime-500/10 border border-lime-500/30 text-lime-400 rounded-xl text-xs font-semibold mb-3">
                ✓ Guardado en tu cuenta personal de Supabase
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSaveWorkout}
                disabled={isSaving || saveSuccess}
                className="w-full py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-neutral-950 font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? 'Guardado con Éxito' : <><Save className="w-4 h-4" /> Guardar en Supabase</>}
              </button>
              <button onClick={() => { setIsSummaryOpen(false); setSaveSuccess(false) }} className="w-full py-2.5 text-neutral-400 hover:text-white text-xs font-medium transition">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}