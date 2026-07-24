require("dotenv").config({ override: true });

const login = async (page) => {

    if (!process.env.USERNAME || !process.env.PASSWORD) {
        throw new Error("USERNAME or PASSWORD environment variables are missing.");
    }

    console.log("Navigating to login page...");
    await page.goto("https://techsup-erp.com/web/login", {
        waitUntil: "networkidle"
    });

    console.log("Filling username & password...");
    await page.locator('input[name="login"], input[type="email"]').first().fill(process.env.USERNAME);
    await page.locator('input[name="password"], input[type="password"]').first().fill(process.env.PASSWORD);

    console.log("Submitting login form...");
    const loginBtn = page.locator('button[type="submit"]:has-text("Log in"), .oe_login_form button[type="submit"], button:has-text("Log in")').first();

    if (await loginBtn.isVisible()) {
        await loginBtn.click();
    } else {
        await page.keyboard.press("Enter");
    }

    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle");

    console.log("URL after login submit:", page.url());

}

module.exports = login;