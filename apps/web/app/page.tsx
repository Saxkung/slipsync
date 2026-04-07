'use client'

import { useState, useRef } from 'react'
import { Upload, Camera, Wallet, TrendingUp, TrendingDown, Calendar, User, Image as ImageIcon, Loader2 } from 'lucide-react'

interface Transaction {
  id: string
  amount: number
  type: 'income' | 'expense'
  sender_name: string
  source: string
  transaction_date: string
  note?: string
  slip_url?: string
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [uploading, setUploading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  // QR Scanner Setup with qr-scanner
  const scanQRCode = async (file: File) => {
    setScanning(true)
    try {
      const QrScanner = (await import('qr-scanner')).default
      const result = await QrScanner.scanImage(file)
      console.log('QR Result:', result.data)
      // Parse QR data
      // Format: PromptPay format or bank specific format
      const parsed = parseQRData(result.data)
      if (parsed) {
        addTransaction(parsed)
      }
    } catch (err) {
      console.error('QR Scan error:', err)
      alert('ไม่พบ QR Code ในรูป กรุณาลองใหม่')
    } finally {
      setScanning(false)
    }
  }

  // OCR with Tesseract.js
  const extractText = async (file: File) => {
    setScanning(true)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('tha')
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      
      console.log('OCR Text:', text)
      // Parse extracted Thai text for amount, name, date
      const parsed = parseOCRText(text)
      if (parsed) {
        addTransaction(parsed)
      }
    } catch (err) {
      console.error('OCR error:', err)
      alert('ไม่สามารถอ่านข้อความในรูป')
    } finally {
      setScanning(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    // First try QR scan, then fallback to OCR
    try {
      await scanQRCode(file)
    } catch {
      // If QR fails, try OCR
      await extractText(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file)
    }
  }

  const addTransaction = (data: Partial<Transaction>) => {
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      amount: data.amount || 0,
      type: data.type || 'expense',
      sender_name: data.sender_name || 'Unknown',
      source: data.source || 'PromptPay',
      transaction_date: data.transaction_date || new Date().toISOString(),
      note: data.note,
    }
    setTransactions(prev => [newTransaction, ...prev])
  }

  // Parse QR code data (PromptPay format)
  const parseQRData = (data: string): Partial<Transaction> | null => {
    try {
      // PromptPay QR format parsing
      // This is simplified - real implementation needs full PromptPay spec
      const amountMatch = data.match(/(\d+\.?\d*)/)
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0
      
      return {
        amount,
        type: amount >= 0 ? 'income' : 'expense',
        sender_name: 'PromptPay',
        source: 'PromptPay',
        transaction_date: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  // Parse OCR extracted text
  const parseOCRText = (text: string): Partial<Transaction> | null => {
    try {
      // Extract amount - look for Thai number format
      const amountMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/)
      let amount = 0
      if (amountMatch) {
        amount = parseFloat(amountMatch[1].replace(/,/g, ''))
      }
      
      // Extract name
      const nameMatch = text.match(/(?:ชื่อ|ผู้โอน|ผู้รับ)[:\s]+([ก-๙a-zA-Z\s]+)/i)
      const name = nameMatch ? nameMatch[1].trim() : 'Unknown'
      
      return {
        amount,
        type: 'expense',
        sender_name: name,
        source: 'Manual Entry',
        transaction_date: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpense

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-primary-600" />
            SlipSync
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Area */}
        <section 
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file)
            }}
          />
          
          {scanning ? (
            <div className="space-y-3">
              <Loader2 className="w-12 h-12 mx-auto text-primary-600 animate-spin" />
              <p className="text-gray-600">กำลังอ่านข้อมูลจากรูป...</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex justify-center gap-4">
                  <Camera className="w-12 h-12 text-gray-400" />
                  <Upload className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-gray-600">
                  ถ่ายรูปหรืออัพโหลดสลิปเพื่อเพิ่มรายการ
                </p>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  เลือกรูป
                </button>
              </div>
            </>
          )}
        </section>

        {/* Summary Cards */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">รายรับ</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              ฿{totalIncome.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">รายจ่าย</span>
            </div>
            <p className="text-xl font-bold text-red-600">
              ฿{totalExpense.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium">คงเหลือ</span>
            </div>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              ฿{balance.toLocaleString()}
            </p>
          </div>
        </section>

        {/* Transaction List */}
        <section className="bg-white rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-gray-900">รายการล่าสุด</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>ยังไม่มีรายการ</p>
              <p className="text-sm">อัพโหลดสลิปเพื่อเริ่มต้น</p>
            </div>
          ) : (
            <ul className="divide-y">
              {transactions.map((t) => (
                <li key={t.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{t.sender_name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.transaction_date).toLocaleDateString('th-TH')}
                        </p>
                      </div>
                    </div>
                    <p className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}฿{t.amount.toLocaleString()}
                    </p>
                  </div>
                  {t.note && (
                    <p className="mt-1 text-sm text-gray-500 pl-13">{t.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
