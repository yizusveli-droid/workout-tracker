'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Image as ImageIcon,
  Home,
  Flame,
  Layers,
  Activity,
  ShieldCheck,
  LogOut,
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

interface RoutineTemplate {
  id: string
  splitCategory: 'Torso / Pierna' | 'Push / Pull / Legs'
  dayBadge: string
  title: string
  subtitle: string
  estimatedDuration: string
  focusMuscles: string[]
  items: RoutineTemplateItem[]
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
        <path d="M32 38 Q26 48 31 58" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M68 38 Q74 48 69 58" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M42 72 L39 108 L47 108 L50 82 L53 108 L61 108 L58 72 Z" fill="#9ca3af" />
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

const ANATOMICAL_EXERCISES: CatalogExercise[] = [
  {
    id: 'e1',
    name: 'Dominadas en barra (Pull-ups / Lastre)',
    target_muscle: 'Espalda (Dorsales)',
    secondary_muscle: 'Bíceps, Redondo Mayor, Core',
    equipment: 'Corporal / Lastre',
    anatomical_image_url:
      'https://fitcron.com/wp-content/uploads/2021/04/18661301-Wide-Grip-Pull-Up-on-Dip-Cage_Back_720.gif',
  },
  {
    id: 'e2',
    name: 'Dominadas agarre neutro / supino',
    target_muscle: 'Espalda (Dorsal Ancho)',
    secondary_muscle: 'Bíceps, Braquial',
    equipment: 'Corporal / Lastre',
    anatomical_image_url:
      'https://louismove.com/wp-content/uploads/2023/05/18651101-Hammer-Grip-Pull-up-on-Dip-Cage_Back_medium.png',
  },
  {
    id: 'e3',
    name: 'Remo en T (T-Bar Row)',
    target_muscle: 'Espalda (Densidad Media y Dorsal)',
    secondary_muscle: 'Romboides, Trapecio Medio, Bíceps',
    equipment: 'Barra / Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lever-T-bar-Row.gif',
  },
  {
    id: 'e4',
    name: 'Jalón unilateral en polea alta',
    target_muscle: 'Espalda (Dorsal Ancho Iliaco)',
    secondary_muscle: 'Bíceps, Redondo Mayor',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
  },
  {
    id: 'e5',
    name: 'Jalón al pecho en polea alta',
    target_muscle: 'Espalda (Dorsal Ancho)',
    secondary_muscle: 'Bíceps, Trapecio Inferior',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
  },
  {
    id: 'e6',
    name: 'Remo con barra (Pendlay / 45°)',
    target_muscle: 'Espalda (Media y Dorsal)',
    secondary_muscle: 'Romboides, Erectores Espinales',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bent-Over-Row.gif',
  },
  {
    id: 'e7',
    name: 'Remo unilateral con mancuerna (Serrucho)',
    target_muscle: 'Espalda (Dorsal y Redondo)',
    secondary_muscle: 'Bíceps, Deltoides Posterior',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif',
  },
  {
    id: 'e8',
    name: 'Remo sentado en polea baja (Gironda)',
    target_muscle: 'Espalda (Media y Dorsal)',
    secondary_muscle: 'Romboides, Bíceps',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif',
  },
  {
    id: 'e9',
    name: 'Pull-over en polea alta con cuerda',
    target_muscle: 'Espalda (Aislamiento Dorsal Ancho)',
    secondary_muscle: 'Redondo Mayor, Cabeza larga tríceps',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
  },
  {
    id: 'e10',
    name: 'Peso muerto convencional con barra',
    target_muscle: 'Cadena Posterior y Espalda',
    secondary_muscle: 'Glúteos, Isquiosurales, Trapecio',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif',
  },
  {
    id: 'p1',
    name: 'Press de banca plano con barra',
    target_muscle: 'Pecho (Pectoral Mayor Esternal)',
    secondary_muscle: 'Tríceps, Deltoides Anterior',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
  },
  {
    id: 'p2',
    name: 'Press inclinado con mancuernas (30°)',
    target_muscle: 'Pecho (Haz Clavicular / Superior)',
    secondary_muscle: 'Deltoides Anterior, Tríceps',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif',
  },
  {
    id: 'p3',
    name: 'Press de banca plano con mancuernas',
    target_muscle: 'Pecho (Pectoral Mayor)',
    secondary_muscle: 'Tríceps, Deltoides Anterior',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press.gif',
  },
  {
    id: 'p4',
    name: 'Press inclinado con barra',
    target_muscle: 'Pecho (Pectoral Superior)',
    secondary_muscle: 'Deltoides Anterior, Tríceps',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif',
  },
  {
    id: 'p5',
    name: 'Aperturas en máquina (Pec Deck / Contractora)',
    target_muscle: 'Pecho (Aislamiento Pectoral)',
    secondary_muscle: 'Deltoides Anterior',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pec-Deck-Fly.gif',
  },
  {
    id: 'p6',
    name: 'Cruces en polea alta a baja',
    target_muscle: 'Pecho (Fibras Costales e Inferiores)',
    secondary_muscle: 'Deltoides Anterior',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crossover.gif',
  },
  {
    id: 'p7',
    name: 'Fondos en paralelas (Enfoque Pectoral)',
    target_muscle: 'Pecho (Pectoral Inferior)',
    secondary_muscle: 'Tríceps, Deltoides Anterior',
    equipment: 'Corporal / Lastre',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dips.gif',
  },
  {
    id: 'h1',
    name: 'Elevaciones laterales sentado con mancuernas',
    target_muscle: 'Hombros (Deltoides Lateral)',
    secondary_muscle: 'Supraespinoso, Trapecio Superior',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
  },
  {
    id: 'h2',
    name: 'Elevaciones laterales de pie con mancuernas',
    target_muscle: 'Hombros (Deltoides Lateral)',
    secondary_muscle: 'Trapecio',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
  },
  {
    id: 'h3',
    name: 'Elevaciones laterales en polea baja',
    target_muscle: 'Hombros (Deltoides Lateral Constante)',
    secondary_muscle: 'Supraespinoso',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
  },
  {
    id: 'h4',
    name: 'Press militar de pie con barra (OHP)',
    target_muscle: 'Hombros (Deltoides Anterior y Medio)',
    secondary_muscle: 'Tríceps, Core, Trapecio',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Military-Press.gif',
  },
  {
    id: 'h5',
    name: 'Press de hombros sentado con mancuernas',
    target_muscle: 'Hombros (Deltoides Anterior)',
    secondary_muscle: 'Tríceps, Deltoides Lateral',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif',
  },
  {
    id: 'h6',
    name: 'Face Pull en polea alta con cuerda',
    target_muscle: 'Hombros (Deltoides Posterior y Manguito)',
    secondary_muscle: 'Trapecio Medio, Romboides',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif',
  },
  {
    id: 'b1',
    name: 'Predicador con barra Z (Banco Scott)',
    target_muscle: 'Brazos (Bíceps Cabeza Corta y Braquial)',
    secondary_muscle: 'Supinador Largo (Antebrazo)',
    equipment: 'Barra Z',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Z-Bar-Preacher-Curl.gif',
  },
  {
    id: 'b2',
    name: 'Curl de bíceps de pie con barra Z / recta',
    target_muscle: 'Brazos (Bíceps Braquial)',
    secondary_muscle: 'Braquial Anterior, Antebrazo',
    equipment: 'Barra Z',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif',
  },
  {
    id: 'b3',
    name: 'Curl inclinado con mancuernas (60°)',
    target_muscle: 'Brazos (Bíceps Cabeza Larga)',
    secondary_muscle: 'Braquial',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif',
  },
  {
    id: 'b4',
    name: 'Curl martillo con mancuernas',
    target_muscle: 'Brazos (Braquial y Braquiorradial)',
    secondary_muscle: 'Bíceps Braquial',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif',
  },
  {
    id: 't1',
    name: 'Extensión de tríceps tras nuca en polea (Overhead)',
    target_muscle: 'Brazos (Tríceps Cabeza Larga)',
    secondary_muscle: 'Cabeza Lateral y Medial',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
  },
  {
    id: 't2',
    name: 'Extensión de tríceps en polea alta con cuerda',
    target_muscle: 'Brazos (Tríceps Cabeza Lateral y Medial)',
    secondary_muscle: 'Ancóneo',
    equipment: 'Polea',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
  },
  {
    id: 't3',
    name: 'Press francés con barra Z tumbado',
    target_muscle: 'Brazos (Tríceps Completo)',
    secondary_muscle: 'Antebrazo',
    equipment: 'Barra Z',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chest-Dips.gif',
  },
  {
    id: 'c1',
    name: 'Sentadilla trasera con barra (Back Squat)',
    target_muscle: 'Cuádriceps (Vasto Lateral, Medial y Recto)',
    secondary_muscle: 'Glúteo Mayor, Aductores, Core',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
  },
  {
    id: 'c2',
    name: 'Prensa de piernas inclinada 45°',
    target_muscle: 'Cuádriceps',
    secondary_muscle: 'Glúteos, Isquiosurales',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Press.gif',
  },
  {
    id: 'c3',
    name: 'Sentadilla Hack en máquina (Hack Squat)',
    target_muscle: 'Cuádriceps (Vasto Externo y Interno)',
    secondary_muscle: 'Glúteos',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Sled-Hack-Squat.gif',
  },
  {
    id: 'c4',
    name: 'Extensión de cuádriceps en máquina (Sillón)',
    target_muscle: 'Cuádriceps (Recto Femoral y Vastos)',
    secondary_muscle: 'Articulación de rodilla',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/LEG-EXTENSION.gif',
  },
  {
    id: 'c5',
    name: 'Sentadilla búlgara con mancuernas',
    target_muscle: 'Cuádriceps y Glúteo Mayor',
    secondary_muscle: 'Aductores, Isquiosurales',
    equipment: 'Mancuerna',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Bulgarian-Split-Squat.gif',
  },
  {
    id: 'i1',
    name: 'Peso muerto rumano con barra (RDL)',
    target_muscle: 'Isquiosurales (Bíceps Femoral y Semitendinoso)',
    secondary_muscle: 'Glúteo Mayor, Erectores Espinales',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif',
  },
  {
    id: 'i2',
    name: 'Curl femoral tumbado en máquina',
    target_muscle: 'Isquiosurales',
    secondary_muscle: 'Gastrocnemio (Gemelos)',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Curl.gif',
  },
  {
    id: 'i3',
    name: 'Curl femoral sentado en máquina',
    target_muscle: 'Isquiosurales (Máximo estiramiento)',
    secondary_muscle: 'Gemelos',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Leg-Curl.gif',
  },
  {
    id: 'g1',
    name: 'Hip Thrust con barra olímpica',
    target_muscle: 'Glúteos (Glúteo Mayor)',
    secondary_muscle: 'Isquiosurales, Core',
    equipment: 'Barra',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif',
  },
  {
    id: 'g2',
    name: 'Abducción de cadera sentado en máquina',
    target_muscle: 'Glúteos (Glúteo Medio y Menor)',
    secondary_muscle: 'Tensor de la Fascia Lata',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/HiP-ABDUCTION-MACHINE.gif',
  },
  {
    id: 'cal1',
    name: 'Elevación de talones de pie en máquina',
    target_muscle: 'Gemelos (Gastrocnemio)',
    secondary_muscle: 'Sóleo',
    equipment: 'Máquina',
    anatomical_image_url:
      'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Calf-Raise.gif',
  },
]

const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'tp-torso-a',
    splitCategory: 'Torso / Pierna',
    dayBadge: 'Día 1 • Torso A',
    title: 'Torso A (Fuerza e Hipertrofia)',
    subtitle: 'Énfasis en Tensión Mecánica: Espalda, Pecho, Hombro Lateral y Brazos',
    estimatedDuration: '60 - 70 min',
    focusMuscles: ['Espalda', 'Pecho', 'Hombros', 'Brazos'],
    items: [
      {
        exerciseId: 'e1',
        setsCount: 3,
        defaultWeight: 10,
        defaultReps: 8,
        defaultRir: 1,
        previousBest: 'BW + 10 kg × 8',
        note: 'Controlar bajada 2s, pecho a la barra',
      },
      {
        exerciseId: 'p1',
        setsCount: 3,
        defaultWeight: 80,
        defaultReps: 8,
        defaultRir: 1,
        previousBest: '80 kg × 8',
        note: 'Retracción escapular firme y pausa breve',
      },
      {
        exerciseId: 'e3',
        setsCount: 3,
        defaultWeight: 65,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '65 kg × 10',
        note: 'Traccionar con codos a 45°',
      },
      {
        exerciseId: 'e4',
        setsCount: 2,
        defaultWeight: 35,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '35 kg × 10',
        note: 'Enfoque en dorsal iliaco unilateral',
      },
      {
        exerciseId: 'h1',
        setsCount: 3,
        defaultWeight: 12,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '12 kg × 12',
        note: 'Sentado sin impulso lumbar',
      },
      {
        exerciseId: 'b1',
        setsCount: 2,
        defaultWeight: 32.5,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '32.5 kg × 10',
        note: 'Rango completo en banco Scott',
      },
      {
        exerciseId: 't1',
        setsCount: 2,
        defaultWeight: 25,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '25 kg × 12',
        note: 'Máximo estiramiento de cabeza larga',
      },
    ],
  },
  {
    id: 'tp-pierna-a',
    splitCategory: 'Torso / Pierna',
    dayBadge: 'Día 2 • Pierna A',
    title: 'Pierna A (Cuádriceps e Isquios)',
    subtitle: 'Patrón dominante de rodilla + bisagra de cadera en estiramiento',
    estimatedDuration: '60 - 70 min',
    focusMuscles: ['Cuádriceps', 'Isquiosurales', 'Glúteos', 'Gemelos'],
    items: [
      {
        exerciseId: 'c1',
        setsCount: 3,
        defaultWeight: 100,
        defaultReps: 8,
        defaultRir: 2,
        previousBest: '100 kg × 8',
        note: 'Profundidad controlada rompiendo paralelo',
      },
      {
        exerciseId: 'i1',
        setsCount: 3,
        defaultWeight: 90,
        defaultReps: 8,
        defaultRir: 2,
        previousBest: '90 kg × 8',
        note: 'Cadera atrás, barra pegada a tibias',
      },
      {
        exerciseId: 'c2',
        setsCount: 3,
        defaultWeight: 180,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '180 kg × 10',
        note: 'Pies en zona media-baja de la plataforma',
      },
      {
        exerciseId: 'i3',
        setsCount: 3,
        defaultWeight: 55,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '55 kg × 12',
        note: 'Pausa 1s en contracción máxima',
      },
      {
        exerciseId: 'c4',
        setsCount: 2,
        defaultWeight: 60,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '60 kg × 12',
        note: 'Sujeción firme en las asas del sillón',
      },
      {
        exerciseId: 'cal1',
        setsCount: 3,
        defaultWeight: 70,
        defaultReps: 15,
        defaultRir: 1,
        previousBest: '70 kg × 15',
        note: 'Pausa de 2s en estiramiento abajo',
      },
    ],
  },
  {
    id: 'tp-torso-b',
    splitCategory: 'Torso / Pierna',
    dayBadge: 'Día 3 • Torso B',
    title: 'Torso B (Hipertrofia y Densidad)',
    subtitle: 'Haz clavicular, amplitud dorsal, deltoides posterior y brazos',
    estimatedDuration: '60 min',
    focusMuscles: ['Pecho', 'Espalda', 'Hombros', 'Brazos'],
    items: [
      {
        exerciseId: 'p2',
        setsCount: 3,
        defaultWeight: 30,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '30 kg × 10',
        note: 'Banco a 30° para haz clavicular',
      },
      {
        exerciseId: 'e5',
        setsCount: 3,
        defaultWeight: 65,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '65 kg × 10',
        note: 'Llevar barra a clavícula sin balanceo',
      },
      {
        exerciseId: 'e8',
        setsCount: 3,
        defaultWeight: 60,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '60 kg × 10',
        note: 'Apretar escápulas 1s al final',
      },
      {
        exerciseId: 'p5',
        setsCount: 2,
        defaultWeight: 55,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '55 kg × 12',
        note: 'Codos ligeramente flexionados',
      },
      {
        exerciseId: 'h6',
        setsCount: 3,
        defaultWeight: 30,
        defaultReps: 15,
        defaultRir: 1,
        previousBest: '30 kg × 15',
        note: 'Rotación externa hacia la frente',
      },
      {
        exerciseId: 'b4',
        setsCount: 2,
        defaultWeight: 16,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '16 kg × 10',
        note: 'Enfoque en braquial y antebrazo',
      },
      {
        exerciseId: 't2',
        setsCount: 2,
        defaultWeight: 30,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '30 kg × 12',
        note: 'Abrir la cuerda al final de la extensión',
      },
    ],
  },
  {
    id: 'tp-pierna-b',
    splitCategory: 'Torso / Pierna',
    dayBadge: 'Día 4 • Pierna B',
    title: 'Pierna B (Glúteos, Isquios y Unilateral)',
    subtitle: 'Cadena posterior pesada, estabilidad unilateral y bombeo',
    estimatedDuration: '60 min',
    focusMuscles: ['Glúteos', 'Isquiosurales', 'Cuádriceps'],
    items: [
      {
        exerciseId: 'g1',
        setsCount: 3,
        defaultWeight: 120,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '120 kg × 10',
        note: 'Bloqueo completo arriba 1s',
      },
      {
        exerciseId: 'c5',
        setsCount: 3,
        defaultWeight: 22,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '22 kg × 10',
        note: 'Torso levemente inclinado',
      },
      {
        exerciseId: 'i2',
        setsCount: 3,
        defaultWeight: 50,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '50 kg × 10',
        note: 'Mantener cadera pegada al banco',
      },
      {
        exerciseId: 'c3',
        setsCount: 3,
        defaultWeight: 100,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '100 kg × 10',
        note: 'Espalda completamente apoyada',
      },
      {
        exerciseId: 'g2',
        setsCount: 3,
        defaultWeight: 60,
        defaultReps: 15,
        defaultRir: 1,
        previousBest: '60 kg × 15',
        note: 'Controlar el regreso sin chocar placas',
      },
    ],
  },
  {
    id: 'ppl-push',
    splitCategory: 'Push / Pull / Legs',
    dayBadge: 'PPL • Push',
    title: 'Empuje (Pecho, Hombros y Tríceps)',
    subtitle: 'Trabajo completo de cadena anterior de torso',
    estimatedDuration: '60 min',
    focusMuscles: ['Pecho', 'Hombros', 'Brazos'],
    items: [
      {
        exerciseId: 'p1',
        setsCount: 3,
        defaultWeight: 80,
        defaultReps: 8,
        defaultRir: 1,
        previousBest: '80 kg × 8',
      },
      {
        exerciseId: 'p2',
        setsCount: 3,
        defaultWeight: 30,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '30 kg × 10',
      },
      {
        exerciseId: 'h4',
        setsCount: 3,
        defaultWeight: 50,
        defaultReps: 8,
        defaultRir: 1,
        previousBest: '50 kg × 8',
      },
      {
        exerciseId: 'h1',
        setsCount: 3,
        defaultWeight: 12,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '12 kg × 12',
      },
      {
        exerciseId: 't1',
        setsCount: 3,
        defaultWeight: 25,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '25 kg × 12',
      },
    ],
  },
  {
    id: 'ppl-pull',
    splitCategory: 'Push / Pull / Legs',
    dayBadge: 'PPL • Pull',
    title: 'Tracción (Espalda, Posterior y Bíceps)',
    subtitle: 'Tracciones verticales, remos pesados y flexores de codo',
    estimatedDuration: '60 min',
    focusMuscles: ['Espalda', 'Hombros', 'Brazos'],
    items: [
      {
        exerciseId: 'e1',
        setsCount: 3,
        defaultWeight: 10,
        defaultReps: 8,
        defaultRir: 1,
        previousBest: 'BW + 10 kg × 8',
      },
      {
        exerciseId: 'e3',
        setsCount: 3,
        defaultWeight: 65,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '65 kg × 10',
      },
      {
        exerciseId: 'e4',
        setsCount: 3,
        defaultWeight: 35,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '35 kg × 10',
      },
      {
        exerciseId: 'h6',
        setsCount: 3,
        defaultWeight: 30,
        defaultReps: 15,
        defaultRir: 1,
        previousBest: '30 kg × 15',
      },
      {
        exerciseId: 'b1',
        setsCount: 3,
        defaultWeight: 32.5,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '32.5 kg × 10',
      },
    ],
  },
  {
    id: 'ppl-legs',
    splitCategory: 'Push / Pull / Legs',
    dayBadge: 'PPL • Legs',
    title: 'Pierna Completa (PPL)',
    subtitle: 'Cuádriceps, Isquiosurales, Glúteos y Pantorrillas',
    estimatedDuration: '65 min',
    focusMuscles: ['Cuádriceps', 'Isquiosurales', 'Glúteos'],
    items: [
      {
        exerciseId: 'c1',
        setsCount: 3,
        defaultWeight: 100,
        defaultReps: 8,
        defaultRir: 2,
        previousBest: '100 kg × 8',
      },
      {
        exerciseId: 'i1',
        setsCount: 3,
        defaultWeight: 90,
        defaultReps: 8,
        defaultRir: 1,
        previousBest: '90 kg × 8',
      },
      {
        exerciseId: 'g1',
        setsCount: 3,
        defaultWeight: 120,
        defaultReps: 10,
        defaultRir: 1,
        previousBest: '120 kg × 10',
      },
      {
        exerciseId: 'c4',
        setsCount: 3,
        defaultWeight: 60,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '60 kg × 12',
      },
      {
        exerciseId: 'i3',
        setsCount: 3,
        defaultWeight: 55,
        defaultReps: 12,
        defaultRir: 1,
        previousBest: '55 kg × 12',
      },
    ],
  },
]

