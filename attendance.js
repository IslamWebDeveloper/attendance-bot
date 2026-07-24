require("dotenv").config();

const { chromium } = require("playwright");

const login = require("./login");

(async () => {

    console.log("Launching browser...");

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    try {

        await login(page);

        console.log("Logged in");

        await page.goto(
            "https://techsup-erp.com/my/attendance",
            {
                waitUntil: "networkidle"
            }
        );

        // Check In
        if (await page.locator('text=Check in').count()) {

            console.log("Checking In");

            await page.locator('text=Check in').click();

            await page.waitForLoadState("networkidle");

            console.log("Done");

        }

        // Check Out
        else if (await page.locator('text=Check out').count()) {

            console.log("Checking Out");

            await page.locator('text=Check out').click();

            await page.waitForLoadState("networkidle");

            console.log("Done");

        }

        else {

            console.log("No button found.");

        }

    }
    catch(err){

        console.log(err);

        await page.screenshot({
            path:"error.png",
            fullPage:true
        });

    }

    await browser.close();

})();