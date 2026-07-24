require("dotenv").config({ override: true });

const { chromium } = require("playwright");

const login = require("./login");

(async () => {

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

        await login(page);

        console.log("Logged in successfully");

        await page.goto("https://techsup-erp.com/my/attendance", {
            waitUntil: "networkidle"
        });

        console.log("Current URL:", page.url());
        console.log("Page title:", await page.title());

        // Target action button specifically (.btn elements, ignoring table headers)
        const checkInBtn = page.locator('a.btn, button.btn, .btn').filter({ hasText: /check in/i }).first();
        const checkOutBtn = page.locator('a.btn, button.btn, .btn').filter({ hasText: /check out/i }).first();

        let isCheckInVisible = false;
        let isCheckOutVisible = false;

        try {
            await checkInBtn.waitFor({ state: "visible", timeout: 5000 });
            isCheckInVisible = true;
        } catch (e) {
            // Check In button not visible
        }

        if (!isCheckInVisible) {
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

            console.log("Waiting 2 minutes (120 seconds) before Check Out...");
            await page.waitForTimeout(120000);

            console.log("Refreshing page to Check Out...");
            await page.reload({ waitUntil: "networkidle" });

            const checkOutBtnAfter = page.locator('a.btn, button.btn, .btn').filter({ hasText: /check out/i }).first();
            try {
                await checkOutBtnAfter.waitFor({ state: "visible", timeout: 5000 });
                console.log("Checking Out...");
                await checkOutBtnAfter.click();
                await page.waitForLoadState("networkidle");
                console.log("Check Out completed successfully.");
            } catch (e) {
                console.log("Check Out button not found after 2 minutes.");
            }

        }

        else if (isCheckOutVisible) {

            console.log("Checking Out...");

            await checkOutBtn.click();

            await page.waitForLoadState("networkidle");

            console.log("Check Out completed successfully.");

        }

        else {

            console.log("No Check in or Check out button found.");

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