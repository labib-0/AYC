@extends('pdf.layouts.document')

@section('content')
    @include('pdf.partials.header')
    @include('pdf.partials.parties')
    @include('pdf.partials.items')
    @include('pdf.partials.financials', ['showBanking' => false])
    @include('pdf.partials.signatory', [
        'declaration' => $doc['notes'] ?? 'Official Commercial Quotation issued by Ayaan Clothing Export Division. Price valid for 30 calendar days. Production lead time: 30–45 days upon receipt of advance and approved samples.'
    ])
    @include('pdf.partials.footer')
@endsection
