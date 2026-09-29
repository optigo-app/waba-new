import { generateFlowFromDescription, resolveProvider } from '@/app/services/aiFlowProvider';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { description } = await request.json();

        if (!description || !description.trim()) {
            return NextResponse.json(
                { error: 'Description is required.' },
                { status: 400 }
            );
        }

        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
        const flow = await generateFlowFromDescription(description.trim(), undefined, resolveProvider(host));

        return NextResponse.json(flow);
    } catch (error) {
        console.error('AI flow generation error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to generate flow.' },
            { status: 500 }
        );
    }
}
