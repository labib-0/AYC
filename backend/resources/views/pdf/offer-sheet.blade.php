@extends('pdf.layouts.document')

@section('content')
    @include('pdf.partials.header')
    @include('pdf.partials.parties')
    @include('pdf.partials.items')
    @include('pdf.partials.financials', ['showBanking' => false])
    @include('pdf.partials.signatory', [
        'declaration' => $doc['notes'] ?? 'Commercial Merchandising Offer Sheet. Quotation valid for order placement within 30 calendar days. Production lead time: 30–45 days upon sample approval.'
    ])
    @include('pdf.partials.footer')
@endsection
