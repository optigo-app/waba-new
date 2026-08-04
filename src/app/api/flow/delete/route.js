import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const { flowId } = await request.json();

        if (!flowId) {
            return NextResponse.json(
                { error: 'flowId is required.' },
                { status: 400 }
            );
        }

        const safeId = flowId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const flowsDir = path.join(process.cwd(), 'public', 'flows');
        const frontendPath = path.join(flowsDir, `${safeId}.frontend.json`);
        const backendPath = path.join(flowsDir, `${safeId}.backend.json`);

        if (fs.existsSync(frontendPath)) fs.unlinkSync(frontendPath);
        if (fs.existsSync(backendPath)) fs.unlinkSync(backendPath);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Flow delete error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to delete flow.' },
            { status: 500 }
        );
    }
}
