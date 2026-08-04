import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const flowsDir = path.join(process.cwd(), 'public', 'flows');
        if (!fs.existsSync(flowsDir)) {
            return NextResponse.json({ flows: [] });
        }

        const files = fs.readdirSync(flowsDir);
        const frontendFiles = files.filter((f) => f.endsWith('.frontend.json'));

        const flows = frontendFiles.map((file) => {
            const raw = fs.readFileSync(path.join(flowsDir, file), 'utf8');
            const data = JSON.parse(raw);
            return {
                id: data.id || file.replace('.frontend.json', ''),
                name: data.name || 'Untitled Flow',
                description: data.description || '',
                triggerKeyword: data.triggerKeyword || 'start',
                triggerMode: data.triggerMode || 'contains',
                isActive: data.isActive ?? false,
                nodeCount: data.nodes?.length || 0,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
                frontendPath: `/flows/${file}`,
                backendPath: `/flows/${file.replace('.frontend.json', '.backend.json')}`,
            };
        });

        return NextResponse.json({ flows });
    } catch (error) {
        console.error('Flow list error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to list flows.' },
            { status: 500 }
        );
    }
}
