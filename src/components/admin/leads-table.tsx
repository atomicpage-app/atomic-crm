"use client";

import { useMemo, useState } from "react";

import { Button } from "./button";
import { EmptyState } from "./empty-state";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  confirmed_at: string | null;
};

type Props = {
  leads: Lead[];
};

type EditState = {
  name: string;
  phone: string;
};

export function LeadsTable({ leads: initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: "", phone: "" });
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const sortedLeads = useMemo(() => {
    // Ordeno aqui no client para permitir feedback rápido após mutações.
    return [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [leads]);

  const startEdit = (lead: Lead) => {
    setEditingId(lead.id);
    setEditState({ name: lead.name, phone: lead.phone });
    setFeedback(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFeedback(null);
  };

  const handleField = (field: keyof EditState, value: string) => {
    setEditState((prev) => ({ ...prev, [field]: value }));
  };

  const updateLead = async (id: string) => {
    setLoading(id);
    setFeedback(null);
    const response = await fetch(`/api/admin/leads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState)
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setFeedback(payload?.error ?? "Não foi possível atualizar o lead.");
      setLoading(null);
      return;
    }

    const updated = await response.json();
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, ...updated } : lead)));
    setEditingId(null);
    setLoading(null);
  };

  const deleteLead = async (id: string) => {
    const confirmed = window.confirm("Deseja realmente excluir este lead?");
    if (!confirmed) return;

    setLoading(id);
    setFeedback(null);
    const response = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setFeedback(payload?.error ?? "Erro ao excluir lead.");
      setLoading(null);
      return;
    }

    setLeads((prev) => prev.filter((lead) => lead.id !== id));
    setLoading(null);
  };

  const resendConfirmation = async (lead: Lead) => {
    setLoading(lead.id);
    setFeedback(null);
    const response = await fetch("/api/resend-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lead.email })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setFeedback(payload?.error ?? "Erro ao reenviar confirmação.");
      setLoading(null);
      return;
    }

    setFeedback("Confirmação reenviada com sucesso.");
    setLoading(null);
  };

  if (sortedLeads.length === 0) {
    return (
      <EmptyState
        title="Nenhum lead por aqui ainda"
        description="Os cadastros confirmados aparecerão nesta lista."
      />
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 font-semibold text-slate-600">Nome</th>
              <th className="px-6 py-3 font-semibold text-slate-600">E-mail</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Telefone</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Criado em</th>
              <th className="px-6 py-3 font-semibold text-slate-600">Confirmado em</th>
              <th className="px-6 py-3 font-semibold text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sortedLeads.map((lead) => {
              const isEditing = editingId === lead.id;
              const isLoading = loading === lead.id;

              return (
                <tr key={lead.id} className="transition hover:bg-slate-50/60">
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                        value={editState.name}
                        onChange={(event) => handleField("name", event.target.value)}
                      />
                    ) : (
                      <span className="font-medium text-slate-800">{lead.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <span className="text-slate-600">{lead.email}</span>
                  </td>
                  <td className="px-6 py-4 align-top">
                    {isEditing ? (
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                        value={editState.phone}
                        onChange={(event) => handleField("phone", event.target.value)}
                      />
                    ) : (
                      <span className="text-slate-600">{lead.phone}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 align-top text-slate-500">
                    {new Date(lead.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-6 py-4 align-top text-slate-500">
                    {lead.confirmed_at ? new Date(lead.confirmed_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={cancelEdit}
                            disabled={isLoading}
                          >
                            Cancelar
                          </Button>
                          <Button size="xs" onClick={() => updateLead(lead.id)} disabled={isLoading}>
                            Salvar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="xs" variant="ghost" onClick={() => startEdit(lead)} disabled={isLoading}>
                            Editar
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => resendConfirmation(lead)}
                            disabled={isLoading}
                          >
                            Reenviar confirmação
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => deleteLead(lead.id)}
                            disabled={isLoading}
                          >
                            Excluir
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {feedback ? <p className="border-t border-slate-200 px-6 py-3 text-sm text-slate-500">{feedback}</p> : null}
    </div>
  );
}
