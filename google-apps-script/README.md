# El Sisy — Email-only project enquiries

The website form sends each project enquiry by email to **elsisycontracting@gmail.com**. It does not write submissions to Google Sheets or a database.

The form includes the customer's full name, phone number, email address, address, requested service and project details. The customer's address is set as the reply-to email so the company can reply to the customer directly.

## One-time Google Apps Script setup

The website's Vercel API currently calls the Apps Script Web App URL configured in `api/submit.js`. Updating this source file in GitHub does **not** automatically update the deployed Apps Script.

1. Open [Google Apps Script](https://script.google.com/home).
2. Open the project that owns the Web App URL currently used by the site. If starting a new project, create one named **El Sisy Email Requests**.
3. Replace the project's `Code.gs` with the code in this repository: [Code.gs](./Code.gs).
4. In the function selector, choose `authorizeEmailService` and click **Run**. Approve the email permission. This function sends one clearly-labelled setup-test email to **elsisycontracting@gmail.com**.
5. Go to **Deploy → Manage deployments**, edit the Web App deployment used by the website, choose **New version**, and deploy.
6. Confirm the Web App settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Keep its deployed `/exec` URL matching the `SCRIPT_URL` configured in `api/submit.js`. If you create a new Apps Script project with a different URL, replace the fallback URL or configure the Vercel environment variable `APPS_SCRIPT_URL` to the new `/exec` URL.

## Verify the full flow

1. Open the deployed website and submit a test enquiry.
2. Confirm an email arrives at **elsisycontracting@gmail.com** with all form fields, including the project details.
3. Reply to the received email to make sure the customer's email is set as Reply-To.
4. Confirm the website shows the success notification only after the email service returns a successful response.

## Notes

- No sheet or permanent request database is used by the new script. The script cache stores only short-lived request IDs to reduce duplicate emails when the Vercel API retries.
- Existing Google Sheets created by previous versions are left untouched; the website no longer writes to them after the email-only Apps Script version is deployed.
- If sending fails, the website shows an error notification instead of claiming the request was delivered.
