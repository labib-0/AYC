@extends('pdf.layouts.document')

@section('content')
    @include('pdf.partials.header')
    @include('pdf.partials.parties')
    @include('pdf.partials.items')
    @include('pdf.partials.financials', ['showBanking' => true])
    @include('pdf.partials.signatory', [
        'declaration' => $doc['notes'] ?? 'Official Commercial Sales Invoice. Authoritative for commercial accounting, import customs duty assessment, and bank foreign exchange settlement.'
    ])
    @include('pdf.partials.footer')
@endsection
