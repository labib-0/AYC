@extends('pdf.layouts.document')

@section('content')
    @include('pdf.partials.header')
    @include('pdf.partials.parties')
    @include('pdf.partials.items')
    @include('pdf.partials.financials', ['showBanking' => true])
    @include('pdf.partials.signatory', [
        'declaration' => $doc['notes'] ?? 'Proforma Invoice issued for buyer remittance, export clearance, or Letter of Credit (L/C) opening. Prices valid for 30 calendar days from issue date.'
    ])
    @include('pdf.partials.footer')
@endsection
