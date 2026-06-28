'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import PincodeChecker from './PincodeChecker'
import type { Address, AddressLabel } from '@/types/database.types'
import type { AddressFormData } from '@/lib/validations/address'

const LABELS: AddressLabel[] = ['Home', 'Office', 'Storefront', 'Other']

interface Props {
  profileId: string
  onSaved: (address: Address) => void
  onClose: () => void
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg border border-outline-variant bg-surface-container-lowest font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors'
const errorCls = 'font-label-sm text-label-sm text-error mt-1'
const labelCls = 'font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-1.5'

export default function AddressForm({ profileId, onSaved, onClose }: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const [pincodeValue, setPincodeValue] = useState('')
  const [pincodeOk, setPincodeOk] = useState<boolean | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AddressFormData>({ defaultValues: { label: 'Home', is_default: false } })

  const watchedPincode = watch('pincode', '')

  const onSubmit = async (data: AddressFormData) => {
    setIsSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const { data: saved, error } = await supabase
        .from('addresses')
        .insert({
          user_id: profileId,
          name: data.name,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2 ?? null,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          label: data.label ?? null,
          is_default: data.is_default ?? false,
        })
        .select()
        .single()

      if (error || !saved) throw new Error(error?.message ?? 'Failed to save')
      onSaved(saved as unknown as Address)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-surface rounded-t-xl sm:rounded-xl shadow-xl overflow-hidden max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant flex-shrink-0">
          <h3 className="font-headline-md text-headline-md text-on-surface">Add New Address</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-container transition-colors">
            <X size={18} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 px-5 py-4 overflow-y-auto"
        >
          {/* Label picker */}
          <div>
            <span className={labelCls}>Address Label</span>
            <div className="flex gap-2 flex-wrap">
              {LABELS.map((lbl) => (
                <label
                  key={lbl}
                  className="cursor-pointer"
                >
                  <input type="radio" {...register('label')} value={lbl} className="sr-only" />
                  <span
                    className={cn(
                      'px-3 py-1.5 rounded-full font-label-sm text-label-sm border transition-colors',
                      watch('label') === lbl
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant',
                    )}
                  >
                    {lbl}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="addr-name" className={labelCls}>Full Name *</label>
              <input
                id="addr-name"
                {...register('name', { required: 'Required' })}
                placeholder="Ravi Kumar"
                className={inputCls}
              />
              {errors.name && <p className={errorCls}>{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="addr-phone" className={labelCls}>Mobile *</label>
              <input
                id="addr-phone"
                {...register('phone', { required: 'Required' })}
                placeholder="9876543210"
                className={inputCls}
              />
              {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
            </div>
          </div>

          {/* Line 1 */}
          <div>
            <label htmlFor="addr-line1" className={labelCls}>Address Line 1 *</label>
            <input
              id="addr-line1"
              {...register('line1', { required: 'Required' })}
              placeholder="Door/Flat no., Building, Street"
              className={inputCls}
            />
            {errors.line1 && <p className={errorCls}>{errors.line1.message}</p>}
          </div>

          {/* Line 2 */}
          <div>
            <label htmlFor="addr-line2" className={labelCls}>Address Line 2</label>
            <input
              id="addr-line2"
              {...register('line2')}
              placeholder="Landmark, Area (optional)"
              className={inputCls}
            />
          </div>

          {/* City + State + Pincode */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="addr-city" className={labelCls}>City *</label>
              <input
                id="addr-city"
                {...register('city', { required: 'Required' })}
                placeholder="Bhubaneswar"
                className={inputCls}
              />
              {errors.city && <p className={errorCls}>{errors.city.message}</p>}
            </div>
            <div>
              <label htmlFor="addr-state" className={labelCls}>State *</label>
              <input
                id="addr-state"
                {...register('state', { required: 'Required' })}
                placeholder="Odisha"
                className={inputCls}
              />
              {errors.state && <p className={errorCls}>{errors.state.message}</p>}
            </div>
            <div>
              <label htmlFor="addr-pincode" className={labelCls}>Pincode *</label>
              <input
                id="addr-pincode"
                {...register('pincode', {
                  required: 'Required',
                  pattern: { value: /^\d{6}$/, message: '6 digits' },
                  onChange: (e) => setPincodeValue(e.target.value),
                })}
                placeholder="751001"
                maxLength={6}
                className={inputCls}
              />
              {errors.pincode && <p className={errorCls}>{errors.pincode.message}</p>}
            </div>
          </div>

          {/* Pincode checker */}
          <PincodeChecker
            pincode={watchedPincode}
            onResult={(r) => setPincodeOk(r?.serviceable ?? null)}
          />

          {/* Default toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('is_default')} className="sr-only" />
            <div
              className={cn(
                'w-9 h-5 rounded-full transition-colors',
                watch('is_default') ? 'bg-primary' : 'bg-outline-variant',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  watch('is_default') ? 'translate-x-[18px]' : 'translate-x-0.5',
                )}
              />
            </div>
            <span className="font-body-md text-body-md text-on-surface-variant">
              Set as default address
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-full border-[1.5px] border-outline-variant text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-full bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {isSaving ? 'Saving…' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
