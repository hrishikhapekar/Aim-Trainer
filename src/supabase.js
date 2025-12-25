import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

export const saveScore = async (scoreData) => {
  try {
    const { error } = await supabase
      .from('scores')
      .insert([{
        score: scoreData.score,
        accuracy: scoreData.accuracy,
        max_combo: scoreData.maxCombo,
        created_at: new Date().toISOString()
      }])
    
    return !error
  } catch (error) {
    console.error('Error saving score:', error)
    return false
  }
}

export const getTopScores = async () => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(10)
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching scores:', error)
    return []
  }
}