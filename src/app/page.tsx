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
  ArrowLeft,
  Maximize2,
  History,
  Calendar,
  ChevronRight,
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
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ExerciseSet {
  id: string
  setNumber: number
  weight: number
  reps: number
  rir: number
  isCompleted: boolean
  isPr: boolean
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
  sets: ExerciseSet[]
}

interface CatalogExercise {
  id: string
  name: string
  target_muscle: string
  secondary_muscle?: string
  equipment: string
  anatomical_image_url: string
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

const VERIFIED_MUSCLE_GIFS: Record<string, string> = {
  Espalda:
    'https://fitcron.com/wp-content/uploads/2021/04/18661301-Wide-Grip-Pull-Up-on-Dip-Cage_Back_720.gif',
  Pecho: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
  Hombros: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
  Bíceps: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif',
  Tríceps: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dips.gif',
  Brazos: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif',
  Cuádriceps: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
  Isquiosurales:
    'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif',
  Glúteos: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif',
  Gemelos: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Calf-Raise.gif',
  Abdomen: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
}

function getVerifiedFallbackByMuscle(targetMuscle: string, exerciseName: string): string {
  const m = (targetMuscle + ' ' + exerciseName).toLowerCase()
  if (
    m.includes('trícep') ||
    m.includes('tricep') ||
    m.includes('francés') ||
    m.includes('frances') ||
    m.includes('extensión de tríceps')
  ) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif'
  }
  if (
    m.includes('bícep') ||
    m.includes('bicep') ||
    m.includes('curl') ||
    m.includes('predicador') ||
    m.includes('brazo')
  ) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif'
  }
  if (
    m.includes('espalda') ||
    m.includes('dorsal') ||
    m.includes('remo') ||
    m.includes('jalón') ||
    m.includes('dominada')
  ) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif'
  }
  if (m.includes('pecho') || m.includes('pectoral') || m.includes('banca') || m.includes('apertura')) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif'
  }
  if (m.includes('hombro') || m.includes('deltoide') || m.includes('militar') || m.includes('lateral')) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif'
  }
  if (m.includes('isquio') || m.includes('femoral') || m.includes('rumano')) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif'
  }
  if (m.includes('glúteo') || m.includes('gluteo') || m.includes('hip thrust') || m.includes('abducció')) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif'
  }
  if (m.includes('gemelo') || m.includes('talón') || m.includes('talon') || m.includes('sóleo')) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Calf-Raise.gif'
  }
  if (m.includes('cuádricep') || m.includes('cuadricep') || m.includes('sentadilla') || m.includes('prensa')) {
    return 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif'
  }
  return 'https://fitcron.com/wp-content/uploads/2021/04/18661301-Wide-Grip-Pull-Up-on-Dip-Cage_Back_720.gif'
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
  const [imgSrc, setImgSrc] = useState(src)
  const [fallbackStage, setFallbackStage] = useState(0)

  useEffect(() => {
    setImgSrc(src)
    setFallbackStage(0)
  }, [src])

  const handleError = () => {
    if (fallbackStage === 0) {
      const verified = getVerifiedFallbackByMuscle(targetMuscle, alt)
      if (verified !== imgSrc) {
        setImgSrc(verified)
        setFallbackStage(1)
        return
      }
    }
    if (fallbackStage <= 1) {
      setImgSrc('https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif')
      setFallbackStage(2)
      return
    }
    setFallbackStage(3)
  }

  if (fallbackStage === 3) {
    return (
      <svg viewBox="0 0 100 120" className="w-full h-full bg-white p-1">
        <circle cx="50" cy="20" r="10" fill="#9ca3af" />
        <path
          d="M35 34 C35 31, 65 31, 65 34 L70 68 L62 68 L60 45 L58 72 L42 72 L40 45 L38 68 L30 68 Z"
          fill="#d1d5db"
          stroke="#6b7280"
          strokeWidth="1.5"
        />
        <ellipse cx="43" cy="46" rx="7" ry="9" fill="#ef4444" opacity="0.9" />
        <ellipse cx="57" cy="46" rx="7" ry="9" fill="#ef4444" opacity="0.9" />
      </svg>
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
    />
  )
}

