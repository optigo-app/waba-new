import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { company, apiUrl, headers } = body;

        if (!apiUrl) {
            return NextResponse.json(
                { error: 'apiUrl is required.' },
                { status: 400 }
            );
        }

        const targetUrl = `${apiUrl}/whatsapp/automation/list`;

        const forwardHeaders = { 'Content-Type': 'application/json' };
        if (headers?.Yearcode) forwardHeaders['YearCode'] = headers.Yearcode;
        if (headers?.sp) forwardHeaders['sp'] = headers.sp;
        if (headers?.Version) forwardHeaders['version'] = headers.Version;
        if (headers?.sv) forwardHeaders['sv'] = headers.sv;

        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: forwardHeaders,
            body: JSON.stringify({ company: company || '' }),
        });

        let data;
        try {
            data = await res.json();
        } catch {
            data = { raw: await res.text() };
        }

        if (!res.ok) {
            return NextResponse.json(
                { error: data?.message || data?.error || `Backend returned ${res.status}` },
                { status: res.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Automation list error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch flow list.' },
            { status: 500 }
        );
    }
}
