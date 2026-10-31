'use client';

import React, { Suspense } from 'react';
import EmailTemplatesPage from '../../components/Email/EmailTemplatesPage';

export default function EmailTemplatesRoute() {
    return (
        <Suspense fallback={null}>
            <EmailTemplatesPage />
        </Suspense>
    );
}