const MUSCLE_CATEGORIES = [
  'Todos',
  'Espalda',
  'Pecho',
  'Hombros',
  'Brazos',
  'Cuádriceps',
  'Isquiosurales',
  'Glúteos',
  'Gemelos',
]

const EQUIPMENT_OPTIONS = ['Barra', 'Barra Z', 'Mancuerna', 'Polea', 'Máquina', 'Corporal / Lastre']

export default function ActiveWorkoutPage() {
  // Autenticación Supabase
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authIsRegister, setAuthIsRegister] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)

  // Vistas
  const [activeTab, setActiveTab] = useState<'home' | 'workout' | 'history' | 'library'>('home')
  const [selectedSplitTab, setSelectedSplitTab] = useState<'Torso / Pierna' | 'Push / Pull / Legs'>(
    'Torso / Pierna'
  )
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>('tp-torso-a')
  const [showWarmupGuide, setShowWarmupGuide] = useState(false)
  const [bodyWeightKg, setBodyWeightKg] = useState<number>(80)

  // Sesión
  const [workoutName, setWorkoutName] = useState('Torso A (Fuerza e Hipertrofia)')
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isSessionRunning, setIsSessionRunning] = useState(false)

  // Descanso
  const [restSeconds, setRestSeconds] = useState<number | null>(null)
  const [isRestActive, setIsRestActive] = useState(false)

  // Catálogo y modals
  const [catalog, setCatalog] = useState<CatalogExercise[]>(ANATOMICAL_EXERCISES)
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)
  const [selectedPreview, setSelectedPreview] = useState<CatalogExercise | null>(null)
  const [editImageUrl, setEditImageUrl] = useState('')

  // Supabase persistencia
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [historyList, setHistoryList] = useState<PastWorkout[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [workoutSetsMap, setWorkoutSetsMap] = useState<Record<string, any[]>>({})
  const [isLoadingSetsId, setIsLoadingSetsId] = useState<string | null>(null)

  // Ejercicio personalizado
  const [isCreatingCustom, setIsCreatingCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customMuscle, setCustomMuscle] = useState('Espalda')
  const [customSecondary, setCustomSecondary] = useState('')
  const [customEquipment, setCustomEquipment] = useState('Barra')
  const [customUrl, setCustomUrl] = useState('')
  const [isSavingCustom, setIsSavingCustom] = useState(false)

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
      note: 'Controlar fase excéntrica 2 seg',
      sets: [
        { id: 's-1', setNumber: 1, weight: 10, reps: 8, rir: 2, isCompleted: false, isPr: false },
        { id: 's-2', setNumber: 2, weight: 10, reps: 8, rir: 1, isCompleted: false, isPr: false },
        { id: 's-3', setNumber: 3, weight: 10, reps: 6, rir: 0, isCompleted: false, isPr: true },
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
        { id: 's-4', setNumber: 1, weight: 60, reps: 10, rir: 2, isCompleted: false, isPr: false },
        { id: 's-5', setNumber: 2, weight: 80, reps: 8, rir: 1, isCompleted: false, isPr: false },
      ],
    },
    {
      id: 'ex-3',
      exerciseId: 'e3',
      name: 'Remo en T (T-Bar Row)',
      targetMuscle: 'Espalda (Densidad Media y Dorsal)',
      secondaryMuscle: 'Romboides, Bíceps',
      anatomicalImageUrl:
        'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lever-T-bar-Row.gif',
      previousBest: '65 kg × 10',
      sets: [
        { id: 's-6', setNumber: 1, weight: 60, reps: 10, rir: 2, isCompleted: false, isPr: false },
        { id: 's-7', setNumber: 2, weight: 65, reps: 8, rir: 1, isCompleted: false, isPr: false },
      ],
    },
    {
      id: 'ex-4',
      exerciseId: 'b1',
      name: 'Predicador con barra Z (Banco Scott)',
      targetMuscle: 'Brazos (Bíceps Cabeza Corta y Braquial)',
      secondaryMuscle: 'Antebrazo',
      anatomicalImageUrl:
        'https://fitnessprogramer.com/wp-content/uploads/2021/02/Z-Bar-Preacher-Curl.gif',
      previousBest: '32.5 kg × 10',
      sets: [
        { id: 's-8', setNumber: 1, weight: 30, reps: 10, rir: 1, isCompleted: false, isPr: false },
        { id: 's-9', setNumber: 2, weight: 32.5, reps: 8, rir: 1, isCompleted: false, isPr: true },
      ],
    },
  ])

  // 1. Revisión de sesión Auth
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

  // Cargar ejercicios y entrenamientos desde Supabase
  const loadCustomExercises = async () => {
    try {
      const supabase = createClient()
      if (!supabase) return
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('created_at', { ascending: false })

      if (data && !error && data.length > 0) {
        const mappedCustom: CatalogExercise[] = data.map((row: any) => ({
          id: String(row.id),
          name: row.name,
          target_muscle: row.target_muscle || 'Espalda',
          secondary_muscle: row.secondary_muscle || 'Sinergistas',
          equipment: row.equipment || 'Barra',
          anatomical_image_url:
            row.image_url ||
            VERIFIED_MUSCLE_GIFS[row.target_muscle] ||
            VERIFIED_MUSCLE_GIFS.Espalda,
        }))

        setCatalog((prev) => {
          const existingIds = new Set(prev.map((i) => i.id))
          const uniqueNew = mappedCustom.filter((i) => !existingIds.has(i.id))
          return [...uniqueNew, ...prev]
        })
      }
    } catch (err) {
      console.warn('Aviso al cargar ejercicios:', err)
    }
  }

  const loadHistory = async () => {
    if (!user) return
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
      }
    } catch (err) {
      console.warn('Aviso cargando historial:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadCustomExercises()
      loadHistory()
    }
  }, [user])

  useEffect(() => {
    if (user && (activeTab === 'history' || activeTab === 'home')) {
      loadHistory()
    }
  }, [activeTab, user])

  // Manejador del cronómetro
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionRunning) {
      interval = setInterval(() => setSessionSeconds((prev) => prev + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionRunning])

  // Manejador del descanso
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

  const updateExerciseNote = (exerciseId: string, noteText: string) => {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, note: noteText } : ex))
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

  const handleStartRoutineTemplate = (template: RoutineTemplate) => {
    const builtExercises: WorkoutExercise[] = template.items.map((item, idx) => {
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

    setWorkoutName(template.title)
    setExercises(builtExercises)
    setSessionSeconds(0)
    setIsSessionRunning(true)
    setActiveTab('workout')
  }

  const handleSelectCatalogExercise = (item: CatalogExercise) => {
    const newExercise: WorkoutExercise = {
      id: `ex-${Date.now()}`,
      exerciseId: item.id,
      name: item.name,
      targetMuscle: item.target_muscle,
      secondaryMuscle: item.secondary_muscle,
      anatomicalImageUrl: item.anatomical_image_url,
      previousBest: 'Registrar peso',
      note: '',
      sets: [
        { id: `s-${Date.now()}-1`, setNumber: 1, weight: 20, reps: 10, rir: 2, isCompleted: false, isPr: false },
        { id: `s-${Date.now()}-2`, setNumber: 2, weight: 20, reps: 10, rir: 1, isCompleted: false, isPr: false },
      ],
    }
    setExercises([...exercises, newExercise])
    setIsCreatingCustom(false)
    setSearchQuery('')
    setSelectedMuscleFilter('Todos')
    setActiveTab('workout')
  }

  const handleUpdateExerciseImage = (newUrl: string) => {
    if (!selectedPreview || !newUrl.trim()) return
    const cleanUrl = newUrl.trim()

    setSelectedPreview({ ...selectedPreview, anatomical_image_url: cleanUrl })
    setCatalog((prev) =>
      prev.map((item) =>
        item.id === selectedPreview.id ? { ...item, anatomical_image_url: cleanUrl } : item
      )
    )
    setExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === selectedPreview.id ? { ...ex, anatomicalImageUrl: cleanUrl } : ex
      )
    )
    setEditImageUrl('')
  }

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim()) return

    setIsSavingCustom(true)
    let newId = `custom-${Date.now()}`
    const fallbackUrl =
      VERIFIED_MUSCLE_GIFS[customMuscle] ||
      'https://fitcron.com/wp-content/uploads/2021/04/18661301-Wide-Grip-Pull-Up-on-Dip-Cage_Back_720.gif'
    const finalUrl = customUrl.trim() || fallbackUrl

    try {
      const supabase = createClient()
      if (supabase && user) {
        const { data } = await supabase
          .from('exercises')
          .insert({
            name: customName.trim(),
            target_muscle: customMuscle,
            equipment: customEquipment,
            image_url: finalUrl,
          })
          .select()
          .single()

        if (data?.id) newId = String(data.id)
      }
    } catch (err) {
      console.warn('Error al guardar en Supabase:', err)
    } finally {
      setIsSavingCustom(false)
    }

    const created: CatalogExercise = {
      id: newId,
      name: customName.trim(),
      target_muscle: customMuscle,
      secondary_muscle: customSecondary.trim() || 'Sinergistas',
      equipment: customEquipment,
      anatomical_image_url: finalUrl,
    }

    setCatalog((prev) => [created, ...prev])
    handleSelectCatalogExercise(created)
    setCustomName('')
    setCustomSecondary('')
    setCustomUrl('')
    setIsCreatingCustom(false)
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

  const filteredCatalog = useMemo(() => {
    return catalog.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.target_muscle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.equipment.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesMuscle =
        selectedMuscleFilter === 'Todos' ||
        item.target_muscle.toLowerCase().includes(selectedMuscleFilter.toLowerCase())

      return matchesSearch && matchesMuscle
    })
  }, [catalog, searchQuery, selectedMuscleFilter])

  const filteredTemplates = useMemo(() => {
    return ROUTINE_TEMPLATES.filter((t) => t.splitCategory === selectedSplitTab)
  }, [selectedSplitTab])

  const toggleWorkoutDetails = async (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null)
      return
    }
    setExpandedWorkoutId(workoutId)
    if (workoutSetsMap[workoutId]) return

    setIsLoadingSetsId(workoutId)
    try {
      const supabase = createClient()
      if (!supabase) return
      const { data, error } = await supabase
        .from('workout_sets')
        .select('*')
        .eq('workout_id', workoutId)
        .order('set_number', { ascending: true })

      if (data && !error) {
        setWorkoutSetsMap((prev) => ({ ...prev, [workoutId]: data }))
      }
    } catch (err) {
      console.warn('Error cargando series:', err)
    } finally {
      setIsLoadingSetsId(null)
    }
  }

  const deleteWorkoutFromHistory = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const supabase = createClient()
      if (!supabase) return
      const { error } = await supabase.from('workouts').delete().eq('id', workoutId)
      if (!error) {
        setHistoryList((prev) => prev.filter((item) => item.id !== workoutId))
        if (expandedWorkoutId === workoutId) setExpandedWorkoutId(null)
      }
    } catch (err) {
      console.warn('Error al eliminar:', err)
    }
  }

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
        alert('Error en Supabase al guardar: ' + workoutError.message)
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
          const { error: setsError } = await supabase.from('workout_sets').insert(setsToInsert)
          if (setsError) {
            console.warn('Aviso al guardar series:', setsError.message)
          }
        }
      }

      setSaveSuccess(true)
      await loadHistory()
    } catch (err: any) {
      alert('Error inesperado: ' + (err?.message || err))
    } finally {
      setIsSaving(false)
    }
  }

  // Si no hay usuario logueado
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
            Tus rutinas, pesos y series se guardarán en tu cuenta única.
          </p>

          {authError && (
            <div className="mb-4 bg-red-950/60 border border-red-800/80 p-2.5 rounded-xl text-xs text-red-300 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                Correo Electrónico
              </label>
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
              <label className="text-[11px] font-bold text-neutral-400 block mb-1">
                Contraseña
              </label>
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
              {authSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : authIsRegister ? (
                'Registrar y Entrar'
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <button
            onClick={() => {
              setAuthIsRegister(!authIsRegister)
              setAuthError('')
            }}
            className="w-full mt-4 text-center text-xs text-neutral-400 hover:text-white transition"
          >
            {authIsRegister
              ? '¿Ya tienes cuenta? Inicia sesión aquí'
              : '¿Primera vez? Toca aquí para registrarte'}
          </button>
        </div>
      </main>
    )
  }

  // Interfaz Principal
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-4 max-w-md mx-auto pb-28">
      {/* ================= VISTA 0: PANTALLA PRINCIPAL (INICIO) ================= */}
      {activeTab === 'home' && (
        <div className="space-y-5">
          <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Tracker Personal
              </span>
              <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
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

              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-3 py-1.5 text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                  Peso
                </span>
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

          {/* Banner de Sesión en Curso */}
          {(sessionSeconds > 0 || workoutStats.totalCompletedSets > 0) && (
            <div
              onClick={() => setActiveTab('workout')}
              className="bg-lime-400/10 border border-lime-400/40 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-lime-400/15 transition shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lime-400 text-neutral-950 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-lime-400 block">
                    Sesión en curso • {formatTime(sessionSeconds)}
                  </span>
                  <h3 className="text-sm font-bold text-white">{workoutName}</h3>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-lime-400 text-neutral-950 font-bold text-xs rounded-xl">
                Continuar →
              </button>
            </div>
          )}

          {/* Métricas Rápidas */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Sesiones
              </span>
              <span className="text-lg font-extrabold font-mono text-white mt-0.5 block">
                {historySummaryStats.totalSessions}
              </span>
              <span className="text-[10px] text-lime-400 font-medium">Guardadas</span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Tonelaje
              </span>
              <span className="text-lg font-extrabold font-mono text-lime-400 mt-0.5 block">
                {historySummaryStats.accumulatedVolume} <span className="text-xs">kg</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">Histórico</span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                Objetivo
              </span>
              <span className="text-lg font-extrabold font-mono text-white mt-0.5 block">
                RIR 1 - 2
              </span>
              <span className="text-[10px] text-lime-400 font-medium">Tensión Mec.</span>
            </div>
          </div>

          {/* Calentamiento Articular */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5">
            <div
              onClick={() => setShowWarmupGuide(!showWarmupGuide)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-neutral-800 text-lime-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Calentamiento Articular y Series de Aproximación
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Lubricación antes de las series efectivas
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-neutral-400 transition-transform ${
                  showWarmupGuide ? 'rotate-90 text-lime-400' : ''
                }`}
              />
            </div>

            {showWarmupGuide && (
              <div className="mt-3 pt-3 border-t border-neutral-800 space-y-2 text-xs text-neutral-300">
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/70">
                  <span className="text-lime-400 font-bold block">1. Torso:</span>
                  Extensión/flexión de codos ligera + rotaciones de hombro (2 × 15).
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/70">
                  <span className="text-lime-400 font-bold block">2. Pierna:</span>
                  Movilidad 90/90 de cadera y sentadillas sin peso.
                </div>
              </div>
            )}
          </div>

          {/* Selector de División */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-lime-400" /> Programas Estructurados
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl mb-4">
              {(['Torso / Pierna', 'Push / Pull / Legs'] as const).map((split) => (
                <button
                  key={split}
                  onClick={() => {
                    setSelectedSplitTab(split)
                    setExpandedRoutineId(
                      split === 'Torso / Pierna' ? 'tp-torso-a' : 'ppl-push'
                    )
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition ${
                    selectedSplitTab === split
                      ? 'bg-lime-400 text-neutral-950 shadow-md shadow-lime-400/20'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {split}
                </button>
              ))}
            </div>

            {/* Listado de Rutinas */}
            <div className="space-y-3.5">
              {filteredTemplates.map((routine) => {
                const isExpanded = expandedRoutineId === routine.id

                return (
                  <div
                    key={routine.id}
                    className={`bg-neutral-900 border rounded-2xl p-4 transition shadow-xl ${
                      isExpanded ? 'border-lime-400/50' : 'border-neutral-800'
                    }`}
                  >
                    <div
                      onClick={() =>
                        setExpandedRoutineId(isExpanded ? null : routine.id)
                      }
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-lime-400/15 text-lime-400 border border-lime-400/30">
                          {routine.dayBadge}
                        </span>
                        <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-lime-400" /> {routine.estimatedDuration}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-extrabold text-white">
                            {routine.title}
                          </h3>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {routine.subtitle}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-5 h-5 text-neutral-400 shrink-0 ml-2 transition-transform ${
                            isExpanded ? 'rotate-90 text-lime-400' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-3.5 border-t border-neutral-800 space-y-2.5">
                        {routine.items.map((item, idx) => {
                          const exInfo =
                            catalog.find((c) => c.id === item.exerciseId) ||
                            ANATOMICAL_EXERCISES.find((c) => c.id === item.exerciseId)

                          if (!exInfo) return null

                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedPreview(exInfo)}
                              className="flex items-center justify-between bg-neutral-950/90 border border-neutral-800/80 p-2 rounded-xl cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-11 h-12 rounded-lg bg-white p-0.5 border border-neutral-700 shrink-0 overflow-hidden">
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
                                  <div className="text-[11px] text-lime-400 font-medium truncate">
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

                        <button
                          onClick={() => handleStartRoutineTemplate(routine)}
                          className="w-full mt-2 py-3 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-neutral-950" /> Iniciar {routine.title}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
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

              {/* Botón de Iniciar / Pausar Cronómetro */}
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
                  {isSessionRunning ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 fill-neutral-950" />
                  )}
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

          {/* Tarjetas de ejercicios */}
          <div className="space-y-4">
            {exercises.map((ex) => {
              const best1RM = Math.max(
                ...ex.sets.map((s) => calculate1RM(s.weight, s.reps)),
                0
              )

              return (
                <section
                  key={ex.id}
                  className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 shadow-xl"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() =>
                          setSelectedPreview({
                            id: ex.exerciseId,
                            name: ex.name,
                            target_muscle: ex.targetMuscle,
                            secondary_muscle: ex.secondaryMuscle,
                            equipment: '',
                            anatomical_image_url: ex.anatomicalImageUrl,
                          })
                        }
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

                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="text-neutral-500 hover:text-red-400 transition p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tabla de Series con auto-select de peso */}
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
                          <button
                            onClick={() => removeSetFromExercise(ex.id, set.id)}
                            className="hover:text-red-400 transition"
                          >
                            #{set.setNumber}
                          </button>
                          {set.isPr && <Trophy className="w-3.5 h-3.5 text-yellow-400 inline" />}
                        </div>

                        {/* INPUT PESO CORREGIDO */}
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
                                updateSetValue(
                                  ex.id,
                                  set.id,
                                  'weight',
                                  val === '' ? 0 : Number(val)
                                )
                              }
                            }}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        {/* INPUT REPS */}
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
                                updateSetValue(
                                  ex.id,
                                  set.id,
                                  'reps',
                                  val === '' ? 0 : Number(val)
                                )
                              }
                            }}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        {/* INPUT RIR */}
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
                                updateSetValue(
                                  ex.id,
                                  set.id,
                                  'rir',
                                  val === '' ? 0 : Number(val)
                                )
                              }
                            }}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 text-center text-sm font-semibold focus:outline-none focus:border-lime-400"
                          />
                        </div>

                        <div className="col-span-2 flex justify-end">
                          <button
                            onClick={() => toggleSetComplete(ex.id, set.id)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                              set.isCompleted
                                ? 'bg-lime-400 text-neutral-950 font-bold shadow-md'
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
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
            <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold">
              Tus Registros Personales
            </span>
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
                const sets = workoutSetsMap[item.id] || []

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleWorkoutDetails(item.id)}
                    className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 shadow-lg cursor-pointer transition"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-3.5 h-3.5 text-lime-400" />
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
                          <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                            Volumen
                          </span>
                          <span className="text-base font-extrabold font-mono text-lime-400">
                            {item.total_volume_kg || 0} kg
                          </span>
                        </div>

                        <button
                          onClick={(e) => deleteWorkoutFromHistory(item.id, e)}
                          className="p-2 bg-neutral-950 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 border border-neutral-800 rounded-xl transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-2">
                        {sets.map((s: any, idx: number) => (
                          <div
                            key={s.id || idx}
                            className="flex justify-between items-center bg-neutral-950/80 border border-neutral-800/60 px-3 py-2 rounded-xl text-xs"
                          >
                            <span className="text-neutral-300">Serie #{s.set_number}</span>
                            <span className="font-mono font-bold text-lime-400">
                              {s.weight_kg} kg × {s.reps} reps (RIR {s.rir})
                            </span>
                          </div>
                        ))}
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
              <p className="text-xs text-neutral-500 mt-1">
                Tus entrenamientos guardados aparecerán aquí.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ================= VISTA 3: BIBLIOTECA ================= */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          <header className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-lime-400 font-bold">
                Biblioteca Anatómica
              </span>
              <h1 className="text-xl font-extrabold text-neutral-100">Ejercicios</h1>
            </div>
            <button
              onClick={() => setIsCreatingCustom(!isCreatingCustom)}
              className="px-3 py-2 bg-lime-400 hover:bg-lime-300 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
            >
              {isCreatingCustom ? <ArrowLeft className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
              {isCreatingCustom ? 'Volver' : 'Crear'}
            </button>
          </header>

          <div className="space-y-2">
            {filteredCatalog.map((item) => (
              <div
                key={item.id}
                className="w-full p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800/80 flex items-center justify-between"
              >
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => setSelectedPreview(item)}
                >
                  <div className="w-14 h-16 rounded-xl bg-white p-1 border border-neutral-700/60 overflow-hidden shrink-0">
                    <AnatomicalImage
                      src={item.anatomical_image_url}
                      alt={item.name}
                      targetMuscle={item.target_muscle}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-100">{item.name}</div>
                    <div className="text-xs text-lime-400">{item.target_muscle}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectCatalogExercise(item)}
                  className="w-8 h-8 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-lime-400"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= DESCANSO FLOTANTE ================= */}
      {isRestActive && restSeconds !== null && (
        <aside className="fixed bottom-20 left-4 right-4 max-w-md mx-auto bg-neutral-900/95 border border-neutral-800 p-3.5 rounded-2xl flex items-center justify-between shadow-2xl z-40">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">
              Descanso
            </span>
            <span className="text-2xl font-mono font-bold text-lime-400">
              {formatTime(restSeconds)}
            </span>
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

      {/* ================= NAVEGACIÓN INFERIOR ================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-neutral-950/95 border-t border-neutral-800/80 flex justify-around py-3 z-40">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'home' ? 'text-lime-400 font-bold' : 'text-neutral-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px]">Inicio</span>
        </button>

        <button
          onClick={() => setActiveTab('workout')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'workout' ? 'text-lime-400 font-bold' : 'text-neutral-500'
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[11px]">Entrenar</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'history' ? 'text-lime-400 font-bold' : 'text-neutral-500'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[11px]">Historial</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'library' ? 'text-lime-400 font-bold' : 'text-neutral-500'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px]">Biblioteca</span>
        </button>
      </nav>

      {/* ================= MODAL DE RESUMEN ================= */}
      {isSummaryOpen && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl">
            <Trophy className="w-12 h-12 text-lime-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-1">¡Entrenamiento Finalizado!</h3>
            <p className="text-xs text-neutral-400 mb-6">
              Volumen total: {workoutStats.totalVolume} kg en {formatTime(sessionSeconds)}
            </p>

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
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : saveSuccess ? (
                  'Guardado con Éxito'
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar en Supabase
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setIsSummaryOpen(false)
                  setSaveSuccess(false)
                }}
                className="w-full py-2.5 text-neutral-400 hover:text-white text-xs font-medium transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}