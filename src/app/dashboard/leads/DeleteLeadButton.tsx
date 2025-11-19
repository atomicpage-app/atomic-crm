'use client';

import { useState } from 'react';

type DeleteLeadButtonProps = {
  leadId: string;
  onDeleted?: (id: string) => void;
};

export function DeleteLeadButton({ leadId, onDeleted }: DeleteLeadButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.'
    );

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        const message =
          data?.error || 'Não foi possível excluir o lead. Tente novamente.';
        alert(message);
        return;
      }

      if (onDeleted) {
        onDeleted(leadId);
      }
    } catch (err) {
      console.error('Erro ao excluir lead:', err);
      alert('Erro inesperado ao excluir lead.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="rounded-md border border-red-500 px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {isDeleting ? 'Excluindo...' : 'Excluir'}
    </button>
  );
}
