'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { User, LogOut, Camera, Edit2, Check, X, Loader2, CreditCard, MessageCircle, Globe, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateProfile } from '@/app/actions/user'
import Image from 'next/image'

interface UserProfileModalProps {
  fullName?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
}

export function UserProfileModal(props: UserProfileModalProps) {
  const [open, setOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
  const [fullName, setFullName] = useState(props.fullName || '')
  const [phone, setPhone] = useState(props.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl || '')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    const result = await updateProfile({ fullName, phone })
    setIsSaving(false)
    if (result.success) {
      toast.success('Perfil atualizado com sucesso!')
      setIsEditing(false)
      router.refresh()
    } else {
      toast.error('Erro ao atualizar perfil')
    }
  }

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB')
      return
    }

    setIsUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const newAvatarUrl = publicUrlData.publicUrl
      
      const result = await updateProfile({ avatarUrl: newAvatarUrl })
      if (result.success) {
        setAvatarUrl(newAvatarUrl)
        toast.success('Foto de perfil atualizada!')
        router.refresh()
      } else {
        throw new Error(result.error || 'Erro ao salvar no banco')
      }
    } catch (error: any) {
      console.error('Erro no upload do avatar:', error)
      toast.error('Erro ao fazer upload da imagem')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const displayAvatar = avatarUrl || props.avatarUrl
  const displayName = isEditing ? fullName : (fullName || props.fullName || 'Soberano')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-zinc-900 border border-zinc-700 hover:border-[#D4AF37] transition-all group overflow-hidden"
          title="Área do Usuário"
        >
          {displayAvatar ? (
            <Image src={displayAvatar} alt="Perfil" width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400 group-hover:text-[#D4AF37] transition-colors" />
          )}
        </button>
      </DialogTrigger>
      
      <DialogContent className="bg-[#0a0a0c] border border-[#d4af37]/30 max-w-lg w-[95vw] rounded-3xl p-6 sm:p-8 text-white shadow-[0_10px_40px_rgba(212,175,55,0.15)] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-6">
          <div className="relative mx-auto w-24 h-24 mb-4">
            <label className="relative block w-full h-full bg-zinc-900 border-2 border-[#d4af37] rounded-full flex items-center justify-center group overflow-hidden cursor-pointer">
              {displayAvatar ? (
                <Image src={displayAvatar} alt="Perfil" width={96} height={96} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-[#d4af37]" />
              )}
              
              {/* Upload Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                disabled={isUploading}
              />
            </label>
            
            {/* Ícone de Lápis Flutuante (Edição de Foto) */}
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-zinc-900 border-2 border-[#d4af37] rounded-full flex items-center justify-center pointer-events-none shadow-lg z-10">
              <Edit2 className="w-4 h-4 text-[#d4af37]" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            {isEditing ? (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1 text-center font-heading text-xl font-bold text-white focus:outline-none focus:border-[#d4af37]"
              />
            ) : (
              <DialogTitle className="text-center font-heading text-2xl font-black tracking-wide text-white flex items-center justify-center gap-2">
                {displayName}
              </DialogTitle>
            )}
            
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="p-1 text-zinc-500 hover:text-[#d4af37] transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
            <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-1">Email</p>
            <p className="text-sm font-medium text-zinc-200 truncate" title={props.email || ''}>{props.email || 'Não informado'}</p>
          </div>
          
          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800/50">
            <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-1">Número</p>
            {isEditing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full bg-black/50 border border-zinc-700 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-[#d4af37]"
              />
            ) : (
              <p className="text-sm font-medium text-zinc-200">{phone || props.phone || 'Não informado'}</p>
            )}
          </div>
          
          <div className="bg-zinc-900/50 rounded-2xl p-4 border border-[#d4af37]/20 relative overflow-hidden md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 blur-3xl rounded-full pointer-events-none" />
            <div>
              <p className="text-xs uppercase text-[#d4af37]/70 font-bold tracking-wider mb-1">Plano Atual</p>
              <p className="text-lg font-heading font-black text-white uppercase tracking-wide">GRATUITO</p>
            </div>
            
            <button className="w-full sm:w-auto px-6 py-2 bg-[#d4af37] text-black rounded-lg font-heading font-bold uppercase tracking-wider text-sm hover:bg-[#c4a030] transition-colors flex items-center justify-center gap-2 z-10">
              <CreditCard className="w-4 h-4" />
              Ver Planos
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          <a href="#" className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-green-500/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-black transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="font-medium text-zinc-200">Grupo VIP no WhatsApp</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-green-500" />
          </a>

          <div className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-colors">
                <Globe className="w-4 h-4" />
              </div>
              <span className="font-medium text-zinc-200">Idioma</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">Português (BR)</span>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setIsEditing(false)
                setFullName(props.fullName || '')
                setPhone(props.phone || '')
              }}
              className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-bold uppercase tracking-wider text-sm hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-[#d4af37] text-black font-bold uppercase tracking-wider text-sm hover:bg-[#c4a030] transition-colors flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl transition-all duration-300 font-heading uppercase tracking-widest text-sm bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20"
          >
            <LogOut className="w-4 h-4" strokeWidth={2.5} />
            SAIR
          </button>
          
          <p className="text-center text-[10px] uppercase tracking-widest text-zinc-600 font-bold mt-2">
            Versão 1.0.0
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
