import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const { flowId, frontend, backend } = await request.json();

        if (!flowId) {
            return NextResponse.json(
                { error: 'flowId is required.' },
                { status: 400 }
            );
        }

        const flowsDir = path.join(process.cwd(), 'public', 'flows');
        if (!fs.existsSync(flowsDir)) {
            fs.mkdirSync(flowsDir, { recursive: true });
        }

        const safeId = flowId.replace(/[^a-zA-Z0-9_-]/g, '_');

        const frontendPath = path.join(flowsDir, `${safeId}.frontend.json`);
        const backendPath = path.join(flowsDir, `${safeId}.backend.json`);

        fs.writeFileSync(frontendPath, JSON.stringify(frontend, null, 2), 'utf8');
        fs.writeFileSync(backendPath, JSON.stringify(backend, null, 2), 'utf8');

        return NextResponse.json({
            success: true,
            frontendPath: `/flows/${safeId}.frontend.json`,
            backendPath: `/flows/${safeId}.backend.json`,
        });
    } catch (error) {
        console.error('Flow save error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to save flow.' },
            { status: 500 }
        );
    }
}
