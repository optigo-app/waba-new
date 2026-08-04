import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { fileUrl, apiUrl, headers } = body;

        if (!fileUrl) {
            return NextResponse.json(
                { error: 'fileUrl is required.' },
                { status: 400 }
            );
        }

        // If fileUrl is a full URL, fetch directly; otherwise prefix with apiUrl
        const targetUrl = fileUrl.startsWith('http')
            ? fileUrl
            : `${apiUrl}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;

        const forwardHeaders = {};
        if (headers?.Yearcode) forwardHeaders['YearCode'] = headers.Yearcode;
        if (headers?.sp) forwardHeaders['sp'] = headers.sp;
        if (headers?.Version) forwardHeaders['version'] = headers.Version;
        if (headers?.sv) forwardHeaders['sv'] = headers.sv;

        const res = await fetch(targetUrl, { headers: forwardHeaders });
        const text = await res.text();

        if (!res.ok) {
            return NextResponse.json(
                { error: `Failed to fetch file: ${res.status}` },
                { status: res.status }
            );
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            return NextResponse.json(
                { error: 'File is not valid JSON.' },
                { status: 500 }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Flow file proxy error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch flow file.' },
            { status: 500 }
        );
    }
}
