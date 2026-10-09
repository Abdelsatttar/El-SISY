# El Sisy — Google Sheets + Email notifications

The website is a static GitHub Pages site. This Apps Script receives the form request, saves it to a Google Sheet, and emails **ahmedkartamo@gmail.com**.

## One-time setup

1. Sign in to the Google account that should own the sheet and send notifications.
2. Open [Google Apps Script](https://script.google.com/home) and create a project named **El Sisy Requests**.
3. Replace the default contents of `Code.gs` with the code in this folder's `Code.gs`.
4. In the function selector, choose `setupElSisy`, then click **Run**.
5. Approve the requested Google Sheets and email permissions. Open **Execution log** to find the created spreadsheet URL. The sheet is named **El Sisy - Website Requests**, with a tab named **طلبات العملاء**.
6. Click **Deploy → New deployment → Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
7. Click **Deploy**, approve any additional permissions, then copy the URL that ends in `/exec`.

## Connect the website

The current website code has a `APPS_SCRIPT_URL` constant in `app.js`.

- If you can edit the Apps Script deployment currently used by the site, paste this `Code.gs` into that project and update its existing deployment to a new version. This preserves the current URL used by the website.
- If you created a new Apps Script project, replace the current `APPS_SCRIPT_URL` value in `app.js` with the new `/exec` URL from step 7, then commit the change to `main`.

The website submits the form through a hidden iframe to avoid browser cross-origin restrictions. This script returns a correlated status message to the page, so the form does not show success simply because a network request was started.

## Test it

1. Submit a test request on the published website using your own test details.
2. Confirm that a row is added to **طلبات العملاء**.
3. Confirm that an email arrives at **ahmedkartamo@gmail.com**. Check Spam if needed.
4. The last column in the sheet records whether the email notification was sent.

## Important notes

- Requests are saved even if email delivery fails; the website displays a different message and the sheet records the email status.
- The Apps Script runs under the Google account that deployed it. That account must authorize spreadsheet access and email sending.
- The web app must be accessible to **Anyone**, because website visitors are not signed into your Google account.
- Do not share the spreadsheet publicly; only share it with the people who need to manage incoming requests.
- Apps Script and Google Mail quotas/Google account restrictions may affect how many notifications can be sent per day.
