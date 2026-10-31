'use client';

import React, { Suspense } from 'react';
import EmailBuilderPage from '../../../components/Email/EmailBuilderPage';

export default function EmailBuilderRoute() {
    return (
        <Suspense fallback={null}>
            <EmailBuilderPage />
        </Suspense>
    );
}
