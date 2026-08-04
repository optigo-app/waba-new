import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { frontendJson, backendJson, flowName, company, apiUrl, headers } = body;

        if (!frontendJson && !backendJson) {
            return NextResponse.json(
                { error: 'At least frontendJson or backendJson is required.' },
                { status: 400 }
            );
        }
        if (!flowName) {
            return NextResponse.json(
                { error: 'flowName is required.' },
                { status: 400 }
            );
        }
        if (!apiUrl) {
            return NextResponse.json(
                { error: 'apiUrl is required.' },
                { status: 400 }
            );
        }

        // Build the target URL
        const targetUrl = `${apiUrl}/whatsapp/automation/upload`;

        // Create File objects for multipart upload (matching Postman: frontend + backend files)
        const formData = new FormData();

        if (backendJson) {
            const backendContent = JSON.stringify(backendJson, null, 2);
            const backendFile = new File([backendContent], `${flowName}.backend.json`, { type: 'application/json' });
            formData.append('backend', backendFile);
        }

        if (frontendJson) {
            const frontendContent = JSON.stringify(frontendJson, null, 2);
            const frontendFile = new File([frontendContent], `${flowName}.frontend.json`, { type: 'application/json' });
            formData.append('frontend', frontendFile);
        }

        formData.append('flowName', flowName);
        formData.append('company', company || '');

        // Forward auth headers — getHeaders() returns: Yearcode, Version, sv, sp
        const forwardHeaders = {};
        if (headers?.Yearcode) forwardHeaders['YearCode'] = headers.Yearcode;
        if (headers?.sp) forwardHeaders['sp'] = headers.sp;
        if (headers?.Version) forwardHeaders['version'] = headers.Version;
        if (headers?.sv) forwardHeaders['sv'] = headers.sv;

        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: forwardHeaders,
            body: formData,
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
        console.error('Automation upload error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to upload flow to backend.' },
            { status: 500 }
        );
    }
}
