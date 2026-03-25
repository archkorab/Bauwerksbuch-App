import supabase from './supabaseClient'

// ─── SIGN UP ─────────────────────────────────────────────
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: import.meta.env.VITE_APP_URL + '/auth/callback'
    }
  })
  if (error) return { error: error.message }
  return { message: 'Check your email and click the confirmation link!', user: data.user }
}

// ─── LOG IN ──────────────────────────────────────────────
export async function logIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) return { error: error.message }
  return { user: data.user, session: data.session }
}

// ─── LOG OUT ─────────────────────────────────────────────
export async function logOut() {
  const { error } = await supabase.auth.signOut()
  if (error) return { error: error.message }
  return { message: 'Logged out successfully' }
}

// ─── GET CURRENT USER ────────────────────────────────────
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user // null if not logged in
}

// ─── FORGOT PASSWORD ─────────────────────────────────────
export async function forgotPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: import.meta.env.VITE_APP_URL + '/update-password'
  })
  if (error) return { error: error.message }
  return { message: 'Password reset email sent!' }
}

// ─── UPDATE PASSWORD ─────────────────────────────────────
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { message: 'Password updated successfully!' }
}
```

---

## PART 8 — Create your `.env` file

In Replit, go to the **`client/` folder** and create a new file called `.env`, then paste this — replacing the placeholder values with your real keys from the Supabase dashboard:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=https://yourapp.yourname.repl.co