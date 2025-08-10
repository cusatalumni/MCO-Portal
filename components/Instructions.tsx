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

### Explanation
- **Structure**:
  - The component retains all original sections from your provided `Instructions.tsx` (“Login and Access”, “Taking Exams”, “Results and Certificates”, “WordPress Integration for Admins”).
  - Adds a “Your Purchased Exams” section before “WordPress Integration for Admins” to maintain logical flow.
  - The purchased exams section lists exams from `jwtPayload.paidExamIds` with prices from `jwtPayload.examPrices`, using the `examNames` mapping consistent with your WordPress `$exam_names`.
- **TypeScript**:
  - Defines an `InstructionsProps` interface to type the `jwtPayload` prop, ensuring TypeScript compatibility.
  - Sets a default empty `jwtPayload` to prevent errors if the prop is undefined.
- **Styling**:
  - Uses Tailwind CSS classes matching your original component (`max-w-4xl`, `bg-white`, `p-8`, `rounded-xl`, `shadow-lg`, `prose`, `text-slate-600`).
  - Purchased exams section uses `text-green-600` (`#16a34a`) for prices, `text-blue-500` (`#3b82f6`) for the promotion, and `bg-cyan-600` (`#0891b2`) for the button, aligning with your WordPress login form and previous exam displays.
  - The shop button is constrained to `max-w-xs` to balance with the `prose` content width.
- **Functionality**:
  - Displays a list of purchased exams (e.g., “CPC Certification Exam - $199.00”) or “No exams purchased yet” if `paidExamIds` is empty.
  - Includes a promotional message and a shop button linking to `/#shop`.
- **Integration**:
  - Expects `jwtPayload` as a prop, containing `paidExamIds` (array of exam IDs) and `examPrices` (object mapping exam IDs to prices), as provided by your WordPress `annapoorna_exam_get_payload` function.
  - The `examNames` object matches your WordPress `$exam_names` for consistency.

### Integration Instructions
1. **Replace Instructions.tsx**:
   - Replace your existing `Instructions.tsx` file with the code above, located in your React app’s source directory (e.g., `src/components/Instructions.tsx`).

2. **Pass jwtPayload**:
   - Decode the JWT token from the URL (e.g., `#/auth?token=...`) in your app’s authentication logic:
     ```tsx
     import jwt from 'jsonwebtoken';
     const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
     const token = urlParams.get('token');
     const jwtPayload = jwt.decode(token); // No secret needed for decoding
     ```
   - Pass `jwtPayload` to the `Instructions` component:
     ```tsx
     <Instructions jwtPayload={jwtPayload} />
     ```
   - If using state management (e.g., Redux, Context), store `jwtPayload` and retrieve it in the parent component:
     ```tsx
     import { useSelector } from 'react-redux';
     const InstructionsPage = () => {
       const jwtPayload = useSelector(state => state.auth.jwtPayload);
       return <Instructions jwtPayload={jwtPayload} />;
     };
     ```

3. **Ensure Tailwind CSS**:
   - Verify Tailwind CSS is included in your app. For testing, add via CDN in your `index.html`:
     ```html
     <script src="https://cdn.tailwindcss.com"></script>
     ```
   - For production, configure Tailwind in your build setup (e.g., Vite, Create React App) per the Tailwind documentation.

4. **Add to Routing**:
   - Render the component in a route (e.g., `/instructions`) using your router (e.g., React Router):
     ```tsx
     import { BrowserRouter, Routes, Route } from 'react-router-dom';
     import Instructions from './components/Instructions';

     const App = () => {
       const jwtPayload = {/* Your decoded JWT payload */};
       return (
         <BrowserRouter>
           <Routes>
             <Route path="/instructions" element={<Instructions jwtPayload={jwtPayload} />} />
           </Routes>
         </BrowserRouter>
       );
     };
     ```

5. **Test the Component**:
   - Test with a sample `jwtPayload`:
     ```tsx
     const samplePayload = {
       paidExamIds: ['exam-cpc-cert', 'exam-cca-cert'],
       examPrices: { 'exam-cpc-cert': 199.00, 'exam-cca-cert': 149.00 }
     };
     <Instructions jwtPayload={samplePayload} />
     ```
   - Expected output:
     - All original instruction sections.
     - A “Your Purchased Exams” section listing exams (e.g., “CPC Certification Exam - $199.00”, “CCA Certification Exam - $149.00”).
     - If no exams, displays “No exams purchased yet.”
     - A promotional message: “Special Offer: 15% off additional exams this week!”
     - A cyan “Explore More Exams” button linking to `/#shop`.
   - Check the browser console (F12) for errors and verify `jwtPayload` is passed correctly.

### Debugging Tips
- **Previous Issue**: The incomplete code issue was likely due to missing TypeScript boilerplate (imports, interface, export). This artifact includes all necessary parts for a complete TSX file.
- **JWT Payload Errors**:
  - If `jwtPayload` is undefined or missing properties, log it to the console:
    ```tsx
    console.log('JWT Payload:', jwtPayload);
    ```
  - Ensure your WordPress `annapoorna_exam_get_payload` function is correctly populating `paidExamIds` and `examPrices`.
- **TypeScript Errors**:
  - If you get type errors, verify the `InstructionsProps` interface matches your `jwtPayload` structure. Adjust if your JWT includes additional fields:
    ```tsx
    interface InstructionsProps {
      jwtPayload?: {
        paidExamIds: string[];
        examPrices: { [key: string]: number };
        // Add other fields if needed, e.g., user: { id: string; name: string; }
      };
    }
    ```
- **Styling Issues**:
  - If the styling doesn’t match, ensure Tailwind CSS is loaded and the classes (`text-cyan-600`, etc.) are recognized.
  - Inspect the page with browser developer tools (F12) to check for overridden styles.
- **Console Errors**:
  - Check the browser console for runtime errors (e.g., undefined variables, syntax issues).
  - If errors persist, share the exact error message and stack trace.

### Expected Output
- The `/instructions` page will display:
  - All original sections: “Login and Access”, “Taking Exams”, “Results and Certificates”, “WordPress Integration for Admins”.
  - A new “Your Purchased Exams” section listing purchased exams (e.g., “CPC Certification Exam - $199.00”) or “No exams purchased yet.”
  - A promotional message and a cyan button linking to `/#shop`.
- Styling matches your WordPress `[exam_user_details]` shortcode (cyan `#0891b2`, green `#16a34a`, blue `#3b82f6`).

### Additional Notes
- **Shop Link**: Adjust `/#shop` to your app’s actual shop route if different (e.g., `/shop`).
- **Extensibility**: To add test results, fetch data from your WordPress REST API (`/exam-app/v1/submit-result`) and display:
  ```tsx
  <span className="text-slate-500">
    {examResult[examId] ? `Score: ${examResult[examId].score}` : 'Not taken'}
  </span>
 