// CATÁLOGO EXTENDIDO Y COMPLETO CON MÁS DE 50 EJERCICIOS
const ANATOMICAL_EXERCISES: CatalogExercise[] = [
  // ==================== ESPALDA ====================
  {
    id: 'e1',
    name: 'Dominadas en barra (Pull-ups / Lastre)',
    target_muscle: 'Espalda (Dorsales)',
    secondary_muscle: 'Bíceps, Redondo Mayor',
    equipment: 'Corporal / Lastre',
    anatomical_image_url: 'https://fitcron.com/wp-content/uploads/2021/04/18661301-Wide-Grip-Pull-Up-on-Dip-Cage_Back_720.gif',
  },
  {
    id: 'e2',
    name: 'Dominadas agarre neutro / supino',
    target_muscle: 'Espalda (Dorsal Ancho)',
    secondary_muscle: 'Bíceps, Braquial',
    equipment: 'Corporal / Lastre',
    anatomical_image_url: 'https://louismove.com/wp-content/uploads/2023/05/18651101-Hammer-Grip-Pull-up-on-Dip-Cage_Back_medium.png',
  },
  {
    id: 'e3',
    name: 'Remo en T (T-Bar Row)',
    target_muscle: 'Espalda (Densidad Media y Dorsal)',
    secondary_muscle: 'Romboides, Trapecio Medio, Bíceps',
    equipment: 'Barra / Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lever-T-bar-Row.gif',
  },
  {
    id: 'e4',
    name: 'Jalón unilateral en polea alta',
    target_muscle: 'Espalda (Dorsal Ancho Iliaco)',
    secondary_muscle: 'Bíceps, Redondo Mayor',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
  },
  {
    id: 'e5',
    name: 'Jalón al pecho en polea alta (Agarre prono)',
    target_muscle: 'Espalda (Dorsal Ancho)',
    secondary_muscle: 'Bíceps, Trapecio Inferior',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
  },
  {
    id: 'e6',
    name: 'Remo con barra (Pendlay / 45°)',
    target_muscle: 'Espalda (Media y Dorsal)',
    secondary_muscle: 'Romboides, Erectores Espinales',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif',
  },
  {
    id: 'e7',
    name: 'Remo unilateral con mancuerna (Serrucho)',
    target_muscle: 'Espalda (Dorsal y Redondo)',
    secondary_muscle: 'Bíceps, Deltoides Posterior',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif',
  },
  {
    id: 'e8',
    name: 'Remo sentado en polea baja (Gironda)',
    target_muscle: 'Espalda (Media y Dorsal)',
    secondary_muscle: 'Romboides, Bíceps',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif',
  },
  {
    id: 'e9',
    name: 'Pull-over en polea alta con cuerda',
    target_muscle: 'Espalda (Aislamiento Dorsal Ancho)',
    secondary_muscle: 'Redondo Mayor, Tríceps',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
  },
  {
    id: 'e10',
    name: 'Peso muerto convencional con barra',
    target_muscle: 'Cadena Posterior y Espalda',
    secondary_muscle: 'Glúteos, Isquiosurales, Trapecio',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif',
  },
  {
    id: 'e11',
    name: 'Remo en máquina con apoyo en el pecho',
    target_muscle: 'Espalda (Zona Media y Trapecio)',
    secondary_muscle: 'Romboides, Bíceps',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lever-T-bar-Row.gif',
  },
  {
    id: 'e12',
    name: 'Encogimientos con mancuernas / barra',
    target_muscle: 'Espalda (Trapecio Superior)',
    secondary_muscle: 'Antebrazos',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif',
  },

  // ==================== PECHO ====================
  {
    id: 'p1',
    name: 'Press de banca plano con barra',
    target_muscle: 'Pecho (Pectoral Mayor Esternal)',
    secondary_muscle: 'Tríceps, Deltoides Anterior',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
  },
  {
    id: 'p2',
    name: 'Press inclinado con mancuernas (30°)',
    target_muscle: 'Pecho (Haz Clavicular / Superior)',
    secondary_muscle: 'Deltoides Anterior, Tríceps',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif',
  },
  {
    id: 'p3',
    name: 'Press de banca plano con mancuernas',
    target_muscle: 'Pecho (Pectoral Mayor)',
    secondary_muscle: 'Tríceps, Deltoides Anterior',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press.gif',
  },
  {
    id: 'p4',
    name: 'Press inclinado con barra',
    target_muscle: 'Pecho (Pectoral Superior)',
    secondary_muscle: 'Deltoides Anterior, Tríceps',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif',
  },
  {
    id: 'p5',
    name: 'Aperturas en máquina (Pec Deck / Contractora)',
    target_muscle: 'Pecho (Aislamiento Pectoral)',
    secondary_muscle: 'Deltoides Anterior',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pec-Deck-Fly.gif',
  },
  {
    id: 'p6',
    name: 'Cruces en polea alta a baja',
    target_muscle: 'Pecho (Fibras Costales e Inferiores)',
    secondary_muscle: 'Deltoides Anterior',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crossover.gif',
  },
  {
    id: 'p7',
    name: 'Cruces en polea baja a alta (Haz clavicular)',
    target_muscle: 'Pecho (Pectoral Superior)',
    secondary_muscle: 'Deltoides Anterior',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crossover.gif',
  },
  {
    id: 'p8',
    name: 'Fondos en paralelas (Enfoque Pectoral)',
    target_muscle: 'Pecho (Pectoral Inferior)',
    secondary_muscle: 'Tríceps, Deltoides Anterior',
    equipment: 'Corporal / Lastre',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dips.gif',
  },
  {
    id: 'p9',
    name: 'Press declinado con barra / mancuernas',
    target_muscle: 'Pecho (Pectoral Inferior)',
    secondary_muscle: 'Tríceps',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
  },

  // ==================== HOMBROS ====================
  {
    id: 'h1',
    name: 'Elevaciones laterales sentado con mancuernas',
    target_muscle: 'Hombros (Deltoides Lateral)',
    secondary_muscle: 'Supraespinoso, Trapecio Superior',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
  },
  {
    id: 'h2',
    name: 'Elevaciones laterales de pie con mancuernas',
    target_muscle: 'Hombros (Deltoides Lateral)',
    secondary_muscle: 'Trapecio',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
  },
  {
    id: 'h3',
    name: 'Elevaciones laterales en polea baja',
    target_muscle: 'Hombros (Deltoides Lateral Constante)',
    secondary_muscle: 'Supraespinoso',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
  },
  {
    id: 'h4',
    name: 'Press militar de pie con barra (OHP)',
    target_muscle: 'Hombros (Deltoides Anterior y Medio)',
    secondary_muscle: 'Tríceps, Core, Trapecio',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Military-Press.gif',
  },
  {
    id: 'h5',
    name: 'Press de hombros sentado con mancuernas',
    target_muscle: 'Hombros (Deltoides Anterior)',
    secondary_muscle: 'Tríceps, Deltoides Lateral',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif',
  },
  {
    id: 'h6',
    name: 'Face Pull en polea alta con cuerda',
    target_muscle: 'Hombros (Deltoides Posterior y Manguito)',
    secondary_muscle: 'Trapecio Medio, Romboides',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif',
  },
  {
    id: 'h7',
    name: 'Pájaros con mancuernas / peck deck inverso',
    target_muscle: 'Hombros (Deltoides Posterior)',
    secondary_muscle: 'Romboides',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif',
  },

  // ==================== BRAZOS (BÍCEPS Y TRÍCEPS) ====================
  {
    id: 'b1',
    name: 'Predicador con barra Z (Banco Scott)',
    target_muscle: 'Brazos (Bíceps Cabeza Corta y Braquial)',
    secondary_muscle: 'Supinador Largo',
    equipment: 'Barra Z',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Z-Bar-Preacher-Curl.gif',
  },
  {
    id: 'b2',
    name: 'Curl de bíceps de pie con barra Z / recta',
    target_muscle: 'Brazos (Bíceps Braquial)',
    secondary_muscle: 'Braquial Anterior, Antebrazo',
    equipment: 'Barra Z',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif',
  },
  {
    id: 'b3',
    name: 'Curl inclinado con mancuernas (60°)',
    target_muscle: 'Brazos (Bíceps Cabeza Larga)',
    secondary_muscle: 'Braquial',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif',
  },
  {
    id: 'b4',
    name: 'Curl martillo con mancuernas',
    target_muscle: 'Brazos (Braquial y Braquiorradial)',
    secondary_muscle: 'Bíceps Braquial',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif',
  },
  {
    id: 'b5',
    name: 'Curl en polea baja (Bayesian curl)',
    target_muscle: 'Brazos (Bíceps en máximo estiramiento)',
    secondary_muscle: 'Antebrazo',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif',
  },
  {
    id: 'b6',
    name: 'Curl spider en banco inclinado',
    target_muscle: 'Brazos (Bíceps Cabeza Corta)',
    secondary_muscle: 'Braquial',
    equipment: 'Barra Z',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif',
  },
  {
    id: 't1',
    name: 'Extensión de tríceps tras nuca en polea (Overhead)',
    target_muscle: 'Brazos (Tríceps Cabeza Larga)',
    secondary_muscle: 'Cabeza Lateral y Medial',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
  },
  {
    id: 't2',
    name: 'Extensión de tríceps en polea alta con cuerda',
    target_muscle: 'Brazos (Tríceps Cabeza Lateral y Medial)',
    secondary_muscle: 'Ancóneo',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
  },
  {
    id: 't3',
    name: 'Press francés con barra Z tumbado',
    target_muscle: 'Brazos (Tríceps Completo)',
    secondary_muscle: 'Antebrazo',
    equipment: 'Barra Z',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dips.gif',
  },
  {
    id: 't4',
    name: 'Fondos entre bancos / Fondos paralelas tríceps',
    target_muscle: 'Brazos (Tríceps)',
    secondary_muscle: 'Pecho, Deltoides Anterior',
    equipment: 'Corporal',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dips.gif',
  },
  {
    id: 't5',
    name: 'Press cerrado de banca con barra',
    target_muscle: 'Brazos (Tríceps Cabeza Medial y Lateral)',
    secondary_muscle: 'Pectoral, Deltoides',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
  },

  // ==================== PIERNAS Y GLÚTEOS ====================
  {
    id: 'c1',
    name: 'Sentadilla trasera con barra (Back Squat)',
    target_muscle: 'Cuádriceps (Vasto Lateral, Medial y Recto)',
    secondary_muscle: 'Glúteo Mayor, Aductores, Core',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
  },
  {
    id: 'c2',
    name: 'Prensa de piernas inclinada 45°',
    target_muscle: 'Cuádriceps',
    secondary_muscle: 'Glúteos, Isquiosurales',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Press.gif',
  },
  {
    id: 'c3',
    name: 'Sentadilla Hack en máquina (Hack Squat)',
    target_muscle: 'Cuádriceps (Vastos)',
    secondary_muscle: 'Glúteos',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Sled-Hack-Squat.gif',
  },
  {
    id: 'c4',
    name: 'Extensión de cuádriceps en máquina (Sillón)',
    target_muscle: 'Cuádriceps (Recto Femoral y Vastos)',
    secondary_muscle: 'Articulación rodilla',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/LEG-EXTENSION.gif',
  },
  {
    id: 'c5',
    name: 'Sentadilla búlgara con mancuernas',
    target_muscle: 'Cuádriceps y Glúteo Mayor',
    secondary_muscle: 'Aductores, Isquiosurales',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Bulgarian-Split-Squat.gif',
  },
  {
    id: 'c6',
    name: 'Zancadas caminando con mancuernas',
    target_muscle: 'Cuádriceps y Glúteos',
    secondary_muscle: 'Isquiosurales, Core',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Bulgarian-Split-Squat.gif',
  },
  {
    id: 'i1',
    name: 'Peso muerto rumano con barra (RDL)',
    target_muscle: 'Isquiosurales (Bíceps Femoral y Semitendinoso)',
    secondary_muscle: 'Glúteo Mayor, Erectores Espinales',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif',
  },
  {
    id: 'i2',
    name: 'Curl femoral tumbado en máquina',
    target_muscle: 'Isquiosurales',
    secondary_muscle: 'Gemelos',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Curl.gif',
  },
  {
    id: 'i3',
    name: 'Curl femoral sentado en máquina',
    target_muscle: 'Isquiosurales (Máximo estiramiento)',
    secondary_muscle: 'Gemelos',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Leg-Curl.gif',
  },
  {
    id: 'i4',
    name: 'Peso muerto rumano unilateral con mancuernas',
    target_muscle: 'Isquiosurales y Glúteo',
    secondary_muscle: 'Estabilizadores de cadera',
    equipment: 'Mancuerna',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif',
  },
  {
    id: 'g1',
    name: 'Hip Thrust con barra olímpica',
    target_muscle: 'Glúteos (Glúteo Mayor)',
    secondary_muscle: 'Isquiosurales, Core',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif',
  },
  {
    id: 'g2',
    name: 'Abducción de cadera sentado en máquina',
    target_muscle: 'Glúteos (Glúteo Medio y Menor)',
    secondary_muscle: 'Tensor de la Fascia Lata',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/HiP-ABDUCTION-MACHINE.gif',
  },
  {
    id: 'g3',
    name: 'Patada de glúteo en polea baja',
    target_muscle: 'Glúteos (Glúteo Mayor)',
    secondary_muscle: 'Isquiosurales',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif',
  },
  {
    id: 'cal1',
    name: 'Elevación de talones de pie en máquina',
    target_muscle: 'Gemelos (Gastrocnemio)',
    secondary_muscle: 'Sóleo',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Calf-Raise.gif',
  },
  {
    id: 'cal2',
    name: 'Elevación de talones sentado en máquina',
    target_muscle: 'Gemelos (Sóleo)',
    secondary_muscle: 'Gastrocnemio',
    equipment: 'Máquina',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lever-Seated-Calf-Raise.gif',
  },

  // ==================== CORE / ABDOMEN ====================
  {
    id: 'ab1',
    name: 'Elevación de piernas colgado en barra',
    target_muscle: 'Abdomen (Recto Abdominal Inferior)',
    secondary_muscle: 'Flexores de cadera, Agarre',
    equipment: 'Barra',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
  },
  {
    id: 'ab2',
    name: 'Crunch en polea alta arrodillado',
    target_muscle: 'Abdomen (Recto Abdominal Superior)',
    secondary_muscle: 'Oblicuos',
    equipment: 'Polea',
    anatomical_image_url: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
  },
]

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

