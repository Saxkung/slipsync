import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { HTTPException } from 'hono/http-exception'
import { D1Database, R2Bucket } from '@cloudflare/workers-types'

// Types
type Env = {
  DB: D1Database
  STORAGE: R2Bucket
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  AUTH_SECRET: string
}

type Transaction = {
  id: string
  user_id: string
  amount: number
  type: 'income' | 'expense'
  source: string
  sender_name: string
  note?: string
  slip_url?: string
  transaction_date: string
  created_at: string
}

// Initialize app
const app = new Hono<{ Bindings: Env }>()

// Middleware
app.use('*', logger())
app.use('*', cors({
  origin: '*',
  credentials: true,
}))

// Auth middleware
const auth = async (c: any, next: any) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  // TODO: Verify JWT token
  const userId = token // Placeholder
  c.set('userId', userId)
  await next()
}

// ==================== AUTH ====================

// Google OAuth
app.get('/api/auth/google', async (c) => {
  const clientId = c.env.GOOGLE_CLIENT_ID
  const redirectUri = `${c.req.url}/api/auth/google/callback`
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'email profile')
  url.searchParams.set('access_type', 'offline')
  
  return c.redirect(url.toString())
})

// Register
app.post('/api/auth/register', async (c) => {
  const { email, password, name } = await c.req.json()
  
  // Validate input
  if (!email || !password || !name) {
    throw new HTTPException(400, { message: 'Missing required fields' })
  }
  
  // Hash password (placeholder - use proper bcrypt)
  const hashedPassword = password // TODO: hash
  
  // Insert user
  const userId = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO users (id, email, name, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(userId, email, name, hashedPassword, new Date().toISOString()).run()
  
  // TODO: Generate JWT token
  
  return c.json({ success: true, userId })
})

// Login
app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  
  const user = await c.env.DB.prepare(`
    SELECT * FROM users WHERE email = ?
  `).bind(email).first()
  
  if (!user) {
    throw new HTTPException(401, { message: 'Invalid credentials' })
  }
  
  // TODO: Verify password
  
  // Generate JWT
  const token = crypto.randomUUID() // Placeholder - use proper JWT
  
  return c.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } })
})

// ==================== TRANSACTIONS ====================

// List transactions
app.get('/api/transactions', auth, async (c) => {
  const userId = c.get('userId')
  
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM transactions 
    WHERE user_id = ?
    ORDER BY transaction_date DESC
    LIMIT 100
  `).bind(userId).all()
  
  return c.json({ transactions: results })
})

// Create transaction
app.post('/api/transactions', auth, async (c) => {
  const userId = c.get('userId')
  const data = await c.req.json<Partial<Transaction>>()
  
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  await c.env.DB.prepare(`
    INSERT INTO transactions (id, user_id, amount, type, source, sender_name, note, slip_url, transaction_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    data.amount,
    data.type,
    data.source,
    data.sender_name,
    data.note || null,
    data.slip_url || null,
    data.transaction_date,
    now
  ).run()
  
  return c.json({ success: true, id })
})

// Get transaction
app.get('/api/transactions/:id', auth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  
  const transaction = await c.env.DB.prepare(`
    SELECT * FROM transactions WHERE id = ? AND user_id = ?
  `).bind(id, userId).first()
  
  if (!transaction) {
    throw new HTTPException(404, { message: 'Transaction not found' })
  }
  
  return c.json({ transaction })
})

// Update transaction
app.put('/api/transactions/:id', auth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const data = await c.req.json()
  
  const existing = await c.env.DB.prepare(`
    SELECT * FROM transactions WHERE id = ? AND user_id = ?
  `).bind(id, userId).first()
  
  if (!existing) {
    throw new HTTPException(404, { message: 'Transaction not found' })
  }
  
  await c.env.DB.prepare(`
    UPDATE transactions 
    SET amount = ?, type = ?, source = ?, sender_name = ?, note = ?, transaction_date = ?
    WHERE id = ? AND user_id = ?
  `).bind(
    data.amount ?? existing.amount,
    data.type ?? existing.type,
    data.source ?? existing.source,
    data.sender_name ?? existing.sender_name,
    data.note ?? existing.note,
    data.transaction_date ?? existing.transaction_date,
    id,
    userId
  ).run()
  
  return c.json({ success: true })
})

// Delete transaction
app.delete('/api/transactions/:id', auth, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  
  await c.env.DB.prepare(`
    DELETE FROM transactions WHERE id = ? AND user_id = ?
  `).bind(id, userId).run()
  
  return c.json({ success: true })
})

// ==================== UPLOAD ====================

// Get presigned URL for R2 upload
app.get('/api/upload/presigned-url', auth, async (c) => {
  const userId = c.get('userId')
  const filename = c.req.query('filename')
  
  if (!filename) {
    throw new HTTPException(400, { message: 'Filename required' })
  }
  
  const key = `slips/${userId}/${Date.now()}-${filename}`
  const url = await c.env.STORAGE.createSignedUrl(key, 'upload', 3600)
  
  return c.json({ url, key })
})

// Upload and parse slip
app.post('/api/upload/slip', auth, async (c) => {
  const userId = c.get('userId')
  
  // Get form data with image
  const formData = await c.req.formData()
  const file = formData.get('file') as File
  const qrData = formData.get('qr_data') as string
  
  if (!file) {
    throw new HTTPException(400, { message: 'File required' })
  }
  
  // Upload to R2
  const key = `slips/${userId}/${Date.now()}-${file.name}`
  await c.env.STORAGE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  })
  
  // Parse QR data if provided
  let parsedData: Partial<Transaction> = {}
  if (qrData) {
    try {
      parsedData = parseQRData(qrData)
    } catch (err) {
      console.error('QR parse error:', err)
    }
  }
  
  // Create transaction with slip URL
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  
  await c.env.DB.prepare(`
    INSERT INTO transactions (id, user_id, amount, type, source, sender_name, slip_url, transaction_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    userId,
    parsedData.amount || 0,
    parsedData.type || 'expense',
    parsedData.source || 'Unknown',
    parsedData.sender_name || 'Unknown',
    key,
    parsedData.transaction_date || now,
    now
  ).run()
  
  return c.json({ 
    success: true, 
    id,
    slip_url: key,
    parsed: parsedData 
  })
})

// Parse QR code data (PromptPay format)
function parseQRData(data: string): Partial<Transaction> {
  // Simplified PromptPay QR parsing
  // Real implementation needs full PromptPay spec
  
  const result: Partial<Transaction> = {
    type: 'expense',
    source: 'PromptPay',
  }
  
  // Extract amount
  const amountMatch = data.match(/(\d+\.\d{2})/)
  if (amountMatch) {
    result.amount = parseFloat(amountMatch[1])
  }
  
  // Extract mobile number (sender)
  const mobileMatch = data.match(/08\d{8,9}/)
  if (mobileMatch) {
    result.sender_name = mobileMatch[0]
  }
  
  return result
}

// ==================== HEALTH CHECK ====================

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Error handling
app.onError((err, c) => {
  console.error('Error:', err)
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app
