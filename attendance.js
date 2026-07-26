require("dotenv").config({ override: true });

const { chromium } = require("playwright");

const login = require("./login");

const getCairoDateTime = () => {
    const options = { timeZone: "Africa/Cairo", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", hour12: false };
    const formatter = new Intl.DateTimeFormat("en-US", options);
    const parts = formatter.formatToParts(new Date());
    const dt = {};
    for (const part of parts) {
        dt[part.type] = part.value;
    }
    const weekdayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "long" });
    const dayName = weekdayFormatter.format(new Date());
    return {
        year: parseInt(dt.year),
        month: parseInt(dt.month),
        day: parseInt(dt.day),
        hour: parseInt(dt.hour),
        minute: parseInt(dt.minute),
        second: parseInt(dt.second),
        dayName: dayName
    };
};

(async () => {

    const { hour, dayName } = getCairoDateTime();
    const allowedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const isBypass = process.env.BYPASS_TIME_CHECK === "true";

    console.log(`Current Cairo time: Day = ${dayName}, Hour = ${hour}`);

    if (!isBypass) {
        if (!allowedDays.includes(dayName)) {
            console.log(`Today is ${dayName}. Attendance bot only runs Sunday to Thursday. Exiting.`);
            process.exit(0);
        }

        if (hour !== 9 && hour !== 17) {
            console.log(`Current Cairo hour is ${hour}. Attendance bot only checks in at 9 AM and checks out at 5 PM Cairo. Exiting.`);
            process.exit(0);
        }
    }

    let targetAction = "any";
    if (!isBypass) {
        targetAction = hour === 9 ? "checkin" : "checkout";
    }

    console.log(`Target action: ${targetAction}`);

    let browser;
    let page;

    try {

        console.log("Launching browser...");

        browser = await chromium.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
            timezoneId: "Africa/Cairo"
        });

        page = await context.newPage();

        // Handle confirmation dialogs automatically
        page.on('dialog', async dialog => {
            console.log(`Dialog popup: [${dialog.type()}] "${dialog.message()}"`);
            console.log("Accepting dialog...");
            await dialog.accept();
        });

        await login(page);

        console.log("Logged in successfully");

        await page.goto("https://techsup-erp.com/my/attendance", {
            waitUntil: "networkidle"
        });

        console.log("Current URL:", page.url());
        console.log("Page title:", await page.title());

        // Target action button specifically (.btn elements under balance card, ignoring table headers)
        const checkInBtn = page.locator('.tso_balance_card button, .tso_balance_card a, .tso_balance_card .btn').filter({ hasText: /check in/i }).first();
        const checkOutBtn = page.locator('.tso_balance_card button, .tso_balance_card a, .tso_balance_card .btn').filter({ hasText: /check out/i }).first();

        let isCheckInVisible = false;
        let isCheckOutVisible = false;

        if (targetAction === "any" || targetAction === "checkin") {
            try {
                await checkInBtn.waitFor({ state: "visible", timeout: 5000 });
                isCheckInVisible = true;
            } catch (e) {
                // Check In button not visible
            }
        }

        if (!isCheckInVisible && (targetAction === "any" || targetAction === "checkout")) {
            try {
                await checkOutBtn.waitFor({ state: "visible", timeout: 5000 });
                isCheckOutVisible = true;
            } catch (e) {
                // Check Out button not visible
            }
        }

        if (isCheckInVisible) {

            console.log("Checking In...");

            await checkInBtn.click();

            await page.waitForLoadState("networkidle");

            console.log("Check In completed successfully.");

        }

        else if (isCheckOutVisible) {

            console.log("Checking Out...");

            await checkOutBtn.click();

            await page.waitForLoadState("networkidle");

            console.log("Check Out completed successfully.");

        }

        else {

            console.log("No matching Check in or Check out button found for this window.");

        }

    }
    catch(err){

        console.error("Error during execution:", err);

        if (page) {
            try {
                await page.screenshot({
                    path: "error.png",
                    fullPage: true
                });
            } catch (sErr) {
                console.error("Failed to save screenshot:", sErr);
            }
        }

        process.exitCode = 1;

    }
    finally {

        if (browser) {
            await browser.close().catch(() => {});
        }

    }

})();