// SlipSync Shared Types

export type TransactionType = 'income' | 'expense'

export interface User {
  id: string
  email: string
  name: string
  google_id?: string
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  amount: number
  type: TransactionType
  source: string
  sender_name: string
  note?: string
  slip_url?: string
  transaction_date: string
  created_at: string
}

export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  user_id?: string
  created_at: string
}

export interface ParsedQRData {
  amount: number
  type: TransactionType
  sender_name: string
  source: string
  transaction_date: string
  mobile?: string
}

// Thai Bank slip formats
export interface SlipData {
  amount: number
  sender_name: string
  receiver_name?: string
  date: string
  time: string
  reference: string
  bank: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface TransactionListResponse {
  transactions: Transaction[]
}

export interface PresignedUrlResponse {
  url: string
  key: string
}
