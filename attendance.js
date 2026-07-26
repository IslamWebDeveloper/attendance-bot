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

    const { hour, minute, dayName } = getCairoDateTime();
    const allowedDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
    const isBypass = process.env.BYPASS_TIME_CHECK === "true";

    console.log(`Current Cairo time: Day = ${dayName}, Hour = ${hour}, Minute = ${minute}`);

    // if (!isBypass) {
    //     if (!allowedDays.includes(dayName)) {
    //         console.log(`Today is ${dayName}. Attendance bot only runs Sunday to Thursday. Exiting.`);
    //         process.exit(0);
    //     }

    //     if (hour !== 9 && hour !== 17) {
    //         console.log(`Current Cairo hour is ${hour}. Attendance bot only checks in at 9 AM and checks out at 5 PM Cairo. Exiting.`);
    //         process.exit(0);
    //     }
    // }

    let targetAction = "any";
    if (!isBypass) {
        const isAllowedDay = allowedDays.includes(dayName);
        const isAllowedHour = hour === 19;
        const isCheckInTime = hour === 19 && minute === 5;
        const isCheckOutTime = hour === 19 && minute === 10;

        // if (!isAllowedDay) {
        //     console.log(`Today is ${dayName}. Attendance bot only runs Sunday to Thursday. Exiting.`);
        //     process.exit(0);
        // }

        // if (!isAllowedHour) {
        //     console.log(`Current Cairo hour is ${hour}. Attendance bot only runs at 7:05 PM and 7:10 PM Cairo. Exiting.`);
        //     process.exit(0);
        // }

        // if (!isCheckInTime && !isCheckOutTime) {
        //     console.log(`Current Cairo time is ${hour}:${minute}. Attendance bot only runs at 7:05 PM and 7:10 PM Cairo. Exiting.`);
        //     process.exit(0);
        // }

        targetAction = isCheckInTime ? "checkin" : "checkout";
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

        // Target the real attendance forms directly and use whichever action is actually present.
        const checkInBtn = page.locator('form[action*="/my/attendance/checkin"] button, form[action*="/my/attendance/checkin"] a, form[action*="/my/attendance/checkin"] .btn').first();
        const checkOutBtn = page.locator('form[action*="/my/attendance/checkout"] button, form[action*="/my/attendance/checkout"] a, form[action*="/my/attendance/checkout"] .btn').first();
        const statusText = await page.locator('.tso_balance_card .tso_remaining').textContent().catch(() => "");

        let actionButton = null;
        let actionLabel = "";

        const preferredActions = [];
        const normalizedStatus = (statusText || "").toLowerCase();

        if (normalizedStatus.includes("checked in") || normalizedStatus.includes("open")) {
            preferredActions.push({ locator: checkOutBtn, label: "Check Out" });
        } else {
            preferredActions.push({ locator: checkInBtn, label: "Check In" });
        }

        if (targetAction === "any" || targetAction === "checkin") {
            preferredActions.unshift({ locator: checkInBtn, label: "Check In" });
        }
        if (targetAction === "any" || targetAction === "checkout") {
            preferredActions.push({ locator: checkOutBtn, label: "Check Out" });
        }

        for (const candidate of preferredActions) {
            try {
                await candidate.locator.waitFor({ state: "visible", timeout: 3000 });
                actionButton = candidate.locator;
                actionLabel = candidate.label;
                break;
            } catch (e) {
                // Candidate action not visible
            }
        }

        if (!actionButton) {
            const fallbackActions = [
                { locator: checkInBtn, label: "Check In" },
                { locator: checkOutBtn, label: "Check Out" }
            ];

            for (const candidate of fallbackActions) {
                try {
                    await candidate.locator.waitFor({ state: "visible", timeout: 3000 });
                    actionButton = candidate.locator;
                    actionLabel = candidate.label;
                    break;
                } catch (e) {
                    // Fallback action not visible
                }
            }
        }

        if (actionButton) {

            console.log(`${actionLabel}...`);

            await actionButton.click();

            await page.waitForLoadState("networkidle");

            console.log(`${actionLabel} completed successfully.`);

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
