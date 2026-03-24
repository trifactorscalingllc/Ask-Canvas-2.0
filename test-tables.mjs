import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let formattedUrl = supabaseUrl || 'https://dummy.supabase.co'
if (formattedUrl && !formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`
if (formattedUrl && !formattedUrl.includes('.supabase.co')) formattedUrl = `${formattedUrl}.supabase.co`

const supabase = createClient(formattedUrl, supabaseAnonKey)

async function testAllTables() {
  console.log('--- STARTING COMPREHENSIVE TABLE TEST ---')
  
  const testEmail = `diagnostic.tables.${Date.now()}@example.com`
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'DiagnosticPassword123!',
  })

  if (authError || !authData.session) {
    console.error('❌ Auth Failed.', authError)
    return
  }
  
  const userId = authData.user.id
  console.log(`✅ Auth Success! User ID: ${userId}`)
  
  await supabase.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  })

  // 1. Test `users` table
  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    email: testEmail,
    encrypted_canvas_key: "TEST",
    iv: "TEST",
    name: "Diag"
  })
  console.log(`[users] Insert: ${userError ? '❌ ' + userError.message : '✅ Success'}`)

  // 2. Test `chats` table
  const { error: chatError } = await supabase.from('chats').insert({
    user_id: userId,
    messages: [{ role: 'user', content: 'Diagnostic message' }]
  })
  console.log(`[chats] Insert: ${chatError ? '❌ ' + chatError.message : '✅ Success'}`)

  // 3. Test `feedback` table
  const { error: feedbackError } = await supabase.from('feedback').insert({
    user_id: userId,
    query: "Diag query",
    response: "Diag response",
    is_helpful: true
  })
  console.log(`[feedback] Insert: ${feedbackError ? '❌ ' + feedbackError.message : '✅ Success'}`)

  // 4. Test `proposed_tools` table
  const { error: toolsError } = await supabase.from('proposed_tools').insert({
    user_id: userId,
    requested_feature: "Diagnostic Feature"
  })
  console.log(`[proposed_tools] Insert: ${toolsError ? '❌ ' + toolsError.message : '✅ Success'}`)

  console.log('--- TEST COMPLETE ---')
}

testAllTables()
