@extends('pdf.layouts.document')

@section('content')
    @include('pdf.partials.header')
    @include('pdf.partials.parties')
    @include('pdf.partials.items')
    @include('pdf.partials.financials', ['showBanking' => true])
    @include('pdf.partials.signatory', [
        'declaration' => $doc['document_defaults']['ci_declaration'] ?? 'We declare that this Commercial Invoice shows the actual price of the goods described and that all particulars are true, accurate, and correct.'
    ])
    @include('pdf.partials.footer')
@endsection
