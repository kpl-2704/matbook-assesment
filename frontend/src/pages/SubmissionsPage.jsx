import React, { useMemo, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import Modal from "../components/Modal.jsx";
import Button from "../components/Button.jsx";

const fetchSubs = async ({ queryKey }) => {
  const [_k, { page, limit, sortOrder }] = queryKey;
  const { data } = await axios.get("/api/submissions", {
    params: { page, limit, sortBy: "createdAt", sortOrder },
  });
  return data;
};

export default function SubmissionsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewItem, setViewItem] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["submissions", { page, limit, sortOrder }],
    queryFn: fetchSubs,
    keepPreviousData: true,
  });

  const columns = useMemo(
    () => [
      { accessorKey: "id", header: "Submission ID" },
      { accessorKey: "createdAt", header: "Created Date" },
      {
        id: "view",
        header: "View",
        cell: ({ row }) => (
          <button
            className="text-blue-600"
            onClick={() => setViewItem(row.original)}
          >
            View
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: data?.items || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  function exportToCSV(rows) {
    if (!rows || rows.length === 0) return;

    const headings = ["ID", "Created At", "Data"];

    const csvRows = rows.map((item) => {
      return [
        item.id,
        item.createdAt,
        JSON.stringify(item.data).replace(/"/g, '""'),
      ].join(",");
    });

    const csvString = [headings.join(","), ...csvRows].join("\n");

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "submissions.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  if (isLoading) return <div>Loading submissions...</div>;
  if (isError) return <div>Error loading submissions.</div>;

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">Submissions</h2>

        <div className="flex items-center space-x-3">
          <div>
            <label className="mr-2">Per page</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <Button
            onClick={() => exportToCSV(data.items)}
            className="bg-green-600 hover:bg-green-700"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="border p-2 cursor-pointer"
                  onClick={() => {
                    if (h.column.id === "createdAt") {
                      setSortOrder((s) => (s === "asc" ? "desc" : "asc"));
                    }
                  }}
                >
                  {h.column.columnDef.header}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((r) => (
            <tr key={r.id}>
              {r.getVisibleCells().map((c) => (
                <td key={c.id} className="border p-2">
                  {c.renderValue()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex items-center justify-between">
        <div>Total: {data.total}</div>
        <div className="space-x-2">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span>
            Page {data.page} / {data.totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page >= data.totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title="Submission"
      >
        {viewItem && (
          <pre className="text-sm">
            {JSON.stringify(viewItem.data, null, 2)}
          </pre>
        )}
      </Modal>
    </div>
  );
}