// DIVISIÓN BASE DE 5 DÍAS
const DEFAULT_5_DAY_PROGRAM: WorkoutProgram = {
  id: 'prog-5-dias-base',
  name: 'Mi División de 5 Días',
  description: 'Estructura personalizada: Torso A, Pierna, Torso B, Pierna y Brazos',
  days: [
    {
      id: 'd1-torso-a',
      dayBadge: 'Día 1',
      title: 'Torso A (Fuerza e Hipertrofia)',
      subtitle: 'Espalda dominante, banca pesada, laterales y brazos',
      estimatedDuration: '60 min',
      items: [
        { exerciseId: 'e1', setsCount: 3, defaultWeight: 10, defaultReps: 8, defaultRir: 1, note: 'Pausa 1s arriba' },
        { exerciseId: 'p1', setsCount: 3, defaultWeight: 80, defaultReps: 8, defaultRir: 1, note: 'Retracción firme' },
        { exerciseId: 'e3', setsCount: 3, defaultWeight: 65, defaultReps: 10, defaultRir: 1, note: 'Remo T' },
        { exerciseId: 'h1', setsCount: 3, defaultWeight: 12, defaultReps: 12, defaultRir: 1, note: 'Laterales' },
        { exerciseId: 'b1', setsCount: 2, defaultWeight: 32.5, defaultReps: 10, defaultRir: 1, note: 'Predicador' },
        { exerciseId: 't1', setsCount: 2, defaultWeight: 25, defaultReps: 12, defaultRir: 1, note: 'Overhead' },
      ],
    },
    {
      id: 'd2-pierna-a',
      dayBadge: 'Día 2',
      title: 'Pierna (Cuádriceps y Posterior)',
      subtitle: 'Sentadilla trasera, peso muerto rumano y prensa 45°',
      estimatedDuration: '65 min',
      items: [
        { exerciseId: 'c1', setsCount: 3, defaultWeight: 100, defaultReps: 8, defaultRir: 2, note: 'Profunda' },
        { exerciseId: 'i1', setsCount: 3, defaultWeight: 90, defaultReps: 8, defaultRir: 2, note: 'Cadera atrás' },
        { exerciseId: 'c2', setsCount: 3, defaultWeight: 180, defaultReps: 10, defaultRir: 1, note: 'Prensa 45°' },
        { exerciseId: 'i3', setsCount: 3, defaultWeight: 55, defaultReps: 12, defaultRir: 1, note: 'Femoral sentado' },
        { exerciseId: 'cal1', setsCount: 3, defaultWeight: 70, defaultReps: 15, defaultRir: 1, note: 'Gemelos' },
      ],
    },
    {
      id: 'd3-torso-b',
      dayBadge: 'Día 3',
      title: 'Torso B (Densidad y Amplitud)',
      subtitle: 'Press inclinado mancuernas, jalón al pecho y deltoides posterior',
      estimatedDuration: '60 min',
      items: [
        { exerciseId: 'p2', setsCount: 3, defaultWeight: 30, defaultReps: 10, defaultRir: 1, note: 'Inclinado 30°' },
        { exerciseId: 'e5', setsCount: 3, defaultWeight: 65, defaultReps: 10, defaultRir: 1, note: 'Jalón polea' },
        { exerciseId: 'e8', setsCount: 3, defaultWeight: 60, defaultReps: 10, defaultRir: 1, note: 'Remo Gironda' },
        { exerciseId: 'h6', setsCount: 3, defaultWeight: 30, defaultReps: 15, defaultRir: 1, note: 'Face pull' },
        { exerciseId: 'b4', setsCount: 2, defaultWeight: 16, defaultReps: 10, defaultRir: 1, note: 'Martillo' },
        { exerciseId: 't2', setsCount: 2, defaultWeight: 30, defaultReps: 12, defaultRir: 1, note: 'Cuerda tríceps' },
      ],
    },
    {
      id: 'd4-pierna-b',
      dayBadge: 'Día 4',
      title: 'Pierna (Glúteo y Unilateral)',
      subtitle: 'Hip Thrust pesado, sentadillas búlgaras y extensiones',
      estimatedDuration: '60 min',
      items: [
        { exerciseId: 'g1', setsCount: 3, defaultWeight: 120, defaultReps: 10, defaultRir: 1, note: 'Bloqueo 1s' },
        { exerciseId: 'c5', setsCount: 3, defaultWeight: 22, defaultReps: 10, defaultRir: 1, note: 'Búlgaras' },
        { exerciseId: 'c4', setsCount: 3, defaultWeight: 60, defaultReps: 12, defaultRir: 1, note: 'Sillón cuádriceps' },
        { exerciseId: 'i3', setsCount: 3, defaultWeight: 50, defaultReps: 12, defaultRir: 1, note: 'Femoral sentado' },
      ],
    },
    {
      id: 'd5-brazos',
      dayBadge: 'Día 5',
      title: 'Brazos y Hombros (Aislamiento)',
      subtitle: 'Bíceps estiramiento, tríceps tras nuca y laterales al fallo',
      estimatedDuration: '55 min',
      items: [
        { exerciseId: 'b1', setsCount: 3, defaultWeight: 32.5, defaultReps: 10, defaultRir: 1, note: 'Scott Z' },
        { exerciseId: 't1', setsCount: 3, defaultWeight: 25, defaultReps: 12, defaultRir: 1, note: 'Overhead polea' },
        { exerciseId: 'b3', setsCount: 3, defaultWeight: 14, defaultReps: 10, defaultRir: 1, note: 'Curl 60°' },
        { exerciseId: 't3', setsCount: 3, defaultWeight: 30, defaultReps: 10, defaultRir: 1, note: 'Press francés' },
        { exerciseId: 'h1', setsCount: 4, defaultWeight: 12, defaultReps: 15, defaultRir: 0, note: 'Laterales RIR 0' },
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

  const [activeTab, setActiveTab] = useState<'home' | 'workout' | 'history' | 'library'>('home')
  const [bodyWeightKg, setBodyWeightKg] = useState<number>(80)

  // Programas y días
  const [programsList, setProgramsList] = useState<WorkoutProgram[]>([DEFAULT_5_DAY_PROGRAM])
  const [selectedProgramId, setSelectedProgramId] = useState<string>(DEFAULT_5_DAY_PROGRAM.id)
  const [activeDayIndex, setActiveDayIndex] = useState<number>(0)

  // Modal crear programa
  const [isCreatingProgram, setIsCreatingProgram] = useState(false)
  const [newProgramName, setNewProgramName] = useState('')
  const [newProgramDesc, setNewProgramDesc] = useState('')

  // Modal para agregar o editar un día con configuración manual de Series, Reps y Peso
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [editingDayId, setEditingDayId] = useState<string | null>(null)
  const [modalDayBadge, setModalDayBadge] = useState('Día 1')
  const [modalDayTitle, setModalDayTitle] = useState('')
  const [modalDaySubtitle, setModalDaySubtitle] = useState('')
  const [modalItems, setModalItems] = useState<RoutineTemplateItem[]>([])
  const [modalMuscleFilter, setModalMuscleFilter] = useState('Todos')
  const [modalSearchQuery, setModalSearchQuery] = useState('')

  // Sesión y Cronómetro
  const [workoutName, setWorkoutName] = useState('Torso A (Fuerza e Hipertrofia)')
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isSessionRunning, setIsSessionRunning] = useState(false)

  // Descanso
  const [restSeconds, setRestSeconds] = useState<number | null>(null)
  const [isRestActive, setIsRestActive] = useState(false)

  // Catálogo completo
  const [catalog, setCatalog] = useState<CatalogExercise[]>(ANATOMICAL_EXERCISES)
  const [libraryMuscleFilter, setLibraryMuscleFilter] = useState('Todos')
  const [librarySearchQuery, setLibrarySearchQuery] = useState('')
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [selectedPreview, setSelectedPreview] = useState<CatalogExercise | null>(null)

  // Supabase persistencia
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [historyList, setHistoryList] = useState<PastWorkout[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const historyLoadedRef = useRef(false)

  // Ejercicios activos
  const [exercises, setExercises] = useState<WorkoutExercise[]>([
    {
      id: 'ex-1',
      exerciseId: 'e1',
      name: 'Dominadas en barra (Pull-ups / Lastre)',
      targetMuscle: 'Espalda (Dorsales)',
      secondaryMuscle: 'Bíceps, Redondo Mayor',
      anatomicalImageUrl:
        'https://fitcron.com/wp-content/uploads/2021/04/18661301-Wide-Grip-Pull-Up-on-Dip-Cage_Back_720.gif',
      previousBest: 'BW + 10 kg × 8',
      note: 'Controlar bajada 2s',
      sets: [
        { id: 's-1', setNumber: 1, weight: 10, reps: 8, rir: 2, isCompleted: false, isPr: false },
        { id: 's-2', setNumber: 2, weight: 10, reps: 8, rir: 1, isCompleted: false, isPr: false },
      ],
    },
    {
      id: 'ex-2',
      exerciseId: 'p1',
      name: 'Press de banca plano con barra',
      targetMuscle: 'Pecho (Pectoral Mayor Esternal)',
      secondaryMuscle: 'Tríceps, Deltoides Anterior',
      anatomicalImageUrl:
        'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
      previousBest: '80 kg × 8',
      note: 'Retracción escapular firme',
      sets: [
        { id: 's-3', setNumber: 1, weight: 80, reps: 8, rir: 1, isCompleted: false, isPr: false },
        { id: 's-4', setNumber: 2, weight: 80, reps: 8, rir: 1, isCompleted: false, isPr: false },
      ],
    },
  ])

  // Cargar programas de localStorage
  useEffect(() => {
    try {
      const savedProgs = localStorage.getItem('user_workout_programs_v4')
      if (savedProgs) {
        const parsed = JSON.parse(savedProgs)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProgramsList(parsed)
          setSelectedProgramId(parsed[0].id)
        }
      }
    } catch (e) {
      console.warn('Error leyendo programas:', e)
    }
  }, [])
  const savePrograms = (newList: WorkoutProgram[]) => {
    setProgramsList(newList)
    try {
      localStorage.setItem('user_workout_programs_v4', JSON.stringify(newList))
    } catch (e) {
      console.warn('Error guardando programas:', e)
    }
  }

  // Auth Supabase
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
      setAuthError('Supabase no configurado en client.ts')
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

  // Cargar historial sin bucle ni parpadeos
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
        .limit(30)

      if (data && !error) {
        setHistoryList(data)
        historyLoadedRef.current = true
      }
    } catch (err) {
      console.warn('Aviso cargando historial:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (user && activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab, user])

  // Cronómetro
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionRunning) {
      interval = setInterval(() => setSessionSeconds((prev) => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionRunning])

  // Descanso
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRestActive && restSeconds !== null && restSeconds > 0) {
      interval = setInterval(() => setRestSeconds((prev) => (prev ? prev - 1 : 0)), 1000)
    } else if (restSeconds === 0) {
      setIsRestActive(false)
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

  const toggleSetComplete = (exerciseId: string, setId: string) => {
    if (!isSessionRunning) setIsSessionRunning(true)
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        return {
          ...ex,
          sets: ex.sets.map((set) => {
            if (set.id !== setId) return set
            const nextCompleted = !set.isCompleted
            if (nextCompleted) {
              setRestSeconds(90)
              setIsRestActive(true)
            }
            return { ...set, isCompleted: nextCompleted }
          }),
        }
      })
    )
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

  const addSetToExercise = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId) return ex
        const lastSet = ex.sets[ex.sets.length - 1]
        const newSet: ExerciseSet = {
          id: Date.now().toString(),
          setNumber: ex.sets.length + 1,
          weight: lastSet ? lastSet.weight : 40,
          reps: lastSet ? lastSet.reps : 10,
          rir: 1,
          isCompleted: false,
          isPr: false,
        }
        return { ...ex, sets: [...ex.sets, newSet] }
      })
    )
  }

  const removeSetFromExercise = (exerciseId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exerciseId || ex.sets.length <= 1) return ex
        const filtered = ex.sets
          .filter((s) => s.id !== setId)
          .map((s, idx) => ({ ...s, setNumber: idx + 1 }))
        return { ...ex, sets: filtered }
      })
    )
  }

  const removeExercise = (exerciseId: string) => {
    setExercises((prev) => prev.filter((ex) => ex.id !== exerciseId))
  }

  const handleStartDay = (day: ProgramDay) => {
    const builtExercises: WorkoutExercise[] = day.items.map((item, idx) => {
      const catEx =
        catalog.find((c) => c.id === item.exerciseId) ||
        ANATOMICAL_EXERCISES.find((c) => c.id === item.exerciseId) ||
        ANATOMICAL_EXERCISES[0]

      const sets: ExerciseSet[] = Array.from({ length: item.setsCount }).map((_, sIdx) => ({
        id: `set-${Date.now()}-${idx}-${sIdx}`,
        setNumber: sIdx + 1,
        weight: item.defaultWeight,
        reps: item.defaultReps,
        rir: item.defaultRir,
        isCompleted: false,
        isPr: sIdx === item.setsCount - 1,
      }))

      return {
        id: `wex-${Date.now()}-${idx}`,
        exerciseId: catEx.id,
        name: catEx.name,
        targetMuscle: catEx.target_muscle,
        secondaryMuscle: catEx.secondary_muscle,
        anatomicalImageUrl: catEx.anatomical_image_url,
        previousBest: item.previousBest || `${item.defaultWeight} kg × ${item.defaultReps}`,
        note: item.note || '',
        sets,
      }
    })

    setWorkoutName(day.title)
    setExercises(builtExercises)
    setSessionSeconds(0)
    setIsSessionRunning(true)
    setActiveTab('workout')
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

  // Abrir modal para CREAR día
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

  // Abrir modal para EDITAR día
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

  // Añadir o quitar ejercicio del modal
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
        },
      ])
    }
  }

  // Actualizar series, reps o peso en el modal de creación/edición
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

  const workoutStats = useMemo(() => {
    let totalVolume = 0
    let totalCompletedSets = 0
    exercises.forEach((ex) => {
      ex.sets.forEach((set) => {
        if (set.isCompleted) {
          totalVolume += set.weight * set.reps
          totalCompletedSets += 1
        }
      })
    })
    return { totalVolume, totalCompletedSets }
  }, [exercises])

  const historySummaryStats = useMemo(() => {
    const totalSessions = historyList.length
    const accumulatedVolume = historyList.reduce(
      (acc, item) => acc + (Number(item.total_volume_kg) || 0),
      0
    )
    return { totalSessions, accumulatedVolume }
  }, [historyList])

  const currentProgram = useMemo(() => {
    return programsList.find((p) => p.id === selectedProgramId) || programsList[0]
  }, [programsList, selectedProgramId])

  const currentDay = useMemo(() => {
    if (!currentProgram || currentProgram.days.length === 0) return null
    return currentProgram.days[activeDayIndex] || currentProgram.days[0]
  }, [currentProgram, activeDayIndex])

  const filteredModalExercises = useMemo(() => {
    return catalog.filter((ex) => {
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
    return catalog.filter((ex) => {
      const matchesSearch =
        ex.name.toLowerCase().includes(librarySearchQuery.toLowerCase()) ||
        ex.target_muscle.toLowerCase().includes(librarySearchQuery.toLowerCase())
      const matchesMuscle =
        libraryMuscleFilter === 'Todos' ||
        ex.target_muscle.toLowerCase().includes(libraryMuscleFilter.toLowerCase())
      return matchesSearch && matchesMuscle
    })
  }, [catalog, librarySearchQuery, libraryMuscleFilter])

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
            .map((s) => ({
              workout_id: workout.id,
              exercise_id: String(ex.exerciseId),
              set_number: s.setNumber,
              weight_kg: s.weight,
              reps: s.reps,
              rir: s.rir,
              is_pr: s.isPr,
            }))
        )

        if (setsToInsert.length > 0) {
          await supabase.from('workout_sets').insert(setsToInsert)
        }
      }

      setSaveSuccess(true)
      await loadHistory(true)
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || err))
    } finally {
      setIsSaving(false)
    }
  }

  // Pantalla de Login
  if (!user && !authLoading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
          <div className="w-12 h-12 bg-lime-400/10 border border-lime-400/20 text-lime-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Flame className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-center text-white">
            {authIsRegister ? 'Crear Cuenta' : 'Acceso Personal'}
          </h2>
          <p className="text-xs text-center text-neutral-400 mt-1 mb-6">
            Inicia sesión para gestionar tus rutinas y días divididos.
          </p>

          {authError && (
            <div className="mb-4 bg-red-950/60 border border-red-800/80 p-2.5 rounded-xl text-xs text-red-300 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">Contraseña</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-sm rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : authIsRegister ? 'Registrar y Entrar' : 'Iniciar Sesión'}
            </button>
          </form>

          <button
            onClick={() => {
              setAuthIsRegister(!authIsRegister)
              setAuthError('')
            }}
            className="w-full mt-4 text-center text-xs text-neutral-400 hover:text-white transition"
          >
            {authIsRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Regístrate aquí'}
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 max-w-md mx-auto pb-28">
      {/* ================= VISTA 0: INICIO ================= */}
      {activeTab === 'home' && (
        <div className="space-y-4">
          <header className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Tracker Personal
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                Panel de Rutinas
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

          {/* Banner sesión activa */}
          {(sessionSeconds > 0 || workoutStats.totalCompletedSets > 0) && (
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
                Ver →
              </button>
            </div>
          )}

          {/* Selector de Programas */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] uppercase font-bold text-neutral-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-lime-400" /> Programa:
            </span>
            <button
              onClick={() => setIsCreatingProgram(true)}
              className="text-xs font-bold text-lime-400 flex items-center gap-1 hover:underline"
            >
              <FolderPlus className="w-3.5 h-3.5" /> + Nueva Rutina
            </button>
          </div>

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

          {/* Días dentro del programa seleccionado */}
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
                            title="Editar ejercicios de este día"
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
                          const exInfo =
                            catalog.find((c) => c.id === item.exerciseId) ||
                            ANATOMICAL_EXERCISES.find((c) => c.id === item.exerciseId)

                          if (!exInfo) return null

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedPreview(exInfo)}
                              className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2 rounded-xl cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-11 rounded-lg bg-white p-0.5 border border-neutral-700 shrink-0 overflow-hidden">
                                  <AnatomicalImage
                                    src={exInfo.anatomical_image_url}
                                    alt={exInfo.name}
                                    targetMuscle={exInfo.target_muscle}
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white truncate">
                                    {idx + 1}. {exInfo.name}
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

      {/* ================= MODAL: CREAR O EDITAR DÍA CON SERIES/REPS/PESO PERSONALIZABLES ================= */}
      {isDayModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-lime-400" />
                {editingDayId ? 'Editar Día' : 'Añadir Día'}
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

              {/* SECCIÓN 1: AJUSTE DE SERIES, REPS Y PESO DE EJERCICIOS SELECCIONADOS */}
              {modalItems.length > 0 && (
                <div className="space-y-2 bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
                  <span className="text-[11px] font-bold text-lime-400 uppercase tracking-wider block">
                    Configuración de Series ({modalItems.length} ejercicios):
                  </span>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {modalItems.map((item) => {
                      const ex = catalog.find((c) => c.id === item.exerciseId)
                      return (
                        <div key={item.exerciseId} className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800/80 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-white truncate max-w-[190px]">
                              {ex?.name || item.exerciseId}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleModalExercise(item.exerciseId)}
                              className="text-neutral-500 hover:text-red-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
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

              {/* SECCIÓN 2: BUSCADOR Y FILTROS PARA AGREGAR MÁS EJERCICIOS */}
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

              {/* Lista para marcar o desmarcar con checkbox */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {filteredModalExercises.map((ex) => {
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

      {/* ================= VISTA 1: ENTRENAR (SESIÓN ACTIVA) ================= */}
      {activeTab === 'workout' && (
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
            {exercises.map((ex) => {
              const best1RM = Math.max(...ex.sets.map((s) => calculate1RM(s.weight, s.reps)), 0)

              return (
                <section key={ex.id} className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 shadow-xl">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => setSelectedPreview(catalog.find((c) => c.id === ex.exerciseId) || null)}
                        className="relative w-18 h-20 rounded-xl bg-white p-1 border border-neutral-700/60 overflow-hidden shrink-0 cursor-pointer shadow-md"
                      >
                        <AnatomicalImage
                          src={ex.anatomicalImageUrl}
                          alt={ex.name}
                          targetMuscle={ex.targetMuscle}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div>
                        <h2 className="text-base font-bold text-white leading-tight">{ex.name}</h2>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-lime-400 border border-neutral-700/60">
                            {ex.targetMuscle}
                          </span>
                          {best1RM > 0 && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-950 text-neutral-300 border border-neutral-800">
                              1RM: {best1RM} kg
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button onClick={() => removeExercise(ex.id)} className="text-neutral-500 hover:text-red-400 transition p-1.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-12 text-[11px] text-neutral-400 uppercase font-semibold mb-2 px-1 text-center">
                    <span className="col-span-2 text-left">Serie</span>
                    <span className="col-span-3">Kg</span>
                    <span className="col-span-3">Reps</span>
                    <span className="col-span-2">RIR</span>
                    <span className="col-span-2 text-right">Listo</span>
                  </div>

                  <div className="space-y-2">
                    {ex.sets.map((set) => (
                      <div
                        key={set.id}
                        className={`grid grid-cols-12 items-center gap-2 p-2 rounded-xl transition ${
                          set.isCompleted
                            ? 'bg-neutral-950/60 border border-neutral-800 opacity-80'
                            : 'bg-neutral-800/60 border border-neutral-700/60'
                        }`}
                      >
                        <div className="col-span-2 font-bold text-sm text-neutral-300 flex items-center gap-1">
                          <button onClick={() => removeSetFromExercise(ex.id, set.id)} className="hover:text-red-400 transition">
                            #{set.setNumber}
                          </button>
                          {set.isPr && <Trophy className="w-3.5 h-3.5 text-yellow-400 inline" />}
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

                        <div className="col-span-2 flex justify-end">
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
                    ))}
                  </div>

                  <button
                    onClick={() => addSetToExercise(ex.id)}
                    className="mt-3 w-full py-2 rounded-xl border border-dashed border-neutral-700 hover:border-neutral-500 flex items-center justify-center gap-1 text-xs font-semibold text-neutral-300 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Añadir Serie
                  </button>
                </section>
              )
            })}

            <button
              onClick={() => setActiveTab('library')}
              className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-lime-400 transition"
            >
              <Dumbbell className="w-4 h-4" /> + Añadir Ejercicio ({catalog.length})
            </button>
          </div>
        </div>
      )}

      {/* ================= VISTA 2: HISTORIAL ================= */}
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
              {historyList.map((item) => (
                <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-lime-400" />
                        <span className="text-xs text-neutral-400">
                          {new Date(item.completed_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{item.name}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-neutral-500 block">Volumen</span>
                      <span className="text-base font-extrabold font-mono text-lime-400">{item.total_volume_kg || 0} kg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-neutral-900/50 border border-neutral-800 rounded-3xl p-6">
              <History className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-neutral-300">No hay sesiones aún</h3>
            </div>
          )}
        </div>
      )}

      {/* ================= VISTA 3: BIBLIOTECA COMPLETA CON FILTROS ================= */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <header className="border-b border-neutral-800 pb-3 mb-2">
            <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold">Enciclopedia Completa</span>
            <h1 className="text-xl font-extrabold text-neutral-100">Biblioteca Anatómica ({catalog.length} ejercicios)</h1>
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
            {filteredLibraryExercises.map((item) => (
              <div key={item.id} className="w-full p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setSelectedPreview(item)}>
                  <div className="w-14 h-16 rounded-xl bg-white p-1 border border-neutral-700/60 overflow-hidden shrink-0">
                    <AnatomicalImage src={item.anatomical_image_url} alt={item.name} targetMuscle={item.target_muscle} className="w-full h-full object-contain" />
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

      {/* ================= DESCANSO FLOTANTE ================= */}
      {isRestActive && restSeconds !== null && (
        <aside className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-neutral-900/95 border border-neutral-800 p-3.5 rounded-2xl flex items-center justify-between shadow-2xl z-40">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">Descanso</span>
            <span className="text-2xl font-mono font-bold text-lime-400">{formatTime(restSeconds)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setRestSeconds((prev) => (prev ? prev + 30 : 30))} className="px-3 py-1.5 bg-neutral-800 text-xs font-semibold rounded-lg text-neutral-200">+30s</button>
            <button onClick={() => setIsRestActive(false)} className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg">Saltar</button>
          </div>
        </aside>
      )}

      {/* ================= NAVEGACIÓN INFERIOR ================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-950/95 border-t border-neutral-800/80 flex justify-around py-3 z-40">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[11px]">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('workout')} className={`flex flex-col items-center gap-1 ${activeTab === 'workout' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <Dumbbell className="w-5 h-5" />
          <span className="text-[11px]">Entrenar</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <History className="w-5 h-5" />
          <span className="text-[11px]">Historial</span>
        </button>
        <button onClick={() => setActiveTab('library')} className={`flex flex-col items-center gap-1 ${activeTab === 'library' ? 'text-lime-400 font-bold' : 'text-neutral-500'}`}>
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px]">Biblioteca</span>
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
            <div className="w-full h-64 rounded-2xl bg-white border border-neutral-700 p-2 overflow-hidden mb-4 flex items-center justify-center shadow-lg">
              <AnatomicalImage src={selectedPreview.anatomical_image_url} alt={selectedPreview.name} targetMuscle={selectedPreview.target_muscle} className="w-full h-full object-contain" />
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