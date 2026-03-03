# Deployment Verification Checklist

## Build + Deploy Steps

Run these commands from the project root directory:

1. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   ```
   - **If this fails:** Provide the complete terminal output including all error messages and stack traces (no truncation)

2. **Deploy to network:**
   ```bash
   dfx deploy
   ```
   - **If this fails:** Provide the complete terminal output including all error messages (no truncation)

3. **Verify deployment URL loads**
   - Open the deployed URL in your browser
   - **If the app shows "Application Failed to Load":** Click "Copy Diagnostics" and provide the full report
   - **If the app shows "Connection Timeout" or "Connection Failed":** Click "Retry Connection" and note if it succeeds or fails again

## Critical Test: Inventory Add Item Flow

This test verifies the core mutation flow and actor initialization.

### Steps:
1. Navigate to the deployed URL
2. Wait for the app to finish connecting (should take seconds, not minutes)
3. Sign in using Internet Identity (if not already signed in)
4. Click on "Inventory" in the sidebar
5. Click "Add Item" button
6. Fill in the form:
   - Item Name: Test Item
   - Total Quantity: 10
   - Daily Rate: 100
7. Click "Add" button

### Expected Result:
- ✅ The app should connect to backend within 30 seconds
- ✅ No "Connection Timeout" or "Connection Failed" error should appear
- ✅ The form should submit successfully
- ✅ No "Actor not initialized" error should appear
- ✅ A success toast should appear saying "Item added successfully"
- ✅ The new item should appear in the inventory list
- ✅ The dialog should close automatically

### If the test fails:
1. **Note the exact step number where failure occurred** (1-7 above)
2. **Copy the exact UI error message** (if any appears in the dialog or as a toast)
3. **Open Build Info in the footer:**
   - Click "Build Info" button in the footer
   - Check Backend Actor status (should be "Ready")
   - If status is "Timeout" or "Error", click "Retry Backend Connection"
   - Click "View Diagnostics" button
   - Click "Copy to Clipboard" button
   - Paste the full diagnostics report
4. **Open browser DevTools Console (F12 → Console tab):**
   - Copy all error messages (red text)
   - Copy all warning messages (yellow text)
   - Include the full stack traces
5. **Check Network tab (F12 → Network tab):**
   - Look for failed requests (red status codes)
   - Copy the request URL and response for any failures

## In-App Diagnostics

The app includes built-in diagnostics accessible from the footer:

### Build Info Panel
Click "Build Info" in the footer to see:
- **Build Metadata:** Environment, Build Time, Commit Hash, Backend Canister ID
- **Runtime Status:**
  - Backend Actor: Ready / Initializing / Timeout / Error / Not available
  - Authentication: Authenticated / Logging in / Anonymous
  - Runtime Errors Captured: N
- **Quick Actions:**
  - Go to Inventory (navigate to critical test page)
  - View Diagnostics (open full diagnostics report)
  - Retry Backend Connection (if connection failed/timed out)
- **Build/Deploy Checklist:** Commands and verification steps
- **Post-Deploy Verification:** Step-by-step verification guide

### Connection Error Handling
If backend connection fails or times out:
- A red alert will appear at the top of Build Info panel
- Shows the specific error message (timeout vs connection failure)
- Provides "Retry Connection" button (up to 3 retries with exponential backoff)
- After max retries, suggests reloading the page

### Diagnostics Report
From Build Info, click "View Diagnostics" to see:
- All captured runtime errors with:
  - Timestamp
  - Route/path where error occurred
  - Actor status at time of error
  - Auth status at time of error
  - Full error message and stack trace
- Actor initialization lifecycle events:
  - Actor init start
  - Actor timeout events
  - Actor retry attempts
  - Actor failure events
- Click "Copy to Clipboard" to get a formatted report for support
- Click "Clear Log" to reset the diagnostics buffer

### When to Use Diagnostics
- After any deployment to verify no runtime errors
- When the app fails to load (error boundary shows "Copy Diagnostics" button)
- When backend connection takes longer than expected (>30 seconds)
- When a feature doesn't work as expected
- Before reporting an issue

## Additional Verification Tests

### Test 2: Challan Creation
1. Navigate to "Challans"
2. Click "Create Challan"
3. Fill in required fields and add at least one item
4. Submit the form
5. **Expected:** Challan created successfully, no errors
6. **If fails:** Follow the failure reporting steps above (step number, error message, diagnostics report, console logs)

### Test 3: Payment Creation
1. Navigate to "Payments"
2. Click "Add Payment"
3. Fill in required fields
4. Submit the form
5. **Expected:** Payment created successfully, no errors
6. **If fails:** Follow the failure reporting steps above

### Test 4: Petty Cash PDF Download
1. Navigate to "Petty Cash"
2. If no records exist, add one using "Add Record"
3. Click the Download icon (📥) at the right end of the Closing Balance column
4. **Expected:** PDF downloads successfully and opens print dialog
5. **If fails:** Follow the failure reporting steps above

## Reporting Failures

When reporting any test failure, always provide:

1. **Exact step number** where failure occurred (e.g., "Step 5: Click Add button")
2. **Full UI error message** (copy the exact text from the red error box or toast)
3. **Backend Actor status** from Build Info (Ready/Initializing/Timeout/Error)
4. **Diagnostics report:**
   - Footer → Build Info → View Diagnostics → Copy to Clipboard
   - Paste the complete report
5. **Browser console logs:**
   - Open DevTools (F12)
   - Console tab: Copy all errors (red) and warnings (yellow) with full stack traces
6. **Network failures** (if any):
   - Network tab: Find failed requests (red status codes)
   - Copy request URL, status code, and response body
7. **Screenshot** of the error state (optional but helpful)

## Success Criteria

Deployment is successful when:
- ✅ `npm run build` completes without errors
- ✅ `dfx deploy` completes without errors
- ✅ Deployed URL loads without showing error boundary
- ✅ Backend connection completes within 30 seconds
- ✅ Build Info shows "Backend Actor: Ready"
- ✅ Build Info shows "Runtime Errors Captured: 0"
- ✅ Inventory → Add Item flow completes successfully
- ✅ New item appears in inventory list
- ✅ Petty Cash → Download PDF icon works for each record
