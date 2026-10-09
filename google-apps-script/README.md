# El Sisy — Google Sheets + Email notifications

The website sends booking requests to the Apps Script Web App URL already configured in `app.js`. The script must be deployed and configured separately; editing `Code.gs` on GitHub does not automatically update a live Apps Script deployment.

The request handler is configured to use this exact spreadsheet:

`1m8Bl21ob2XnxknEyMcgOxkwN10kqn3Odo_2RFz2xZX8`

Requests are written into the tab **طلبات العملاء** in that spreadsheet, and email notifications are sent to **ahmedkartamo@gmail.com**.

## Required setup

1. Open the Google Apps Script project that owns the Web App URL currently used by the site. The current URL configured in `api/submit.js` is:
   `https://script.google.com/macros/s/AKfycbys1vEgsmxOqgQZ6iBzxEZYcUl0zgB9Rrg1k5Bxe2aMeDAFGx6h4lSTzdzBnTJM-raV/exec`
2. Replace the project's `Code.gs` with the version in this repository: [google-apps-script/Code.gs](./Code.gs).
3. In the function selector, choose `setupElSisy` and click **Run**. Authorize access to Google Sheets and email. This function uses the spreadsheet ID above; it does **not** create a different spreadsheet. It creates or prepares the `طلبات العملاء` tab and adds the expected column headers.
4. Open **Deploy → Manage deployments**. Edit the Web App deployment used by the website, choose **New version**, and deploy it.
5. Confirm the deployment settings:
   - **Execute as:** Me
   - **Who has access:** Anyone
6. Keep the Web App's deployed `/exec` URL the same as the one configured in `app.js`. If you created a new Apps Script project or a new deployment with a different URL, replace `SCRIPT_URL` in `api/submit.js` with that new `/exec` URL and publish the website.

## Test the complete flow

1. Open the published site and send a test request with sample details.
2. Confirm a new row appears in **طلبات العملاء** in the spreadsheet linked above.
3. Confirm a notification email arrives at **ahmedkartamo@gmail.com** (also check Spam).
4. Check the final column, **حالة إشعار البريد**, to see whether the email notification was sent.

The website verifies the result returned by the Vercel API. A request to the old deployment redirected to `accounts.google.com`, indicating that the live endpoint was not accessible anonymously. The API is now configured to use the latest URL supplied by the site owner. The Vercel API retries up to three times using the same request ID; Apps Script deduplicates that ID so it should not append a second row or resend the email for an already-recorded request. If Google still fails to return valid JSON, the site shows a warning and retains the same request ID for retries with unchanged form details.

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


## Safe live diagnostic

After the latest Vercel deployment is ready, open:

`https://el-sisy-eg.vercel.app/api/submit`

A successful response should be JSON with `"ok": true` and `"appsScript": "reachable"`. This GET check only verifies that the API can reach the Apps Script web app; it does not submit a customer request or send an email. A `502` means the active Apps Script deployment is not returning the expected health page, so verify the deployment URL and access setting before testing the form again.


## Public access is required

The most recent connectivity check redirected to `accounts.google.com` with HTTP 200. That is a Google sign-in page, not a successful health response. In Apps Script, open **Deploy → Manage deployments → Edit** for the deployment whose URL is configured in `api/submit.js`. Set **Execute as: Me** and **Who has access: Anyone**, choose **New version**, and deploy. Then copy the deployment's `/exec` URL and make sure it matches `SCRIPT_URL` in `api/submit.js`. Do not share the spreadsheet publicly; only the web app needs public access.
