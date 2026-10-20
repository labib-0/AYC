<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'AYAAN CLOTHING Notification' }}</title>
    <style>
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            line-height: 1.6;
        }
        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }
        .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f1f5f9;
            padding: 30px 10px;
        }
        .main-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .header {
            background-color: #0f172a;
            padding: 26px 30px;
            text-align: left;
            border-bottom: 3px solid #d97706;
        }
        .brand-title {
            color: #ffffff;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1px;
            margin: 0;
            text-transform: uppercase;
        }
        .brand-subtitle {
            color: #94a3b8;
            font-size: 11px;
            letter-spacing: 0.8px;
            margin: 4px 0 0 0;
            text-transform: uppercase;
        }
        .body-content {
            padding: 30px 32px;
        }
        .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 4px 12px;
            border-radius: 9999px;
            margin-bottom: 16px;
        }
        .badge-blue { background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .badge-green { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
        .badge-amber { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .badge-slate { background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .badge-indigo { background-color: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }

        .headline {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 16px 0;
        }
        .greeting {
            font-size: 15px;
            color: #334155;
            margin: 0 0 16px 0;
        }
        .card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 16px 20px;
            margin: 20px 0;
        }
        .card-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin: 0 0 10px 0;
        }
        .info-row {
            margin-bottom: 8px;
            font-size: 13.5px;
        }
        .info-label {
            color: #64748b;
            font-weight: 500;
            display: inline-block;
            width: 130px;
        }
        .info-value {
            color: #0f172a;
            font-weight: 600;
        }
        .data-table {
            width: 100%;
            margin: 16px 0;
            font-size: 13px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
        }
        .data-table th {
            background-color: #f1f5f9;
            color: #475569;
            font-weight: 600;
            text-align: left;
            padding: 10px 14px;
            border-bottom: 1px solid #e2e8f0;
        }
        .data-table td {
            padding: 10px 14px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
        }
        .btn-container {
            text-align: center;
            margin: 28px 0 20px 0;
        }
        .btn {
            display: inline-block;
            background-color: #0f172a;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.3px;
        }
        .btn-green {
            background-color: #059669;
        }
        .alert-box {
            border-radius: 6px;
            padding: 14px 18px;
            margin: 20px 0;
            font-size: 13.5px;
        }
        .alert-green { background-color: #ecfdf5; border-left: 4px solid #059669; color: #065f46; }
        .alert-amber { background-color: #fffbeb; border-left: 4px solid #d97706; color: #92400e; }
        .alert-slate { background-color: #f8fafc; border-left: 4px solid #64748b; color: #334155; }
        .footer {
            background-color: #0f172a;
            color: #94a3b8;
            padding: 24px 30px;
            font-size: 12px;
            line-height: 1.5;
            text-align: center;
            border-top: 1px solid #1e293b;
        }
        .footer a {
            color: #cbd5e1;
            text-decoration: underline;
        }
        .footer-address {
            margin: 8px 0 0 0;
            color: #64748b;
        }
        @media only screen and (max-width: 620px) {
            .body-content { padding: 20px 18px !important; }
            .header { padding: 20px !important; }
            .info-label { width: 100% !important; display: block !important; margin-bottom: 2px; }
            .info-value { display: block !important; margin-bottom: 8px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="main-container" width="100%" cellpadding="0" cellspacing="0">
            <!-- Header -->
            <tr>
                <td class="header">
                    <h1 class="brand-title">AYAAN CLOTHING</h1>
                    <p class="brand-subtitle">Premium Ready-Made Garments & Export Manufacturer</p>
                </td>
            </tr>

            <!-- Body Content -->
            <tr>
                <td class="body-content">
                    @yield('content')
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td class="footer">
                    <div>
                        <strong>AYAAN CLOTHING</strong> &bull; Ready-made Garments Manufacturer & Exporter
                    </div>
                    <div class="footer-address">
                        House #33 (2nd floor), Road #12, Sector #11, Uttara, Dhaka-1230, Bangladesh<br>
                        WhatsApp Export Desk: <a href="https://wa.me/8801620853502">+880 1620-853502</a> &bull; Web: <a href="https://ayaanclothing.com">www.ayaanclothing.com</a>
                    </div>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
