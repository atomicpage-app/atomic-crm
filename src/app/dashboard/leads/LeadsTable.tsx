'use client';

import { useState } from 'react';
import { DeleteLeadButton } from './DeleteLeadButton';

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  created_at: string;
  // adicione aqui mais campos se você estiver exibindo outros
};

type LeadsTableProps = {
  initialLeads: Lead[];
};

export function LeadsTable({ initialLeads }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  const handleDeleted = (id: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
  };

  if (leads.length === 0) {
    return <p>Nenhum lead encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Nome
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Email
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Telefone
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Status
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Criado em
            </th>
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td className="px-4 py-2">{lead.name}</td>
              <td className="px-4 py-2">{lead.email}</td>
              <td className="px-4 py-2">{lead.phone || '-'}</td>
              <td className="px-4 py-2">{lead.status}</td>
              <td className="px-4 py-2">
                {new Date(lead.created_at).toLocaleString('pt-BR')}
              </td>
              <td className="px-4 py-2">
                <DeleteLeadButton leadId={lead.id} onDeleted={handleDeleted} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
