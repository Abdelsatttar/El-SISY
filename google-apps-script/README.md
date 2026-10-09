# El Sisy — Google Sheets + Email notifications

The website sends booking requests to the Apps Script Web App URL already configured in `app.js`. The script must be deployed and configured separately; editing `Code.gs` on GitHub does not automatically update a live Apps Script deployment.

The request handler is configured to use this exact spreadsheet:

`1m8Bl21ob2XnxknEyMcgOxkwN10kqn3Odo_2RFz2xZX8`

Requests are written into the tab **طلبات العملاء** in that spreadsheet, and email notifications are sent to **ahmedkartamo@gmail.com**.

## Required setup

1. Open the Google Apps Script project that owns the Web App URL currently used by the site. The current URL in `app.js` is:
   `https://script.google.com/macros/s/AKfycbyWSrDBZVp06uhp37oW8uI6QCl-0yN4F1TrFQ-XPsOmwsMi1nMpK_cycAy4hCQsUTOw_w/exec`
2. Replace the project's `Code.gs` with the version in this repository: [google-apps-script/Code.gs](./Code.gs).
3. In the function selector, choose `setupElSisy` and click **Run**. Authorize access to Google Sheets and email. This function uses the spreadsheet ID above; it does **not** create a different spreadsheet. It creates or prepares the `طلبات العملاء` tab and adds the expected column headers.
4. Open **Deploy → Manage deployments**. Edit the Web App deployment used by the website, choose **New version**, and deploy it.
5. Confirm the deployment settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Keep the Web App's deployed `/exec` URL the same as the one configured in `app.js`. If you created a new Apps Script project or a new deployment with a different URL, replace `APPS_SCRIPT_URL` in `app.js` with that new `/exec` URL and publish the website.

## Test the complete flow

1. Open the published site and send a test request with sample details.
2. Confirm a new row appears in **طلبات العملاء** in the spreadsheet linked above.
3. Confirm a notification email arrives at **ahmedkartamo@gmail.com** (also check Spam).
4. Check the final column, **حالة إشعار البريد**, to see whether the email notification was sent.

The website now waits for a response correlated with the exact request ID. It should not display the normal success message merely because a network request was started. If it cannot verify the Apps Script response, it displays a timeout warning.

## Troubleshooting

- **No row appears:** most often, the live Apps Script deployment was not updated to the current `Code.gs`, the site is still using a different deployment URL, or the Google account running the script cannot edit the provided spreadsheet.
- **Row appears but no email:** check the final status column, authorize email sending by running `setupElSisy` and accepting all permission prompts, and check Gmail Spam/quotas.
- **Permission error:** the Google account that runs the web app must have Editor access to the spreadsheet and must authorize the Apps Script.
- Do not make the spreadsheet public. Only share it with the people who manage requests.
