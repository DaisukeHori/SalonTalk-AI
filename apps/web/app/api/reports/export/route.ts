/**
 * Bulk Report Export API Route
 * POST /api/reports/export
 *
 * Exports multiple reports in PDF, CSV, or Excel format
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ExportRequest {
  reportIds: string[];
  format: 'pdf' | 'csv' | 'excel';
  dateRange?: {
    start: string;
    end: string;
  };
}

interface ReportData {
  id: string;
  session_id: string;
  overall_score: number;
  strengths: string[];
  improvements: string[];
  action_items: string[];
  summary: string;
  created_at: string;
  sessions?: {
    stylist_id: string;
    customer_info: Record<string, unknown>;
    started_at: string;
    ended_at: string;
    staff?: {
      display_name: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { reportIds, format, dateRange } = body;

    if (!reportIds || reportIds.length === 0) {
      return NextResponse.json(
        { error: 'No report IDs provided' },
        { status: 400 }
      );
    }

    if (!['pdf', 'csv', 'excel'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabase
      .from('session_reports')
      .select(`
        *,
        sessions (
          stylist_id,
          customer_info,
          started_at,
          ended_at,
          staff:stylist_id (
            display_name
          )
        )
      `)
      .in('id', reportIds);

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json(
        { error: 'No reports found' },
        { status: 404 }
      );
    }

    // Generate export based on format
    switch (format) {
      case 'pdf':
        return generateBulkPdfResponse(reports as ReportData[]);
      case 'csv':
        return generateBulkCsvResponse(reports as ReportData[]);
      case 'excel':
        return generateBulkExcelResponse(reports as ReportData[]);
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export reports' },
      { status: 500 }
    );
  }
}

function generateBulkPdfResponse(reports: ReportData[]): NextResponse {
  const doc = new jsPDF();

  reports.forEach((report, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Title
    doc.setFontSize(20);
    doc.text('SalonTalk セッションレポート', 105, 20, { align: 'center' });

    // Report info
    doc.setFontSize(12);
    doc.text(`レポートID: ${report.id}`, 20, 40);
    doc.text(`生成日時: ${new Date(report.created_at).toLocaleString('ja-JP')}`, 20, 48);

    if (report.sessions) {
      const session = report.sessions;
      const stylistName = session.staff?.display_name || '不明';
      doc.text(`スタイリスト: ${stylistName}`, 20, 56);
      doc.text(`セッション開始: ${new Date(session.started_at).toLocaleString('ja-JP')}`, 20, 64);
    }

    // Overall Score
    doc.setFontSize(16);
    doc.text('総合スコア', 20, 84);
    doc.setFontSize(32);
    doc.text(`${report.overall_score}点`, 20, 100);

    // Summary
    doc.setFontSize(14);
    doc.text('サマリー', 20, 120);
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(report.summary || 'サマリーなし', 170);
    doc.text(summaryLines, 20, 130);

    // Strengths
    const strengthsY = 130 + summaryLines.length * 5 + 20;
    doc.setFontSize(14);
    doc.text('良かった点', 20, strengthsY);
    doc.setFontSize(10);
    (report.strengths || []).forEach((strength, i) => {
      doc.text(`• ${strength}`, 25, strengthsY + 10 + i * 8);
    });

    // Improvements
    const improvementsY = strengthsY + 10 + (report.strengths?.length || 0) * 8 + 15;
    doc.setFontSize(14);
    doc.text('改善点', 20, improvementsY);
    doc.setFontSize(10);
    (report.improvements || []).forEach((improvement, i) => {
      doc.text(`• ${improvement}`, 25, improvementsY + 10 + i * 8);
    });

    // Footer
    doc.setFontSize(8);
    doc.text(`Page ${index + 1} of ${reports.length}`, 105, 285, { align: 'center' });
    doc.text('Generated by SalonTalk AI', 105, 290, { align: 'center' });
  });

  const pdfBuffer = doc.output('arraybuffer');
  const timestamp = new Date().toISOString().split('T')[0];

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reports_${timestamp}.pdf"`,
    },
  });
}

function generateBulkCsvResponse(reports: ReportData[]): NextResponse {
  const headers = [
    'レポートID',
    '生成日時',
    'スタイリスト',
    '総合スコア',
    'サマリー',
    '良かった点',
    '改善点',
    'アクションアイテム',
  ];

  const rows = reports.map((report) => [
    report.id,
    new Date(report.created_at).toLocaleString('ja-JP'),
    report.sessions?.staff?.display_name || '不明',
    String(report.overall_score),
    report.summary || '',
    (report.strengths || []).join('; '),
    (report.improvements || []).join('; '),
    (report.action_items || []).join('; '),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const timestamp = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reports_${timestamp}.csv"`,
    },
  });
}

function generateBulkExcelResponse(reports: ReportData[]): NextResponse {
  const headers = [
    'レポートID',
    '生成日時',
    'スタイリスト',
    '総合スコア',
    'サマリー',
    '良かった点',
    '改善点',
    'アクションアイテム',
  ];

  const rows = reports.map((report) => [
    report.id,
    new Date(report.created_at).toLocaleString('ja-JP'),
    report.sessions?.staff?.display_name || '不明',
    String(report.overall_score),
    report.summary || '',
    (report.strengths || []).join('\n'),
    (report.improvements || []).join('\n'),
    (report.action_items || []).join('\n'),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Add BOM for Excel
  const csvWithBom = '\uFEFF' + csv;
  const timestamp = new Date().toISOString().split('T')[0];

  return new NextResponse(csvWithBom, {
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="reports_${timestamp}.xlsx"`,
    },
  });
}
