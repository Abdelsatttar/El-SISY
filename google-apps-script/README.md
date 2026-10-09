# El Sisy — Google Sheets + Email notifications

The website sends booking requests to the Apps Script Web App URL already configured in `app.js`. The script must be deployed and configured separately; editing `Code.gs` on GitHub does not automatically update a live Apps Script deployment.

The request handler is configured to use this exact spreadsheet:

`1m8Bl21ob2XnxknEyMcgOxkwN10kqn3Odo_2RFz2xZX8`

Requests are written into the tab **طلبات العملاء** in that spreadsheet, and email notifications are sent to **ahmedkartamo@gmail.com**.

## Required setup

1. Open the Google Apps Script project that owns the Web App URL currently used by the site. The current URL in `app.js` is:
   `https://script.google.com/macros/s/AKfycbwg6ad-R5W3eqY0fi4nLHlDSlD_5gQNjwVE_cCuGyAywIN5x42rpHqkbiK9p_GeUni7/exec`
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

The website verifies the result returned by the Vercel API. Google Apps Script ContentService can occasionally return an HTML error page after redirecting, even when the script may already have run. The Vercel API retries up to three times using the same request ID; Apps Script deduplicates that ID so it should not append a second row or resend the email for an already-recorded request. If Google still fails to return valid JSON, the site shows a warning and retains the same request ID for retries with unchanged form details.

## Troubleshooting

- **No row appears:** most often, the live Apps Script deployment was not updated to the current `Code.gs`, the site is still using a different deployment URL, or the Google account running the script cannot edit the provided spreadsheet.
- **Row appears but no email:** check the final status column, authorize email sending by running `setupElSisy` and accepting all permission prompts, and check Gmail Spam/quotas.
- **Permission error:** the Google account that runs the web app must have Editor access to the spreadsheet and must authorize the Apps Script.
- Do not make the spreadsheet public. Only share it with the people who manage requests.


## Vercel form API (important)

The website now posts the form to `/api/submit` on the same Vercel deployment. This avoids relying on a cross-origin `postMessage` callback from a hidden Google iframe, which can cause the form to wait until timeout even when the script ran.

Files involved:
- `api/submit.js`: Vercel serverless function that forwards the request to the Apps Script Web App and reads its JSON or embedded HTML result.
- `app.js`: sends the form to `/api/submit`.
- `google-apps-script/Code.gs`: returns an HTML response with a machine-readable result to avoid the ContentService redirect.

After pulling the latest `main` into the Vercel project, wait for the deployment to complete. Then update the Apps Script project with the latest `Code.gs` and deploy it as a **new version**. Test the live Vercel URL, not only localhost.

If the website is still hosted only on GitHub Pages, `/api/submit` will not exist there; this serverless API requires the site to be deployed on Vercel (or another host configured to run compatible serverless functions).
