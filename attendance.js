require("dotenv").config();

const { chromium } = require("playwright");

const login = require("./login");

(async () => {

    console.log("Launching browser...");

    const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        timezoneId: "Africa/Cairo"
    });

    const page = await context.newPage();

    try {

        await login(page);

        console.log("Logged in successfully");

        await page.goto(
            "https://techsup-erp.com/my/attendance",
            {
                waitUntil: "networkidle"
            }
        );

        // Check In button locator
        const checkInBtn = page.locator('text=/check in/i').first();
        // Check Out button locator
        const checkOutBtn = page.locator('text=/check out/i').first();

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

        await page.screenshot({
            path: "error.png",
            fullPage: true
        });

        process.exitCode = 1;

    }
    finally {

        await browser.close();

    }

})();