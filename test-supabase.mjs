import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let formattedUrl = supabaseUrl || 'https://dummy.supabase.co'
if (formattedUrl && !formattedUrl.startsWith('http')) formattedUrl = `https://${formattedUrl}`
if (formattedUrl && !formattedUrl.includes('.supabase.co')) formattedUrl = `${formattedUrl}.supabase.co`

const supabase = createClient(formattedUrl, supabaseAnonKey)

async function runTest() {
  console.log('--- STARTING DIAGNOSTIC SCRIPT ---')
  console.log('Target URL:', formattedUrl)
  
  const testEmail = `diagnostic.${Date.now()}@example.com`
  console.log(`\n[STEP 1] Generating Test User: ${testEmail}`)
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'DiagnosticPassword123!',
  })

  if (authError) {
    console.error('❌ FAILED: Supabase Auth Rejected the Signup.')
    console.error('Reason:', authError.message)
    return
  }

  if (!authData.session) {
    console.error('❌ FAILED: SIGNUP SUCCEEDED BUT NO SESSION RETURNED.')
    console.error('CRITICAL ERROR: You STILL have "Confirm Email" turned ON in your Supabase Auth Settings!')
    console.error('Because Confirm Email is on, the user is not automatically logged in, preventing rows from being inserted into your custom tables under their ID.')
    return
  }
  
  console.log('✅ Auth Success! Session securely obtained for new user.')
  console.log(`\n[STEP 2] Attempting to bypass RLS and insert row into 'users' table using returned session...`)
  
  const { data: insertData, error: insertError } = await supabase.from('users').insert({
    id: authData.user.id,
    email: testEmail,
    encrypted_canvas_key: "TEST_KEY_ENCRYPTED",
    iv: "TEST_IV",
    name: "Diagnostic Execution"
  }).select()

  if (insertError) {
    console.error('❌ FAILED: Supabase Database Rejected the Row Insert.')
    console.error('Reason:', insertError.message)
    return
  }

  console.log('✅ Database Insert Success! Row added to `users` schema.')
  
  fs.writeFileSync('result.json', JSON.stringify({
    success: true,
    authData: authData.user.id,
    insertData: insertData
  }, null, 2))

  console.log('\n--- DIAGNOSTIC COMPLETE ---')
}

runTest()
