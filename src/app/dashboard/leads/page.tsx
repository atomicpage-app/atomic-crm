'use client';

import { useEffect, useState } from 'react';

type LeadStatus = 'confirmed' | 'pending' | 'expired_with_phone' | 'expired';

type Lead = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  source: string | null;
  status: LeadStatus | string;
  created_at: string;
  confirmed_at: string | null;
  confirmation_expires_at?: string | null;
};

type Summary = {
  total: number;
  confirmed: number;
  pending: number;
  expired_with_phone: number;
  expired: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  summary: Summary;
  pagination: Pagination;
  leads: Lead[];
};

const STATUS_OPTIONS: { value: '' | LeadStatus; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'expired_with_phone', label: 'Expirados (com telefone)' },
  { value: 'expired', label: 'Expirados (sem telefone)' },
];

export default function LeadsDashboardPage() {
  const [status, setStatus] = useState<'' | LeadStatus>('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    confirmed: 0,
    pending: 0,
    expired_with_phone: 0,
    expired: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Função para buscar leads na API
  async function fetchLeads() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(pagination.limit || 20));

      const res = await fetch(`/api/leads?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: ApiResponse = await res.json();

      if (!res.ok || !data.ok) {
        console.error('Erro na API /api/leads:', data);
        setError(data.error || 'Erro ao carregar leads.');
        return;
      }

      setLeads(data.leads || []);
      setSummary(data.summary);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Erro inesperado ao buscar leads:', err);
      setError('Erro inesperado ao carregar leads.');
    } finally {
      setLoading(false);
    }
  }

  // Dispara busca quando filtros/página mudarem
  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  // Busca com debounce simples ao digitar
  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      fetchLeads();
    }, 400);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setStatus(e.target.value as '' | LeadStatus);
    setPage(1);
  }

  function handlePrevPage() {
    if (!pagination.hasPrevPage) return;
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage() {
    if (!pagination.hasNextPage) return;
    setPage((p) => p + 1);
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  function formatStatusLabel(value: string): string {
    switch (value) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendente';
      case 'expired_with_phone':
        return 'Expirado (com telefone)';
      case 'expired':
        return 'Expirado (sem telefone)';
      default:
        return value;
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Leads – Atomic CRM</h1>
        <p className="text-sm text-gray-600">
          Visão geral dos leads capturados, com status de confirmação, telefone e origem.
        </p>
      </div>

      {/* Cards de summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total"
          value={summary.total}
          subtitle="Todos os leads"
        />
        <SummaryCard
          title="Confirmados"
          value={summary.confirmed}
          subtitle="Leads com email confirmado"
        />
        <SummaryCard
          title="Pendentes"
          value={summary.pending}
          subtitle="Aguardando confirmação"
        />
        <SummaryCard
          title="Expirados"
          value={summary.expired_with_phone + summary.expired}
          subtitle="Prazo encerrado"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">
            Buscar
          </label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Nome, email ou telefone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="w-full md:w-56">
          <label className="block text-sm font-medium mb-1">
            Status
          </label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={status}
            onChange={handleStatusChange}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {loading && (
          <div className="p-4 text-sm text-gray-600">
            Carregando leads...
          </div>
        )}

        {error && !loading && (
          <div className="p-4 text-sm text-red-600 border-b">
            {error}
          </div>
        )}

        {!loading && !error && leads.length === 0 && (
          <div className="p-4 text-sm text-gray-600">
            Nenhum lead encontrado com os filtros atuais.
          </div>
        )}

        {!loading && leads.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium">Telefone</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Origem</th>
                  <th className="text-left px-3 py-2 font-medium">Criado em</th>
                  <th className="text-left px-3 py-2 font-medium">
                    Confirmado em
                  </th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      {lead.name || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2">{lead.email}</td>
                    <td className="px-3 py-2">
                      {lead.phone || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border">
                        {formatStatusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {lead.source || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(lead.confirmed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        <div className="flex items-center justify-between px-3 py-2 border-t bg-gray-50 text-xs">
          <div>
            Página {pagination.page} de {pagination.totalPages} —{' '}
            {pagination.total} leads
          </div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={handlePrevPage}
              disabled={!pagination.hasPrevPage || loading}
            >
              Anterior
            </button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              onClick={handleNextPage}
              disabled={!pagination.hasNextPage || loading}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: number;
  subtitle?: string;
};

function SummaryCard({ title, value, subtitle }: SummaryCardProps) {
  return (
    <div className="border rounded-lg bg-white p-4">
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  );
}
