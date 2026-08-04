import { editFlowFromDescription } from '@/app/services/aiFlowProvider';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { currentFlow, instruction } = await request.json();

        if (!currentFlow || !currentFlow.nodes) {
            return NextResponse.json(
                { error: 'currentFlow with nodes is required.' },
                { status: 400 }
            );
        }

        if (!instruction || !instruction.trim()) {
            return NextResponse.json(
                { error: 'Instruction is required.' },
                { status: 400 }
            );
        }

        const flow = await editFlowFromDescription(currentFlow, instruction.trim());

        return NextResponse.json(flow);
    } catch (error) {
        console.error('AI flow edit error:', error.message);
        return NextResponse.json(
            { error: error.message || 'Failed to edit flow.' },
            { status: 500 }
        );
    }
}
