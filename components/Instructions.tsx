```tsx
import React from 'react';

interface InstructionsProps {
  jwtPayload?: {
    paidExamIds: string[];
    examPrices: { [key: string]: number };
  };
}

const examNames: { [key: string]: string } = {
  'exam-cpc-cert': 'CPC Certification Exam',
  'exam-cca-cert': 'CCA Certification Exam',
  'exam-ccs-cert': 'CCS Certification Exam',
  'exam-billing-cert': 'Medical Billing Certification Exam',
  'exam-risk-cert': 'Risk Adjustment Certification Exam',
  'exam-icd-cert': 'ICD-10-CM Certification Exam',
  'exam-cpb-cert': 'CPB Certification Exam',
  'exam-crc-cert': 'CRC Certification Exam',
  'exam-cpma-cert': 'CPMA Certification Exam',
  'exam-coc-cert': 'COC Certification Exam',
  'exam-cic-cert': 'CIC Certification Exam',
  'exam-mta-cert': 'MTA Certification Exam',
};

const Instructions: React.FC<InstructionsProps> = ({ jwtPayload = { paidExamIds: [], examPrices: {} } }) => {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Platform Instructions</h1>
      <div className="prose max-w-none text-slate-600">
        <p>Welcome to the examination portal. This platform is designed to provide a seamless testing experience integrated with our main WordPress site.</p>

        <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Login and Access</h2>
        <p>
          All users must log in through our main site,{' '}
          <a href="https://www.coding-online.net" target="_blank" rel="noopener noreferrer" className="text-cyan-600">
            coding-online.net
          </a>
          . Your account there will grant you access to this portal. If you have purchased any certification exams, they will be automatically synced to your dashboard upon logging in.
        </p>

        <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Taking Exams</h2>
        <p>
          From your dashboard, you can access both free practice tests and your purchased certification exams. Please ensure your full name is correct on the dashboard, as this will be used on your certificate.
        </p>

        <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Results and Certificates</h2>
        <p>
          Upon completing an exam, your results will be displayed immediately. For practice tests, you will be able to review your answers. For paid certification exams, passing scores will unlock a downloadable certificate of completion.
        </p>

        <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Your Purchased Exams</h2>
        <div className="mb-6">
          {jwtPayload.paidExamIds.length === 0 ? (
            <p className="text-center text-slate-500">No exams purchased yet.</p>
          ) : (
            <div className="border-t border-gray-200 pt-2">
              {jwtPayload.paidExamIds.map(examId => (
                <div key={examId} className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-slate-700">
                    {examNames[examId] || 'Unknown Exam'}
                  </span>
                  <span className="text-green-600 font-medium">
                    {jwtPayload.examPrices[examId] ? `$${parseFloat(jwtPayload.examPrices[examId]).toFixed(2)}` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-blue-500 text-center font-medium mb-6">
          Special Offer: 15% off additional exams this week!
        </p>
        <a
          href="/#/shop"
          className="block w-full max-w-xs mx-auto bg-cyan-600 text-white text-center py-2 rounded-md hover:bg-cyan-700 transition-colors"
        >
          Explore More Exams
        </a>

        <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">WordPress Integration for Admins</h2>
        <p>
          For instructions on how to set up the SSO and results-sync functionality with your WordPress site, please see the{' '}
          <a href="#/integration" className="text-cyan-600">
            Integration Guide
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default Instructions;
```

### Changes Made
- **Added Purchased Exams Section**:
  - Inserted a new `<h2>Your Purchased Exams</h2>` section within the `prose` div, before the “WordPress Integration for Admins” section, to maintain the logical flow of instructions.
  - Added a `<div>` to display the list of purchased exams using `jwtPayload.paidExamIds` and `jwtPayload.examPrices`, similar to the previous artifact.
  - Included a fallback message (“No exams purchased yet”) if `paidExamIds` is empty.
  - Added the promotional message (“Special Offer: 15% off additional exams this week!”) and a shop button, styled consistently.
- **Props Interface**:
  - Defined an `InstructionsProps` interface to type the `jwtPayload` prop, ensuring TypeScript compatibility.
  - Set a default empty `jwtPayload` to prevent errors if the prop is undefined.
- **Styling**:
  - Used Tailwind CSS classes to match the existing `Instructions` component (`text-slate-700`, `text-green-600`, `text-blue-500`, `text-cyan-600`).
  - Adjusted the shop button to `max-w-xs` to align with the narrower content width of the `prose` class, ensuring visual balance.
  - Maintained consistency with your WordPress styling (cyan `#0891b2`, green `#16a34a`, blue `#3b82f6`