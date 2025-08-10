
import React from 'react';

const Instructions: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-slate-800 mb-4">Platform Instructions</h1>
            <div className="prose max-w-none text-slate-600">
                <p>Welcome to the examination portal. This platform is designed to provide a seamless testing experience integrated with our main WordPress site.</p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Login and Access</h2>
                <p>
                    All users must log in through our main site, <a href="https://www.coding-online.net" target="_blank" rel="noopener noreferrer" className="text-cyan-600">coding-online.net</a>. Your account there will grant you access to this portal. 
                    If you have purchased any certification exams, they will be automatically synced to your dashboard upon logging in.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Taking Exams</h2>
                <p>
                    From your dashboard, you can access both free practice tests and your purchased certification exams. Please ensure your full name is correct on the dashboard, as this will be used on your certificate.
                </p>
                
                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">Results and Certificates</h2>
                <p>
                    Upon completing an exam, your results will be displayed immediately. For practice tests, you will be able to review your answers. For paid certification exams, passing scores will unlock a downloadable certificate of completion.
                </p>

                <h2 className="text-2xl font-semibold text-slate-700 mt-6 mb-2">WordPress Integration for Admins</h2>
                <p>
                    For instructions on how to set up the SSO and results-sync functionality with your WordPress site, please see the <a href="#/integration" className="text-cyan-600">Integration Guide</a>.
                </p>
            </div>
        </div>
<div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 m-4">
  <h2 class="text-xl font-semibold text-gray-800 mb-4 text-center">Your Purchased Exams</h2>
  <div id="exam-list" class="mb-4">
    <!-- Exams will be dynamically inserted here -->
  </div>
  <p class="text-blue-500 text-center font-medium mb-4">Special Offer: 15% off additional exams this week!</p>
  <a href="/#/shop" class="block w-full bg-cyan-600 text-white text-center py-2 rounded-md hover:bg-cyan-700 transition-colors">Explore More Exams</a>
</div>
<script>
  // JavaScript to dynamically populate the exam list
  // Assumes JWT payload is available in the app's state (e.g., window.jwtPayload or React state)
  const jwtPayload = window.jwtPayload || { paidExamIds: [], examPrices: {} }; // Replace with your actual JWT payload
  const examNames = {
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
    'exam-mta-cert': 'MTA Certification Exam'
  };

  const examList = document.getElementById('exam-list');
  if (jwtPayload.paidExamIds.length === 0) {
    examList.innerHTML = '<p class="text-center text-gray-500">No exams purchased yet.</p>';
  } else {
    jwtPayload.paidExamIds.forEach(examId => {
      const examName = examNames[examId] || 'Unknown Exam';
      const examPrice = jwtPayload.examPrices[examId] ? `$${parseFloat(jwtPayload.examPrices[examId]).toFixed(2)}` : 'N/A';
      const examItem = document.createElement('div');
      examItem.className = 'flex justify-between py-2 border-b border-gray-200';
      examItem.innerHTML = `
        <span class="font-medium text-gray-700">${examName}</span>
        <span class="text-green-600 font-medium">${examPrice}</span>
      `;
      examList.appendChild(examItem);
    });
  }
</script>
    );
};

export default Instructions;
