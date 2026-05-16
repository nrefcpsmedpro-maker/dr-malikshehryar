'use client';

import { ChangeEvent, useMemo, useState, useTransition } from 'react';
import { CheckCircle2, FileDown, FileSpreadsheet, UploadCloud } from 'lucide-react';

import {
  bulkImportStudents,
  type BulkImportResult,
  type ImportStudentRowInput,
} from '@/app/admin/users/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';

type CourseOption = {
  id: string;
  title: string;
};

type ParsedPreviewRow = ImportStudentRowInput & {
  validation: string;
};

type BulkStudentImportProps = {
  courses: CourseOption[];
  embedded?: boolean;
};

const requiredColumns = ['full_name', 'email', 'mobile_number', 'cnic_number'];

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function normalizeCnic(value: string) {
  return value.replace(/\D/g, '');
}

function formatCnic(value: string) {
  const digits = normalizeCnic(value);

  if (digits.length !== 13) {
    return value;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function parseCsvRows(input: string, delimiter: ',' | '\t') {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let insideQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const nextChar = input[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === delimiter && !insideQuotes) {
      row.push(field.trim());
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(field.trim());
      field = '';

      if (row.some(Boolean)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  row.push(field.trim());

  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function resolveColumnIndex(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header));
}

function hasHeaderRow(row: string[]) {
  const normalized = row.map(normalizeHeader);
  return requiredColumns.some((column) => normalized.includes(column))
    || normalized.includes('name')
    || normalized.includes('phone')
    || normalized.includes('cnic');
}

function mapRows(input: string): ParsedPreviewRow[] {
  const trimmed = input.trim();

  if (!trimmed) {
    return [];
  }

  const delimiter = trimmed.split(/\r?\n/)[0]?.includes('\t') ? '\t' : ',';
  const rawRows = parseCsvRows(trimmed, delimiter);

  if (rawRows.length === 0) {
    return [];
  }

  const firstRowIsHeader = hasHeaderRow(rawRows[0]);
  const headers = firstRowIsHeader
    ? rawRows[0].map(normalizeHeader)
    : requiredColumns;
  const dataRows = firstRowIsHeader ? rawRows.slice(1) : rawRows;
  const startRow = firstRowIsHeader ? 2 : 1;
  const nameIndex = resolveColumnIndex(headers, ['full_name', 'fullname', 'name', 'student_name']);
  const emailIndex = resolveColumnIndex(headers, ['email', 'email_address']);
  const mobileIndex = resolveColumnIndex(headers, ['mobile_number', 'mobile', 'phone', 'phone_number', 'whatsapp']);
  const cnicIndex = resolveColumnIndex(headers, ['cnic_number', 'cnic', 'national_id']);

  return dataRows.map((row, index) => {
    const student: ImportStudentRowInput = {
      rowNumber: startRow + index,
      full_name: row[nameIndex] ?? '',
      email: row[emailIndex] ?? '',
      mobile_number: row[mobileIndex] ?? '',
      cnic_number: row[cnicIndex] ?? '',
    };

    const cnic = normalizeCnic(student.cnic_number);

    let validation = 'Ready';

    if (!student.full_name || !student.email || !student.mobile_number || !student.cnic_number) {
      validation = 'Missing required value';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email.trim())) {
      validation = 'Invalid email';
    } else if (cnic.length !== 13) {
      validation = 'CNIC must be 13 digits';
    }

    return {
      ...student,
      email: student.email.trim().toLowerCase(),
      cnic_number: cnic,
      validation,
    };
  });
}

function escapeCsvCell(value: string | number) {
  const stringValue = String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function downloadResultCsv(result: BulkImportResult) {
  const header = [
    'row_number',
    'full_name',
    'email',
    'mobile_number',
    'cnic_number',
    'generated_password',
    'status',
    'reason',
  ];
  const rows = result.rows.map((row) => [
    row.rowNumber,
    row.full_name,
    row.email,
    row.mobile_number,
    row.cnic_number,
    row.password,
    row.status,
    row.reason,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `student-import-results-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function toImportRow(row: ParsedPreviewRow): ImportStudentRowInput {
  return {
    rowNumber: row.rowNumber,
    full_name: row.full_name,
    email: row.email,
    mobile_number: row.mobile_number,
    cnic_number: row.cnic_number,
  };
}

export function BulkStudentImport({ courses, embedded = false }: BulkStudentImportProps) {
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedPreviewRow[]>([]);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const readyRows = useMemo(
    () => rows.filter((row) => row.validation === 'Ready'),
    [rows],
  );

  const hasCourses = selectedCourseIds.length > 0;
  const canImport = hasCourses && readyRows.length > 0 && !isPending;

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourseIds((current) => (
      current.includes(courseId)
        ? current.filter((id) => id !== courseId)
        : [...current, courseId]
    ));
  };

  const parseSource = (text: string) => {
    const parsedRows = mapRows(text);
    setRows(parsedRows);
    setResult(null);
    setMessage(parsedRows.length ? `${parsedRows.length} row${parsedRows.length === 1 ? '' : 's'} parsed.` : 'No student rows found.');
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    parseSource(text);
  };

  const handleImport = () => {
    setMessage('');

    startTransition(async () => {
      try {
        const importResult = await bulkImportStudents({
          courseIds: selectedCourseIds,
          rows: readyRows.map(toImportRow),
        });

        setResult(importResult);
        setMessage(`Import finished: ${importResult.created} created, ${importResult.skipped} skipped, ${importResult.failed} failed.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Import failed');
      }
    });
  };

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <FileSpreadsheet className="size-5 text-primary" />
            Bulk Import
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload a CSV, approve new students, and enroll them into the selected courses.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button asChild type="button" variant="outline" size="sm">
            <a href="/student-import-sample.csv" download>
              <FileDown className="mr-2 size-4" />
              Sample CSV
            </a>
          </Button>
          {result && (
            <Button type="button" variant="outline" size="sm" onClick={() => downloadResultCsv(result)}>
              <FileDown className="mr-2 size-4" />
              Results
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course access</p>
          <div className="mt-3 grid gap-2">
            {courses.length > 0 ? (
              courses.map((course) => (
                <label
                  key={course.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors',
                    selectedCourseIds.includes(course.id)
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border text-muted-foreground hover:bg-secondary/50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedCourseIds.includes(course.id)}
                    onChange={() => handleCourseToggle(course.id)}
                    className="size-4 accent-primary"
                  />
                  <span>{course.title}</span>
                </label>
              ))
            ) : (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Create a course first before running a student import.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-dashed border-border bg-secondary/30 p-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <UploadCloud className="size-6 text-primary" />
            <span className="font-medium text-foreground">Upload CSV file</span>
            <span>Required columns: full_name, email, mobile_number, cnic_number</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFileChange} />
          </label>
        </div>

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-md border">
            <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Preview
              </p>
              <p className="text-xs text-muted-foreground">
                {readyRows.length} ready of {rows.length}
              </p>
            </div>
            <div className="max-h-56 overflow-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-background text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Mobile</th>
                    <th className="px-3 py-2 font-medium">CNIC</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 12).map((row) => (
                    <tr key={`${row.rowNumber}-${row.email}`} className="border-t">
                      <td className="px-3 py-2 font-medium">{row.full_name || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.email || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.mobile_number || '-'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.cnic_number ? formatCnic(row.cnic_number) : '-'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            row.validation === 'Ready'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-amber-500/10 text-amber-600',
                          )}
                        >
                          {row.validation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {message && (
          <p className="rounded-md bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
            {message}
          </p>
        )}

        {result && (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-md bg-emerald-500/10 p-3 text-emerald-700">
              <p className="text-lg font-bold">{result.created}</p>
              <p className="text-xs font-medium">Created</p>
            </div>
            <div className="rounded-md bg-amber-500/10 p-3 text-amber-700">
              <p className="text-lg font-bold">{result.skipped}</p>
              <p className="text-xs font-medium">Skipped</p>
            </div>
            <div className="rounded-md bg-red-500/10 p-3 text-red-700">
              <p className="text-lg font-bold">{result.failed}</p>
              <p className="text-xs font-medium">Failed</p>
            </div>
          </div>
        )}

        <Button type="button" className="w-full" disabled={!canImport} onClick={handleImport}>
          <CheckCircle2 className="mr-2 size-4" />
          {isPending ? 'Importing...' : 'Import Ready Students'}
        </Button>
      </div>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <Card className="p-6">
      {content}
    </Card>
  );
}
