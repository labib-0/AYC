<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ $doc['title'] ?? 'COMMERCIAL DOCUMENT' }} - {{ $doc['doc_number'] ?? ($doc['docNumber'] ?? '') }}</title>
    <style>
        @page {
            margin: 10mm 12mm 12mm 12mm;
            size: a4 portrait;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 8pt;
            color: #1e293b;
            line-height: 1.35;
            background: #ffffff;
        }
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 4px 6px;
            vertical-align: top;
        }
        /* Header Banner */
        .header-banner {
            background-color: #0f172a;
            color: #ffffff;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .header-table td {
            padding: 0;
            vertical-align: middle;
        }
        .company-title {
            font-size: 15pt;
            font-weight: bold;
            letter-spacing: 0.5px;
            color: #ffffff;
            line-height: 1.1;
        }
        .company-tagline {
            font-size: 7.5pt;
            color: #cbd5e1;
            margin-top: 3px;
        }
        .doc-title-right {
            text-align: right;
            font-size: 13pt;
            font-weight: bold;
            color: #10b981;
            line-height: 1.1;
        }
        .doc-number-right {
            text-align: right;
            font-size: 8.5pt;
            font-weight: bold;
            color: #ffffff;
            margin-top: 3px;
        }
        /* Info Cards */
        .info-grid {
            margin-bottom: 10px;
        }
        .info-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 6px 8px;
            font-size: 7pt;
        }
        .card-header {
            font-size: 7.5pt;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 3px;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .card-title {
            font-size: 7.5pt;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 2px;
        }
        .card-line {
            color: #475569;
            margin-bottom: 1.5px;
        }
        .status-badge {
            display: inline-block;
            font-weight: bold;
            padding: 1px 4px;
            border-radius: 2px;
            text-transform: uppercase;
            font-size: 6.5pt;
        }
        .status-paid {
            background: #dcfce7;
            color: #15803d;
        }
        .status-pending {
            background: #fef3c7;
            color: #b45309;
        }
        /* Items Table */
        .items-table {
            margin-bottom: 10px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
        }
        .items-table th {
            background-color: #0f172a;
            color: #ffffff;
            font-size: 7pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 5px 6px;
        }
        .items-table td {
            font-size: 7pt;
            border-bottom: 1px solid #f1f5f9;
            padding: 4px 6px;
        }
        .items-table tr.alt {
            background-color: #f8fafc;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .text-muted { color: #64748b; }
        /* Summary & Settlement */
        .summary-section {
            margin-bottom: 10px;
        }
        .settlement-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 7pt;
        }
        .totals-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 7.5pt;
        }
        .totals-table td {
            padding: 2px 0;
            font-size: 7.5pt;
        }
        .grand-total-row td {
            border-top: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            padding: 4px 0;
            font-size: 8.5pt;
            font-weight: bold;
            color: #059669;
        }
        /* Declarations & Signatory */
        .declaration-box {
            font-size: 6.5pt;
            color: #64748b;
            font-style: italic;
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 6px;
            line-height: 1.3;
        }
        .signatory-box {
            margin-top: 8px;
            padding-top: 6px;
        }
        .signatory-line {
            border-top: 1px dashed #94a3b8;
            width: 170px;
            margin-bottom: 3px;
        }
    </style>
    @yield('styles')
</head>
<body>
    @yield('content')
</body>
</html>
