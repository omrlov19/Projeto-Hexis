export interface Habit {
  id: string
  user_id: string
  title: string
  goal_value: number
  created_at: string
  icon?: string | null
  color?: string | null
  category?: string | null
  period?: string | null
  target_value?: number | null
  target_unit?: string | null
  goal_type?: 'check' | 'time' | null
  frequency_days?: string[] | null
  position?: number | null
  notification_time?: string | null
}

export interface HabitLog {
  id: string
  habit_id: string
  date: string
  current_value: number
  achieved_value?: number | null
  achieved_unit?: string | null
}

export interface HabitWithStatus extends Habit {
  completed: boolean
  achieved_value?: number | null
  achieved_unit?: string | null
}

export interface CreateHabitData {
  title: string
  icon?: string
  color?: string
  category?: string
  period?: string
  target_value?: number
  target_unit?: string
  goal_type?: 'check' | 'time'
  frequency_days?: string[]
}
