'use client';

import React, { useState } from 'react';
import { Building2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/contexts/OrganizationContext';
import type { IndustryType } from '@/types/qms';

const INDUSTRY_OPTIONS: { value: IndustryType; label: string }[] = [
  { value: 'medical_device', label: 'Dispositif Medical' },
  { value: 'pharmaceutical', label: 'Pharmaceutique' },
  { value: 'biotech', label: 'Biotechnologie' },
  { value: 'ivd', label: 'Diagnostic In Vitro (IVD)' },
  { value: 'combination_product', label: 'Produit Combiné' },
];

interface CreateOrganizationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (org: import('@/types/qms').Organization) => void;
}

export function CreateOrganizationDialog({
  open,
  onClose,
  onSuccess,
}: CreateOrganizationDialogProps) {
  const { createOrganization } = useOrganization();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [industryType, setIndustryType] = useState<IndustryType>('medical_device');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug) {
      setSlug(
        value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 60),
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const org = await createOrganization({
        name: name.trim(),
        slug: slug.trim() || undefined,
        industryType,
      });

      if (org) {
        setSuccess(true);
        onSuccess?.(org);
        // Auto-close after brief delay
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError('Échec de la création. Vérifiez que le slug est unique.');
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSlug('');
    setAutoSlug(true);
    setIndustryType('medical_device');
    setError('');
    setLoading(false);
    setSuccess(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative bg-background rounded-xl border shadow-lg w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Nouvelle Organisation</h2>
            <p className="text-sm text-muted-foreground">
              Creer une organisation pour votre équipe
            </p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <p className="text-sm font-medium">Organisation créée avec succès !</p>
            <p className="text-xs text-muted-foreground">
              Vous allez être redirigé vers le configurateur...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Nom de l&apos;organisation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full h-10 px-3 border rounded-lg text-sm"
                placeholder="Ex: MedTech Solutions SARL"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                minLength={2}
                autoFocus
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Slug (identifiant URL)</label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSlug}
                    onChange={(e) => setAutoSlug(e.target.checked)}
                    className="rounded"
                  />
                  Auto
                </label>
              </div>
              <input
                type="text"
                className="w-full h-10 px-3 border rounded-lg text-sm font-mono"
                placeholder="medtech-solutions"
                value={slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, '')
                      .slice(0, 60),
                  );
                }}
                required
                minLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Utilisé dans les URLs et identifiants. Unique.
              </p>
            </div>

            {/* Industry Type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Secteur d&apos;activité</label>
              <select
                className="w-full h-10 px-3 border rounded-lg text-sm bg-background"
                value={industryType}
                onChange={(e) => setIndustryType(e.target.value as IndustryType)}
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || name.trim().length < 2 || slug.trim().length < 2}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Creer'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}